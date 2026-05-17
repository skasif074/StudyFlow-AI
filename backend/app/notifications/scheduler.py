from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database.db import SessionLocal
from app.models.user import User
from app.notifications.alerts import check_and_send_deadline_reminders, check_and_send_overdue_warnings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def run_reminders():
    logger.info("Running scheduled reminders...")
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            try:
                check_and_send_deadline_reminders(
                    db=db,
                    user=user,
                    email=user.email,
                    name=user.name
                )
                check_and_send_overdue_warnings(
                    db=db,
                    user=user,
                    email=user.email,
                    name=user.name
                )
            except Exception as e:
                logger.error(f"Error sending reminders for {user.email}: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(
        run_reminders,
        trigger=IntervalTrigger(hours=1),
        id="reminder_job",
        name="Send deadline reminders every hour",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started — reminders will run every hour")