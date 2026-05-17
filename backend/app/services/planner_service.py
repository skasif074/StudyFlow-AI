from app.ai.extractor import generate_study_plan
from app.models.assignment import Assignment, AssignmentStatus
from sqlalchemy.orm import Session

def get_assignments_for_planning(db: Session, user_id: str):
    assignments = db.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.status != AssignmentStatus.completed
    ).order_by(Assignment.due_date.asc()).all()

    return [
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