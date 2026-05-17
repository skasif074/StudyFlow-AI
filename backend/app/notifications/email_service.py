import resend
import os
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

def send_deadline_reminder(to_email: str, student_name: str, assignment_title: str, course_name: str, due_date: str):
    params = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": f"⏰ {assignment_title}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">StudyFlow AI</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Deadline Alert</p>
            </div>
            <h2 style="color: #0f172a;">Hey {student_name}!</h2>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">{assignment_title}</p>
                <p style="margin: 8px 0 0 0; color: #92400e;">📚 Course: {course_name}</p>
                <p style="margin: 5px 0 0 0; color: #92400e;">📅 Due: {due_date}</p>
            </div>
            <p style="color: #475569;">Log in to StudyFlow AI to view your study plan and complete this assignment on time.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/dashboard" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Dashboard</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">StudyFlow AI — Your AI Academic Assistant</p>
        </div>
        """,
    }
    return resend.Emails.send(params)

def send_overdue_warning(to_email: str, student_name: str, assignment_title: str, course_name: str):
    params = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": f"🚨 Overdue Warning: {assignment_title}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">StudyFlow AI</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Academic Operating System</p>
            </div>
            <h2 style="color: #dc2626;">Hey {student_name}, you have an overdue assignment!</h2>
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #991b1b;">🚨 {assignment_title}</p>
                <p style="margin: 5px 0 0 0; color: #991b1b;">Course: {course_name}</p>
                <p style="margin: 5px 0 0 0; color: #991b1b;">Status: OVERDUE</p>
            </div>
            <p style="color: #475569;">This assignment is now overdue. Please contact your instructor and submit as soon as possible.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/dashboard/assignments" style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Assignments</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">StudyFlow AI — Your AI Academic Assistant</p>
        </div>
        """,
    }
    return resend.Emails.send(params)

def send_weekly_report(to_email: str, student_name: str, completed: int, pending: int, overdue: int, productivity_score: float):
    params = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "📊 Your Weekly Academic Report — StudyFlow AI",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">StudyFlow AI</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Weekly Report</p>
            </div>
            <h2 style="color: #0f172a;">Hey {student_name}, here is your weekly summary!</h2>
            <div style="display: grid; gap: 15px; margin: 20px 0;">
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 5px;">
                    <p style="margin: 0; font-weight: bold; color: #166534;">✅ Completed: {completed} assignments</p>
                </div>
                <div style="background: #fefce8; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px;">
                    <p style="margin: 0; font-weight: bold; color: #854d0e;">⏳ Pending: {pending} assignments</p>
                </div>
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 5px;">
                    <p style="margin: 0; font-weight: bold; color: #991b1b;">🚨 Overdue: {overdue} assignments</p>
                </div>
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px;">
                    <p style="margin: 0; font-weight: bold; color: #1e40af;">📈 Productivity Score: {productivity_score}%</p>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/dashboard/analytics" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Full Analytics</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">StudyFlow AI — Your AI Academic Assistant</p>
        </div>
        """,
    }
    return resend.Emails.send(params)