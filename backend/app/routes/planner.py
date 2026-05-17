from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.assignment import Assignment, AssignmentStatus
from app.models.schedule import Schedule
from app.models.user import User
from app.auth.oauth import get_current_user
from app.ai.extractor import generate_study_plan, predict_risk
from datetime import datetime
from app.models.planner import SavedPlan
import json
from datetime import datetime, timedelta
router = APIRouter(prefix="/planner", tags=["AI Planner"])

@router.get("/generate")
def generate_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    if not assignments:
        return {"message": "No pending assignments found", "study_plan": []}

    assignments_list = [
    {
        "title": a.title,
        "course_name": a.course_name or "General",
        "due_date": a.due_date.strftime("%Y-%m-%d") if a.due_date else "No deadline",
        "priority": a.priority.value if a.priority else "medium",
        "status": a.status.value if a.status else "pending",
        "has_solution": bool(a.solution),
        "solution_summary": a.solution[:500] if a.solution else None,
    }
    for a in assignments
]


    study_plan = generate_study_plan(assignments_list)
    return study_plan

@router.get("/risk")
def get_risk_assessment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    if not assignments:
        return {"risk_level": "low", "message": "No pending assignments"}

    assignments_list = [
        {
            "title": a.title,
            "due_date": a.due_date.strftime("%Y-%m-%d") if a.due_date else "No deadline",
            "status": a.status.value if a.status else "pending"
        }
        for a in assignments
    ]

    risk = predict_risk(assignments_list)
    return risk

@router.get("/today")
def get_todays_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.utcnow().date()

    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).limit(5).all()

    if not assignments:
        return {"message": "No pending assignments for today", "sessions": []}

    assignments_list = [
        {
            "title": a.title,
            "course_name": a.course_name or "General",
            "due_date": a.due_date.strftime("%Y-%m-%d") if a.due_date else "No deadline",
            "priority": a.priority.value if a.priority else "medium"
        }
        for a in assignments
    ]

    study_plan = generate_study_plan(assignments_list)

    today_str = today.strftime("%A")
    today_sessions = []

    for day in study_plan.get("study_plan", []):
        if today_str.lower() in day.get("day", "").lower():
            today_sessions = day.get("sessions", [])
            break

    return {
        "date": str(today),
        "day": today_str,
        "sessions": today_sessions,
        "recommendations": study_plan.get("recommendations", []),
        "risk_alerts": study_plan.get("risk_alerts", [])
    }
@router.post("/save")
def save_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    if not assignments:
        return {"message": "No pending assignments found"}

    assignments_list = [
        {
            "title": a.title,
            "course_name": a.course_name or "General",
            "due_date": a.due_date.strftime("%Y-%m-%d") if a.due_date else "No deadline",
            "priority": a.priority.value if a.priority else "medium",
            "status": a.status.value if a.status else "pending"
        }
        for a in assignments
    ]

    study_plan = generate_study_plan(assignments_list)

    expires_at = datetime.utcnow() + timedelta(days=7)

    db.query(SavedPlan).filter(
        SavedPlan.user_id == current_user.id
    ).delete()

    saved = SavedPlan(
        user_id=current_user.id,
        plan_data=json.dumps(study_plan),
        expires_at=expires_at
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return {**study_plan, "saved": True, "expires_at": str(expires_at)}

@router.get("/saved")
def get_saved_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    saved = db.query(SavedPlan).filter(
        SavedPlan.user_id == current_user.id,
        SavedPlan.expires_at > now
    ).first()

    if not saved:
        return {"message": "No saved plan found"}

    plan = json.loads(saved.plan_data)
    plan["expires_at"] = str(saved.expires_at)
    plan["saved"] = True
    return plan