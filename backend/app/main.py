from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes import auth, assignments, analytics, notifications, planner, chat, upload, classroom
from app.notifications.scheduler import start_scheduler
import os

load_dotenv()

app = FastAPI(
    title="StudyFlow AI",
    description="AI-powered academic operating system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assignments.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(planner.router)
app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(classroom.router)

@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.get("/")
def root():
    return {"message": "StudyFlow AI backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}