from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.notifications import Notification, NotificationType, NotificationStatus
from app.models.user import User
from app.auth.oauth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: NotificationType

@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.get("/unread")
def get_unread_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.post("/")
def create_notification(
    notification: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_notification = Notification(
        user_id=current_user.id,
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type,
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return new_notification

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True
    notification.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return {"message": "Notification marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted successfully"}

from app.notifications.alerts import check_and_send_deadline_reminders, check_and_send_overdue_warnings

@router.post("/send-reminders")
def send_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = check_and_send_deadline_reminders(
        db=db,
        user=current_user,
        email=current_user.email,
        name=current_user.name
    )
    return result

@router.post("/send-overdue-warnings")
def send_overdue_warnings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = check_and_send_overdue_warnings(
        db=db,
        user=current_user,
        email=current_user.email,
        name=current_user.name
    )
    return result