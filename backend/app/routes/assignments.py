from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.assignment import Assignment, PriorityLevel, AssignmentStatus
from app.models.user import User
from app.auth.oauth import get_current_user
from app.ai.gemini import get_gemini
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import fitz
import base64

router = APIRouter(prefix="/assignments", tags=["Assignments"])

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_name: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[PriorityLevel] = None
    status: Optional[AssignmentStatus] = None

def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_image_base64(file_bytes: bytes, filename: str) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")

def solve_question(question_text: str = None, pdf_text: str = None,
                   image_b64: str = None, image_media_type: str = None,
                   title: str = "", course_name: str = "") -> str:
    llm = get_gemini()

    if image_b64:
        from langchain_core.messages import HumanMessage
        message = HumanMessage(
            content=[
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image_media_type};base64,{image_b64}"}
                },
                {
                    "type": "text",
                    "text": f"""You are an expert academic tutor.
Course: {course_name}
Assignment: {title}

Please identify all questions in this image and solve each one step by step with clear explanations. Be thorough and educational."""
                }
            ]
        )
        response = llm.invoke([message])
        return response.content

    combined_text = ""
    if question_text:
        combined_text += f"Question Text:\n{question_text}\n\n"
    if pdf_text:
        combined_text += f"PDF Content:\n{pdf_text[:3000]}\n\n"

    if not combined_text.strip():
        return "No question content provided."

    prompt = f"""You are an expert academic tutor.
Course: {course_name}
Assignment: {title}

{combined_text}

Please:
1. Identify all questions
2. Solve each question step by step
3. Provide clear explanations
4. Format your response clearly with question numbers

Be thorough and educational."""

    response = llm.invoke(prompt)
    return response.content

@router.get("/")
def get_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments = db.query(Assignment).filter(
        Assignment.user_id == current_user.id
    ).order_by(Assignment.due_date.asc()).all()
    return assignments

@router.post("/")
async def create_assignment(
    title: str = Form(...),
    course_name: Optional[str] = Form(None),
    due_date: Optional[str] = Form(None),
    priority: Optional[str] = Form("medium"),
    description: Optional[str] = Form(None),
    question_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question_pdf_1 = None
    question_pdf_1_name = None
    pdf_text = None
    image_b64 = None
    image_media_type = None

    if file and file.filename:
        file_bytes = await file.read()
        fname = file.filename.lower()
        question_pdf_1_name = file.filename

        if fname.endswith(".pdf"):
            pdf_text = extract_pdf_text(file_bytes)
            question_pdf_1 = base64.b64encode(file_bytes).decode("utf-8")
        elif fname.endswith((".jpg", ".jpeg", ".png", ".webp")):
            ext = fname.split(".")[-1]
            image_media_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
            image_b64 = extract_image_base64(file_bytes, file.filename)
            question_pdf_1 = image_b64

    solution = None
    if question_text or pdf_text or image_b64:
        solution = solve_question(
            question_text=question_text,
            pdf_text=pdf_text,
            image_b64=image_b64,
            image_media_type=image_media_type,
            title=title,
            course_name=course_name or ""
        )

    priority_map = {
        "low": PriorityLevel.low,
        "medium": PriorityLevel.medium,
        "high": PriorityLevel.high,
        "urgent": PriorityLevel.urgent,
    }

    new_assignment = Assignment(
        user_id=current_user.id,
        title=title,
        description=description,
        course_name=course_name,
        due_date=datetime.fromisoformat(due_date) if due_date else None,
        priority=priority_map.get(priority, PriorityLevel.medium),
        question_text=question_text,
        question_pdf_1=question_pdf_1,
        question_pdf_1_name=question_pdf_1_name,
        solution=solution,
        solution_filename="ai_generated" if solution else None,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment

@router.put("/{assignment_id}")
def update_assignment(
    assignment_id: str,
    updates: AssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(assignment, field, value)
    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/{assignment_id}/extend-question")
async def extend_question(
    assignment_id: str,
    question_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if file and file.filename:
        file_bytes = await file.read()
        fname = file.filename.lower()

        if fname.endswith(".pdf"):
            pdf_b64 = base64.b64encode(file_bytes).decode("utf-8")
        elif fname.endswith((".jpg", ".jpeg", ".png", ".webp")):
            pdf_b64 = base64.b64encode(file_bytes).decode("utf-8")
        else:
            pdf_b64 = None

        if pdf_b64:
            if not assignment.question_pdf_1:
                assignment.question_pdf_1 = pdf_b64
                assignment.question_pdf_1_name = file.filename
            else:
                assignment.question_pdf_2 = pdf_b64
                assignment.question_pdf_2_name = file.filename

    if question_text:
        existing_text = assignment.question_text or ""
        if existing_text:
            assignment.question_text = existing_text + "\n\n[Extended Question]\n" + question_text
        else:
            assignment.question_text = question_text

    assignment.previous_solution = assignment.solution
    assignment.solution = None
    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/{assignment_id}/solve")
def solve_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    pdf_text_1 = None
    pdf_text_2 = None
    image_b64 = None
    image_media_type = None

    if assignment.question_pdf_1:
        try:
            file_bytes = base64.b64decode(assignment.question_pdf_1)
            if assignment.question_pdf_1_name and assignment.question_pdf_1_name.lower().endswith(".pdf"):
                pdf_text_1 = extract_pdf_text(file_bytes)
            else:
                image_b64 = assignment.question_pdf_1
                image_media_type = "image/jpeg"
        except Exception as e:
            print(f"Error decoding pdf_1: {e}")

    if assignment.question_pdf_2:
        try:
            file_bytes = base64.b64decode(assignment.question_pdf_2)
            if assignment.question_pdf_2_name and assignment.question_pdf_2_name.lower().endswith(".pdf"):
                pdf_text_2 = extract_pdf_text(file_bytes)
        except Exception as e:
            print(f"Error decoding pdf_2: {e}")

    combined_pdf_text = ""
    if pdf_text_1:
        combined_pdf_text += pdf_text_1
    if pdf_text_2:
        combined_pdf_text += f"\n\n[Extended Question PDF]\n{pdf_text_2}"

    if not combined_pdf_text:
        combined_pdf_text = None

    if not assignment.question_text and not combined_pdf_text and not image_b64:
        raise HTTPException(
            status_code=400,
            detail="No question content found. Please add question text or upload a PDF first."
        )

    if assignment.solution:
        assignment.previous_solution = assignment.solution

    solution = solve_question(
        question_text=assignment.question_text,
        pdf_text=combined_pdf_text,
        image_b64=image_b64,
        image_media_type=image_media_type,
        title=assignment.title,
        course_name=assignment.course_name or ""
    )

    assignment.solution = solution
    assignment.solution_filename = "ai_generated"
    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if assignment.status != AssignmentStatus.completed:
        assignment.question_pdf_1 = None
        assignment.question_pdf_2 = None
        assignment.question_pdf_1_name = None
        assignment.question_pdf_2_name = None
        assignment.question_text = None
        assignment.solution = None
        assignment.previous_solution = None
        db.commit()

    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted successfully"}

@router.put("/{assignment_id}/complete")
def complete_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    assignment.status = AssignmentStatus.completed
    assignment.question_pdf_1 = None
    assignment.question_pdf_2 = None
    assignment.question_pdf_1_name = None
    assignment.question_pdf_2_name = None
    assignment.question_text = None
    assignment.solution = None
    assignment.previous_solution = None
    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment