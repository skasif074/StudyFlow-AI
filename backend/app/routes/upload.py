from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.planner import SavedPlan
from app.auth.oauth import get_current_user
from app.ai.gemini import get_gemini
import fitz
import base64
import json
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/upload", tags=["Upload"])

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def image_to_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")

@router.post("/solve")
async def solve_question(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_bytes = await file.read()
    filename = file.filename.lower()

    llm = get_gemini()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        prompt = f"""
You are an expert academic tutor. A student has uploaded a question paper or assignment.

Content:
{text[:3000]}

Please:
1. Identify all questions
2. Solve each question step by step
3. Provide clear explanations
4. Format your response clearly with question numbers

Be thorough and educational in your explanations.
"""
        response = llm.invoke(prompt)
        solution = response.content

    elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
        from langchain_core.messages import HumanMessage

        b64 = image_to_base64(file_bytes)
        ext = filename.split(".")[-1]
        media_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"

        message = HumanMessage(
            content=[
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{b64}"
                    }
                },
                {
                    "type": "text",
                    "text": "You are an expert academic tutor. Please identify all questions in this image and solve each one step by step with clear explanations. Be thorough and educational."
                }
            ]
        )
        response = llm.invoke([message])
        solution = response.content

    else:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG files are supported")

    return {
        "filename": file.filename,
        "solution": solution,
        "solved_at": datetime.utcnow().isoformat()
    }