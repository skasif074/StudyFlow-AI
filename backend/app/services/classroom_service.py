from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.models.assignment import Assignment, PriorityLevel, AssignmentStatus
from sqlalchemy.orm import Session
from datetime import datetime
import requests
import fitz
import base64

def get_classroom_service(token_data: dict):
    credentials = Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
    )
    return build("classroom", "v1", credentials=credentials)

def download_pdf_text(url: str, access_token: str) -> str:
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        if response.status_code == 200:
            doc = fitz.open(stream=response.content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text[:3000]
    except Exception as e:
        print(f"Failed to download PDF: {e}")
    return ""

def get_attachments(service, course_id: str, coursework_id: str, access_token: str):
    try:
        work = service.courses().courseWork().get(
            courseId=course_id,
            id=coursework_id
        ).execute()

        materials = work.get("materials", [])
        pdf_names = []

        for material in materials:
            if "driveFile" in material:
                file_title = material["driveFile"]["driveFile"].get("title", "attachment")
                if file_title.lower().endswith((".pdf", ".jpg", ".jpeg", ".png")):
                    pdf_names.append(file_title)
            elif "link" in material:
                link_title = material["link"].get("title", "")
                if link_title:
                    pdf_names.append(link_title)

        return None, ", ".join(pdf_names) if pdf_names else None

    except Exception as e:
        print(f"Failed to get attachments: {e}")
        return None, None

def sync_classroom_assignments(token_data: dict, user_id: str, db: Session):
    try:
        service = get_classroom_service(token_data)
        access_token = token_data.get("access_token")

        courses = service.courses().list(studentId="me").execute()
        course_list = courses.get("courses", [])

        synced = []
        updated = []

        for course in course_list:
            course_id = course["id"]
            course_name = course["name"]

            try:
                coursework = service.courses().courseWork().list(
                    courseId=course_id
                ).execute()

                works = coursework.get("courseWork", [])

                for work in works:
                    classroom_id = work["id"]
                    description = work.get("description", "")

                    pdf_text, pdf_names = get_attachments(
                        service, course_id, classroom_id, access_token
                    )

                    combined_question = ""
                    if description:
                        combined_question += description
                    if pdf_text:
                        combined_question += f"\n\n[PDF Attachment]\n{pdf_text}"

                    existing = db.query(Assignment).filter(
                        Assignment.classroom_id == classroom_id,
                        Assignment.user_id == user_id
                    ).first()

                    if existing:
                        if not existing.question_text and combined_question:
                            existing.question_text = combined_question
                            if pdf_names:
                                existing.question_pdf_1_name = pdf_names
                            db.commit()
                            updated.append(work.get("title", "Untitled"))
                        continue

                    due_date = None
                    if "dueDate" in work:
                        d = work["dueDate"]
                        t = work.get("dueTime", {})
                        due_date = datetime(
                            d.get("year", 2024),
                            d.get("month", 1),
                            d.get("day", 1),
                            t.get("hours", 23),
                            t.get("minutes", 59),
                        )

                    new_assignment = Assignment(
                        user_id=user_id,
                        title=work.get("title", "Untitled"),
                        description=description,
                        course_name=course_name,
                        due_date=due_date,
                        priority=PriorityLevel.medium,
                        status=AssignmentStatus.pending,
                        classroom_id=classroom_id,
                        source="google_classroom",
                        question_text=combined_question if combined_question else None,
                        question_pdf_1_name=pdf_names,
                    )
                    db.add(new_assignment)
                    synced.append(work.get("title", "Untitled"))

            except Exception as e:
                print(f"Error fetching coursework for {course_name}: {e}")
                continue

        db.commit()
        return {
            "synced": synced,
            "total": len(synced),
            "updated": updated,
            "total_updated": len(updated)
        }

    except Exception as e:
        return {"error": str(e)}