from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.analytics import Analytics
from app.models.assignment import Assignment, AssignmentStatus
from app.models.user import User
from app.auth.oauth import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total = db.query(Assignment).filter(
        Assignment.user_id == current_user.id
    ).count()

    completed = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status == AssignmentStatus.completed
    ).count()

    pending = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status == AssignmentStatus.pending
    ).count()

    overdue = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status == AssignmentStatus.overdue
    ).count()

    in_progress = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status == AssignmentStatus.in_progress
    ).count()

    productivity_score = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "total_assignments": total,
        "completed": completed,
        "pending": pending,
        "overdue": overdue,
        "in_progress": in_progress,
        "productivity_score": productivity_score
    }

@router.get("/upcoming-deadlines")
def get_upcoming_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    next_7_days = now + timedelta(days=7)

    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.due_date >= now,
        Assignment.due_date <= next_7_days,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    return assignments

@router.get("/overdue")
def get_overdue_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()

    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.due_date < now,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    for assignment in assignments:
        if assignment.status != AssignmentStatus.overdue:
            assignment.status = AssignmentStatus.overdue
            assignment.is_overdue = True
    db.commit()

    return assignments