from app.notifications.email_service import send_deadline_reminder, send_overdue_warning, send_weekly_report
from app.models.assignment import Assignment, AssignmentStatus
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

def get_urgency_label(hours_left: float) -> str:
    if hours_left <= 1:
        return "🔴 CRITICAL - 1 Hour Left"
    elif hours_left <= 3:
        return "🔴 URGENT - 3 Hours Left"
    elif hours_left <= 6:
        return "🟠 6 Hours Left"
    elif hours_left <= 12:
        return "🟠 12 Hours Left"
    elif hours_left <= 24:
        return "🟡 1 Day Left"
    elif hours_left <= 48:
        return "🟡 2 Days Left"
    elif hours_left <= 72:
        return "🟢 3 Days Left"
    elif hours_left <= 120:
        return "🟢 5 Days Left"
    else:
        return "📅 Upcoming"

def check_and_send_deadline_reminders(db: Session, user, email: str, name: str):
    now = datetime.utcnow()
    window = now + timedelta(days=5)

    assignments = db.query(Assignment).filter(
        Assignment.user_id == user.id,
        Assignment.due_date >= now,
        Assignment.due_date <= window,
        Assignment.status != AssignmentStatus.completed
    ).all()

    sent = []

    for assignment in assignments:
        if not assignment.due_date:
            continue

        hours_left = (assignment.due_date - now).total_seconds() / 3600
        urgency = get_urgency_label(hours_left)

        should_send = (
            hours_left <= 1 or
            hours_left <= 3 or
            hours_left <= 6 or
            hours_left <= 12 or
            hours_left <= 24 or
            hours_left <= 48 or
            hours_left <= 72 or
            hours_left <= 120
        )

        if should_send:
            due_str = assignment.due_date.strftime("%B %d, %Y %I:%M %p")
            send_deadline_reminder(
                to_email=email,
                student_name=name,
                assignment_title=f"{urgency} — {assignment.title}",
                course_name=assignment.course_name or "General",
                due_date=due_str
            )
            sent.append({
                "title": assignment.title,
                "hours_left": round(hours_left, 1),
                "urgency": urgency
            })

    return {"reminders_sent": sent}

def check_and_send_overdue_warnings(db: Session, user, email: str, name: str):
    now = datetime.utcnow()

    assignments = db.query(Assignment).filter(
        Assignment.user_id == user.id,
        Assignment.due_date < now,
        Assignment.status != AssignmentStatus.completed
    ).all()

    sent = []
    for assignment in assignments:
        assignment.status = AssignmentStatus.overdue
        assignment.is_overdue = True
        send_overdue_warning(
            to_email=email,
            student_name=name,
            assignment_title=assignment.title,
            course_name=assignment.course_name or "General"
        )
        sent.append(assignment.title)

    db.commit()
    return {"overdue_warnings_sent": sent}