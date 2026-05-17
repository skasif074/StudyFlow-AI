from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.chat import ChatMessage
from app.models.user import User
from app.auth.oauth import get_current_user
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/chat", tags=["Chat"])

class MessageCreate(BaseModel):
    role: str
    content: str
    session_id: str

@router.get("/history/{session_id}")
def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.session_id == session_id,
        ChatMessage.expires_at > now
    ).order_by(ChatMessage.created_at.asc()).all()

    return messages

@router.get("/sessions")
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.expires_at > now,
        ChatMessage.role == "user"
    ).order_by(ChatMessage.created_at.desc()).all()

    sessions = {}
    for msg in messages:
        if msg.session_id not in sessions:
            sessions[msg.session_id] = {
                "session_id": msg.session_id,
                "first_message": msg.content[:50] + "..." if len(msg.content) > 50 else msg.content,
                "created_at": msg.created_at,
                "expires_at": msg.expires_at
            }

    return list(sessions.values())

@router.post("/message")
def save_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expires_at = datetime.utcnow() + timedelta(days=3)
    new_message = ChatMessage(
        user_id=current_user.id,
        role=message.role,
        content=message.content,
        session_id=message.session_id,
        expires_at=expires_at
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message

@router.delete("/session/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.session_id == session_id
    ).delete()
    db.commit()
    return {"message": "Session deleted"}

@router.delete("/cleanup")
def cleanup_expired(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    db.query(ChatMessage).filter(
        ChatMessage.expires_at < now
    ).delete()
    db.commit()
    return {"message": "Expired messages cleaned up"}