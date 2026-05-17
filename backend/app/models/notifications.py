from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey
from app.database.db import Base
from datetime import datetime
import uuid
import enum

class NotificationType(enum.Enum):
    deadline_reminder = "deadline_reminder"
    overdue_warning = "overdue_warning"
    exam_alert = "exam_alert"
    productivity_warning = "productivity_warning"
    weekly_report = "weekly_report"
    ai_study_plan = "ai_study_plan"
    risk_prediction = "risk_prediction"

class NotificationStatus(enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.pending)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)