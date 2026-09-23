
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow
import googleapiclient.discovery
import os

from app.database.session import get_db
from app.models.user import User
from app.auth.oauth import (
    get_current_user,
    CLASSROOM_SCOPES
)
from app.services.classroom_service import sync_classroom_assignments


router = APIRouter(
    prefix="/classroom",
    tags=["Google Classroom"]
)


# Store PKCE code verifiers temporarily
code_verifiers = {}


class CallbackRequest(BaseModel):
    code: str
    state: str


def create_google_flow(state=None):
    """
    Create Google OAuth flow using environment variables.
    """

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID is not configured"
        )

    if not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_SECRET is not configured"
        )

    if not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_REDIRECT_URI is not configured"
        )

    print("====================================")
    print("Google OAuth Configuration")
    print("CLIENT ID:", client_id)
    print("REDIRECT URI:", redirect_uri)
    print("====================================")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=CLASSROOM_SCOPES,
        redirect_uri=redirect_uri,
        state=state
    )

    return flow


# ============================================================
# CONNECT GOOGLE CLASSROOM
# ============================================================

@router.get("/connect")
def connect_classroom(
    current_user: User = Depends(get_current_user)
):
    try:

        flow = create_google_flow()

        auth_url, state = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            include_granted_scopes="true"
        )

        # Save PKCE verifier
        if flow.code_verifier:
            code_verifiers[state] = flow.code_verifier

        print("====================================")
        print("Google Classroom OAuth")
        print("STATE:", state)
        print("REDIRECT URI:", os.getenv("GOOGLE_REDIRECT_URI"))
        print("AUTH URL:")
        print(auth_url)
        print("====================================")

        return {
            "auth_url": auth_url,
            "state": state
        }

    except Exception as e:

        print("OAuth connect error:", str(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GOOGLE OAUTH CALLBACK
# ============================================================

@router.post("/callback")
def classroom_callback(
    request: CallbackRequest,
    db: Session = Depends(get_db)
):

    try:

        print("====================================")
        print("Google Classroom callback received")
        print("STATE:", request.state)
        print("CODE RECEIVED:", bool(request.code))
        print("====================================")

        flow = create_google_flow(
            state=request.state
        )

        # Restore PKCE verifier
        code_verifier = code_verifiers.pop(
            request.state,
            None
        )

        if code_verifier:
            flow.code_verifier = code_verifier

        # Exchange authorization code for tokens
        flow.fetch_token(
            code=request.code
        )

        credentials = flow.credentials

        if not credentials.token:
            raise HTTPException(
                status_code=400,
                detail="Google did not return an access token"
            )

        print("Google access token received")

        # ====================================================
        # GET GOOGLE USER INFORMATION
        # ====================================================

        user_info_service = googleapiclient.discovery.build(
            "oauth2",
            "v2",
            credentials=credentials
        )

        user_info = (
            user_info_service
            .userinfo()
            .get()
            .execute()
        )

        email = user_info.get("email")

        if not email:
            raise HTTPException(
                status_code=400,
                detail="Could not retrieve Google account email"
            )

        print("Google account:", email)

        # ====================================================
        # FIND STUDYFLOW USER
        # ====================================================

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"No StudyFlow account found for {email}"
            )

        # ====================================================
        # SAVE GOOGLE TOKENS
        # ====================================================

        user.google_token = credentials.token

        if credentials.refresh_token:
            user.google_refresh_token = credentials.refresh_token

        db.commit()
        db.refresh(user)

        print("Google Classroom connected successfully")

        return {
            "message": "Google Classroom connected successfully",
            "email": email
        }

    except HTTPException:
        raise

    except Exception as e:

        print("====================================")
        print("Google OAuth callback error")
        print(str(e))
        print("====================================")

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# SYNC CLASSROOM
# ============================================================

@router.get("/sync")
def sync_classroom(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if not current_user.google_token:

        raise HTTPException(
            status_code=400,
            detail="Google Classroom not connected. Please connect first."
        )

    token_data = {
        "access_token": current_user.google_token,
        "refresh_token": current_user.google_refresh_token,
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET")
    }

    result = sync_classroom_assignments(
        token_data,
        current_user.id,
        db
    )

    return result


# ============================================================
# CLASSROOM CONNECTION STATUS
# ============================================================

@router.get("/status")
def classroom_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return {
        "connected": bool(current_user.google_token)
    }
