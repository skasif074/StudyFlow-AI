from app.database.db import SessionLocal
from app.models.assignment import Assignment, AssignmentStatus
from datetime import datetime, timedelta

db = SessionLocal()
now = datetime.utcnow()
upcoming = now + timedelta(days=2)
print('Now:', now)
print('Upcoming:', upcoming)
assignments = db.query(Assignment).all()
print('Total assignments:', len(assignments))
for a in assignments:
    print('Assignment:', a.title, '| Due:', a.due_date, '| User:', a.user_id)