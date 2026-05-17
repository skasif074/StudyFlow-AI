STUDY_PLANNER_PROMPT = """
You are an AI academic study planner. Based on the student's assignments, deadlines and AI-solved questions, generate a detailed personalized 7-day study schedule.

Student Assignments:
{assignments}

Today's Date: {today}

Generate a detailed 7-day study plan in this exact JSON format:
{{
    "study_plan": [
        {{
            "day": "Monday",
            "date": "YYYY-MM-DD",
            "sessions": [
                {{
                    "time": "9:00 AM - 11:00 AM",
                    "subject": "subject name",
                    "task": "specific detailed task based on the assignment and solution",
                    "priority": "high/medium/low",
                    "duration_minutes": 120
                }}
            ]
        }}
    ],
    "recommendations": [
        "specific recommendation based on assignments and solutions"
    ],
    "risk_alerts": [
        "any assignments at risk of being missed"
    ]
}}

Important:
- Generate plans for all 7 days
- If an assignment has a solution, reference specific topics from the solution in the tasks
- Be specific and detailed in tasks
- Distribute workload evenly across 7 days
- Return only valid JSON, no extra text.
"""

ASSIGNMENT_EXTRACTOR_PROMPT = """
You are an AI that extracts assignment information from academic emails.

Email Content:
{email_content}

Extract assignment details in this exact JSON format:
{{
    "assignments": [
        {{
            "title": "assignment title",
            "course_name": "course name",
            "due_date": "YYYY-MM-DD HH:MM or null",
            "description": "brief description",
            "urgency": "high/medium/low"
        }}
    ],
    "is_academic": true/false
}}

Return only valid JSON, no extra text.
"""

RISK_PREDICTION_PROMPT = """
You are an AI academic risk predictor. Analyze the student's current workload and predict risks.

Current Assignments:
{assignments}

Today's Date: {today}

Analyze and return in this exact JSON format:
{{
    "risk_level": "high/medium/low",
    "at_risk_assignments": [
        {{
            "title": "assignment title",
            "due_date": "date",
            "risk_reason": "why this is at risk"
        }}
    ],
    "overall_recommendation": "brief overall recommendation"
}}

Return only valid JSON, no extra text.
"""