from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey
from app.database.db import Base
from datetime import datetime
import uuid
import enum

class PriorityLevel(enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class AssignmentStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    overdue = "overdue"

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    course_name = Column(String, nullable=True)
    source = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.medium)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.pending)
    is_overdue = Column(Boolean, default=False)
    classroom_id = Column(String, nullable=True)
    gmail_extracted = Column(Boolean, default=False)

    # Question fields
    question_text = Column(Text, nullable=True)
    question_pdf_1 = Column(Text, nullable=True)
    question_pdf_1_name = Column(String, nullable=True)
    question_pdf_2 = Column(Text, nullable=True)
    question_pdf_2_name = Column(String, nullable=True)

    # Solution fields
    solution = Column(Text, nullable=True)
    solution_filename = Column(String, nullable=True)
    previous_solution = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)