from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'nexus_default_secret')
JWT_ALGORITHM = "HS256"

app = FastAPI()
from fastapi import FastAPI

app = FastAPI()   
@app.get("/")
def root():
    return {"status": "Backend running"}

@app.get("/ai/nudges")
def ai_nudges():
    return {"nudge": "Focus on one task at a time."}

@app.get("/dashboard/stats")
def dashboard_stats():
    return {"tasksCompleted": 0, "studyHours": 0}

@app.get("/tasks")
def tasks():
    return []

@app.get("/study/plans")
def study_plans():
    return []

@app.get("/wellness/pomodoro")
def pomodoro():
    return {"completed": 0}

api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===== MODELS =====
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    order: Optional[int] = None

class TaskReorder(BaseModel):
    task_ids: List[str]

class StudyPlanCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = ""
    target_hours: Optional[float] = 10.0

class StudyPlanUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    target_hours: Optional[float] = None

class StudySessionLog(BaseModel):
    duration_minutes: float
    notes: Optional[str] = ""

class ResourceCreate(BaseModel):
    title: str
    url: str
    resource_type: Optional[str] = "article"
    tags: Optional[List[str]] = []

class WellnessLogCreate(BaseModel):
    log_type: str  # water, mood, exercise, sleep
    value: float
    notes: Optional[str] = ""

class PomodoroComplete(BaseModel):
    duration_minutes: Optional[int] = 25

# ===== AUTH HELPERS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {"user_id": user_id, "email": email, "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== AUTH ROUTES =====
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {"token": token, "user": {"id": user_id, "email": data.email, "name": data.name}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===== TASKS ROUTES =====
@api_router.post("/tasks")
async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    count = await db.tasks.count_documents({"user_id": current_user["user_id"]})
    task_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "priority": data.priority,
        "status": "active",
        "due_date": data.due_date,
        "order": count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return task_doc

@api_router.get("/tasks")
async def get_tasks(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if status and status != "all":
        query["status"] = status
    tasks = await db.tasks.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@api_router.put("/tasks/reorder/batch")
async def reorder_tasks(data: TaskReorder, current_user: dict = Depends(get_current_user)):
    for idx, task_id in enumerate(data.task_ids):
        await db.tasks.update_one(
            {"id": task_id, "user_id": current_user["user_id"]},
            {"$set": {"order": idx}}
        )
    return {"success": True}

# ===== STUDY PLANS ROUTES =====
@api_router.post("/study-plans")
async def create_study_plan(data: StudyPlanCreate, current_user: dict = Depends(get_current_user)):
    plan_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": data.title,
        "subject": data.subject,
        "description": data.description,
        "target_hours": data.target_hours,
        "logged_hours": 0,
        "sessions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.study_plans.insert_one(plan_doc)
    plan_doc.pop("_id", None)
    return plan_doc

@api_router.get("/study-plans")
async def get_study_plans(current_user: dict = Depends(get_current_user)):
    plans = await db.study_plans.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(100)
    return plans

@api_router.put("/study-plans/{plan_id}")
async def update_study_plan(plan_id: str, data: StudyPlanUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.study_plans.update_one(
        {"id": plan_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    plan = await db.study_plans.find_one({"id": plan_id}, {"_id": 0})
    return plan

@api_router.delete("/study-plans/{plan_id}")
async def delete_study_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.study_plans.delete_one({"id": plan_id, "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True}

@api_router.post("/study-plans/{plan_id}/log-session")
async def log_study_session(plan_id: str, data: StudySessionLog, current_user: dict = Depends(get_current_user)):
    session = {
        "id": str(uuid.uuid4()),
        "duration_minutes": data.duration_minutes,
        "notes": data.notes,
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    hours_increment = data.duration_minutes / 60
    await db.study_plans.update_one(
        {"id": plan_id, "user_id": current_user["user_id"]},
        {"$push": {"sessions": session}, "$inc": {"logged_hours": hours_increment}}
    )
    plan = await db.study_plans.find_one({"id": plan_id}, {"_id": 0})
    return plan

# ===== RESOURCES ROUTES =====
@api_router.post("/resources")
async def create_resource(data: ResourceCreate, current_user: dict = Depends(get_current_user)):
    resource_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": data.title,
        "url": data.url,
        "resource_type": data.resource_type,
        "tags": data.tags,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.resources.insert_one(resource_doc)
    resource_doc.pop("_id", None)
    return resource_doc

@api_router.get("/resources")
async def get_resources(resource_type: Optional[str] = None, tag: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if resource_type and resource_type != "all":
        query["resource_type"] = resource_type
    if tag:
        query["tags"] = tag
    resources = await db.resources.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return resources

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.resources.delete_one({"id": resource_id, "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"success": True}

# ===== WELLNESS ROUTES =====
@api_router.post("/wellness/logs")
async def create_wellness_log(data: WellnessLogCreate, current_user: dict = Depends(get_current_user)):
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "log_type": data.log_type,
        "value": data.value,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wellness_logs.insert_one(log_doc)
    log_doc.pop("_id", None)
    return log_doc

@api_router.get("/wellness/logs")
async def get_wellness_logs(log_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if log_type:
        query["log_type"] = log_type
    logs = await db.wellness_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs

@api_router.post("/wellness/pomodoro")
async def complete_pomodoro(data: PomodoroComplete, current_user: dict = Depends(get_current_user)):
    pomo_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "duration_minutes": data.duration_minutes,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pomodoro_sessions.insert_one(pomo_doc)
    pomo_doc.pop("_id", None)
    return pomo_doc

@api_router.get("/wellness/pomodoro")
async def get_pomodoro_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.pomodoro_sessions.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("completed_at", -1).to_list(100)
    return sessions

# ===== DASHBOARD STATS =====
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    total_tasks = await db.tasks.count_documents({"user_id": uid})
    completed_tasks = await db.tasks.count_documents({"user_id": uid, "status": "completed"})
    active_plans = await db.study_plans.count_documents({"user_id": uid})

    # Calculate study consistency
    plans = await db.study_plans.find({"user_id": uid}, {"_id": 0, "target_hours": 1, "logged_hours": 1}).to_list(100)
    total_target = sum(p.get("target_hours", 0) for p in plans)
    total_logged = sum(p.get("logged_hours", 0) for p in plans)
    consistency = int((total_logged / total_target * 100)) if total_target > 0 else 0

    total_resources = await db.resources.count_documents({"user_id": uid})

    # Today's water
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_water_logs = await db.wellness_logs.find(
        {"user_id": uid, "log_type": "water", "created_at": {"$gte": today_start}}, {"_id": 0}
    ).to_list(100)
    today_water = sum(l.get("value", 0) for l in today_water_logs)

    today_pomodoros = await db.pomodoro_sessions.count_documents(
        {"user_id": uid, "completed_at": {"$gte": today_start}}
    )

    return {
        "tasks": {"total": total_tasks, "completed": completed_tasks},
        "study": {"active_plans": active_plans, "consistency": min(consistency, 100)},
        "resources": {"total": total_resources},
        "wellness": {"today_water": today_water, "today_pomodoros": today_pomodoros}
    }

# ===== AI NUDGES =====
@api_router.post("/ai/nudge")
async def get_ai_nudge(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    try:
        # Gather user data for context
        stats = await get_dashboard_stats(current_user)
        recent_wellness = await db.wellness_logs.find(
            {"user_id": uid}, {"_id": 0}
        ).sort("created_at", -1).to_list(10)

        recent_tasks = await db.tasks.find(
            {"user_id": uid, "status": "active"}, {"_id": 0, "title": 1, "priority": 1, "due_date": 1}
        ).to_list(5)

        context = f"""User Stats:
- Tasks: {stats['tasks']['completed']}/{stats['tasks']['total']} completed
- Study consistency: {stats['study']['consistency']}% across {stats['study']['active_plans']} plans
- Resources saved: {stats['resources']['total']}
- Today's water: {stats['wellness']['today_water']} glasses
- Today's pomodoros: {stats['wellness']['today_pomodoros']}

Recent wellness logs: {[{'type': l['log_type'], 'value': l['value']} for l in recent_wellness[:5]]}
Active tasks: {[{'title': t['title'], 'priority': t['priority']} for t in recent_tasks]}"""

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return {"nudge": "Stay hydrated and take regular breaks!", "category": "general"}

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"nudge-{uid}-{str(uuid.uuid4())[:8]}",
            system_message="You are a wellness and productivity coach. Based on the user's data, provide ONE short, actionable health or productivity nudge (2-3 sentences max). Be specific and encouraging. Focus on what they can improve right now."
        ).with_model("gemini", "gemini-3-flash-preview")

        user_msg = UserMessage(text=f"Analyze my data and give me a personalized nudge:\n{context}")
        response = await chat.send_message(user_msg)

        nudge_doc = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "message": response,
            "category": "ai",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_nudges.insert_one(nudge_doc)
        nudge_doc.pop("_id", None)
        return nudge_doc

    except Exception as e:
        logger.error(f"AI nudge error: {e}")
        return {"nudge": "Remember to stay hydrated and take a 5-minute break every hour!", "category": "fallback"}

@api_router.get("/ai/nudges")
async def get_nudge_history(current_user: dict = Depends(get_current_user)):
    nudges = await db.ai_nudges.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return nudges

# ===== SETUP =====
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
