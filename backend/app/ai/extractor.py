from app.ai.gemini import get_gemini
from app.ai.prompts import ASSIGNMENT_EXTRACTOR_PROMPT, STUDY_PLANNER_PROMPT, RISK_PREDICTION_PROMPT
from datetime import datetime
import json
import re

def clean_json_response(text: str) -> str:
    text = re.sub(r'```json\n?', '', text)
    text = re.sub(r'```\n?', '', text)
    return text.strip()

def extract_assignments_from_email(email_content: str) -> dict:
    llm = get_gemini()
    prompt = ASSIGNMENT_EXTRACTOR_PROMPT.format(email_content=email_content)
    response = llm.invoke(prompt)
    cleaned = clean_json_response(response.content)
    return json.loads(cleaned)

def generate_study_plan(assignments: list) -> dict:
    llm = get_gemini()
    assignments_text = "\n".join([
        f"- {a.get('title', '')} | Course: {a.get('course_name', 'N/A')} | Due: {a.get('due_date', 'N/A')} | Priority: {a.get('priority', 'medium')}"
        for a in assignments
    ])
    prompt = STUDY_PLANNER_PROMPT.format(
        assignments=assignments_text,
        today=datetime.now().strftime("%Y-%m-%d %A")
    )
    response = llm.invoke(prompt)
    cleaned = clean_json_response(response.content)
    return json.loads(cleaned)

def predict_risk(assignments: list) -> dict:
    llm = get_gemini()
    assignments_text = "\n".join([
        f"- {a.get('title', '')} | Due: {a.get('due_date', 'N/A')} | Status: {a.get('status', 'pending')}"
        for a in assignments
    ])
    prompt = RISK_PREDICTION_PROMPT.format(
        assignments=assignments_text,
        today=datetime.now().strftime("%Y-%m-%d %A")
    )
    response = llm.invoke(prompt)
    cleaned = clean_json_response(response.content)
    return json.loads(cleaned)