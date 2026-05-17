from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.auth.oauth import create_access_token, get_current_user
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter(prefix="/auth", tags=["Authentication"])

class GoogleTokenRequest(BaseModel):
    access_token: str

class SyncUserRequest(BaseModel):
    clerk_id: str
    email: str
    name: str
    picture: Optional[str] = None

@router.post("/google")
async def google_auth(request: GoogleTokenRequest, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {request.access_token}"}
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    google_data = response.json()
    user = db.query(User).filter(User.google_id == google_data["id"]).first()

    if not user:
        user = db.query(User).filter(User.email == google_data["email"]).first()

    if not user:
        user = User(
            email=google_data["email"],
            name=google_data["name"],
            picture=google_data.get("picture"),
            google_id=google_data["id"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

@router.post("/sync")
def sync_user(request: SyncUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        user = User(
            email=request.email,
            name=request.name,
            picture=request.picture,
            google_id=request.clerk_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = request.name
        user.picture = request.picture
        db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "access_token": access_token
    }