from sqlalchemy import Column, String, DateTime, Integer, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey
from app.database.db import Base
from datetime import datetime
import uuid

class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    study_hours = Column(Float, default=0.0)
    assignments_completed = Column(Integer, default=0)
    assignments_pending = Column(Integer, default=0)
    assignments_overdue = Column(Integer, default=0)
    productivity_score = Column(Float, default=0.0)
    focus_sessions = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)