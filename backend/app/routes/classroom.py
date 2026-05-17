from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.auth.oauth import get_current_user, create_classroom_flow, CLASSROOM_SCOPES
from app.services.classroom_service import sync_classroom_assignments
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow
import os

router = APIRouter(prefix="/classroom", tags=["Google Classroom"])

code_verifiers = {}

class CallbackRequest(BaseModel):
    code: str
    state: str

@router.get("/connect")
def connect_classroom(current_user: User = Depends(get_current_user)):
    from dotenv import load_dotenv
    load_dotenv(override=True)

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=CLASSROOM_SCOPES,
        redirect_uri=redirect_uri
    )

    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent"
    )

    if flow.code_verifier:
        code_verifiers[state] = flow.code_verifier

    print("AUTH URL:", auth_url[:100])
    return {"auth_url": auth_url, "state": state}

@router.post("/callback")
def classroom_callback(
    request: CallbackRequest,
    db: Session = Depends(get_db)
):
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

        print("Callback received with code:", request.code[:20])

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri],
                }
            },
            scopes=CLASSROOM_SCOPES,
            redirect_uri=redirect_uri,
            state=request.state
        )

        code_verifier = code_verifiers.pop(request.state, None)
        if code_verifier:
            flow.code_verifier = code_verifier

        flow.fetch_token(code=request.code)
        credentials = flow.credentials
        print("Token obtained:", credentials.token[:20] if credentials.token else "NONE")

        import googleapiclient.discovery
        user_info_service = googleapiclient.discovery.build(
            "oauth2", "v2",
            credentials=credentials
        )
        user_info = user_info_service.userinfo().get().execute()
        email = user_info.get("email")
        print("User email:", email)

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        user.google_token = credentials.token
        user.google_refresh_token = credentials.refresh_token
        db.commit()
        print("Token saved successfully")

        return {"message": "Google Classroom connected successfully", "email": email}

    except Exception as e:
        print("Callback error:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

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
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
    }

    result = sync_classroom_assignments(token_data, current_user.id, db)
    return result

@router.get("/status")
def classroom_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"connected": bool(current_user.google_token)}