import os, textwrap
root = r"d:\\EduPredict\\backend"
files = {
r"app/__init__.py": "",
r"app/main.py": '''
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config.settings import settings
from app.database.mongo import connect_to_mongo, close_mongo_connection
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routes import auth, students, teachers, courses, attendance, datasets, ml, analytics, dashboard, feedback, reports, system
from app.websocket.alerts import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    logger.info('MongoDB connected')
    yield
    await close_mongo_connection()
    logger.info('MongoDB connection closed')


app = FastAPI(
    title='EduPredict Backend',
    description='Big Data Educational Analytics Platform backend',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)

app.include_router(auth.router, prefix='/api/auth', tags=['Auth'])
app.include_router(students.router, prefix='/api/students', tags=['Students'])
app.include_router(teachers.router, prefix='/api/teachers', tags=['Teachers'])
app.include_router(courses.router, prefix='/api/courses', tags=['Courses'])
app.include_router(attendance.router, prefix='/api/attendance', tags=['Attendance'])
app.include_router(datasets.router, prefix='/api/datasets', tags=['Datasets'])
app.include_router(ml.router, prefix='/api/ml', tags=['ML'])
app.include_router(dashboard.router, prefix='/api/dashboard', tags=['Dashboard'])
app.include_router(analytics.router, prefix='/api/analytics', tags=['Analytics'])
app.include_router(reports.router, prefix='/api/reports', tags=['Reports'])
app.include_router(feedback.router, prefix='/api/feedback', tags=['Feedback'])
app.include_router(system.router, prefix='/api/system', tags=['System'])
app.include_router(websocket_router)


@app.get('/health')
async def health_check():
    return {'status': 'ok', 'service': 'EduPredict backend'}
''',
r"app/config/settings.py": '''
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False)

    app_name: str = 'EduPredict'
    environment: str = 'development'
    secret_key: str = 'change-me'
    algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    mongo_uri: str = 'mongodb://localhost:27017'
    mongo_db: str = 'edupredict'

    redis_url: str = 'redis://localhost:6379/0'

    hdfs_host: str = 'localhost'
    hdfs_port: int = 9870
    hdfs_user: str = 'hdfs'
    hdfs_base_path: str = '/edupredict'

    smtp_host: str = 'localhost'
    smtp_port: int = 1025
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = 'no-reply@edupredict.local'

    cors_origins: List[str] = Field(default_factory=lambda: ['http://localhost:3000', 'http://localhost:5173'])
    rate_limit_per_minute: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
''',
r"app/database/mongo.py": '''
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config.settings import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]


async def close_mongo_connection() -> None:
    global client
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError('Database not initialized')
    return db
''',
r"app/models/user.py": '''
from enum import Enum


class UserRole(str, Enum):
    admin = 'Admin'
    teacher = 'Teacher'
    student = 'Student'
    analyst = 'Analyst'
''',
r"app/schemas/auth.py": '''
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
''',
r"app/schemas/student.py": '''
from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    student_id: str
    name: str
    course: str
    semester: int = Field(ge=1, le=12)
    attendance: float = Field(default=0.0, ge=0, le=100)
    gpa: float = Field(default=0.0, ge=0, le=4)


class StudentUpdate(BaseModel):
    name: str | None = None
    course: str | None = None
    semester: int | None = Field(default=None, ge=1, le=12)
    attendance: float | None = Field(default=None, ge=0, le=100)
    gpa: float | None = Field(default=None, ge=0, le=4)
''',
r"app/schemas/common.py": "from pydantic import BaseModel\n\nclass MessageResponse(BaseModel):\n    message: str\n",
r"app/auth/security.py": '''
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config.settings import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_token(subject: str, expires_delta: timedelta, token_type: str = 'access') -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {'sub': subject, 'exp': expire, 'type': token_type}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
''',
r"app/auth/dependencies.py": '''
from datetime import timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.auth.security import create_token
from app.config.settings import settings
from app.database.mongo import get_db
from app.models.user import UserRole

security = HTTPBearer(auto_error=True)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
        user = await get_db().users.find_one({'_id': user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
        return user
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token') from exc


def require_roles(*roles: UserRole):
    async def _role_guard(user=Depends(get_current_user)):
        if user.get('role') not in [r.value for r in roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient permissions')
        return user

    return _role_guard


def issue_token_pair(user_id: str):
    access = create_token(user_id, timedelta(minutes=settings.access_token_expire_minutes), 'access')
    refresh = create_token(user_id, timedelta(days=settings.refresh_token_expire_days), 'refresh')
    return access, refresh
''',
r"app/services/crud_service.py": '''
from bson import ObjectId

from app.database.mongo import get_db


class CRUDService:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return get_db()[self.collection_name]

    async def list(self, query: dict | None = None):
        rows = []
        async for doc in self.collection.find(query or {}):
            doc['_id'] = str(doc['_id'])
            rows.append(doc)
        return rows

    async def get(self, item_id: str):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        doc = await self.collection.find_one({'_id': key})
        if doc:
            doc['_id'] = str(doc['_id'])
        return doc

    async def create(self, data: dict):
        result = await self.collection.insert_one(data)
        return await self.get(str(result.inserted_id))

    async def update(self, item_id: str, data: dict):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        await self.collection.update_one({'_id': key}, {'$set': data})
        return await self.get(item_id)

    async def delete(self, item_id: str):
        try:
            key = ObjectId(item_id)
        except Exception:
            key = item_id
        result = await self.collection.delete_one({'_id': key})
        return result.deleted_count > 0
''',
r"app/routes/auth.py": '''
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from jose import JWTError, jwt

from app.auth.dependencies import issue_token_pair
from app.auth.security import hash_password, verify_password
from app.config.settings import settings
from app.database.mongo import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenPair, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.common import MessageResponse

router = APIRouter()


@router.post('/register', response_model=MessageResponse)
async def register(payload: RegisterRequest):
    db = get_db()
    if await db.users.find_one({'email': payload.email}):
        raise HTTPException(status_code=400, detail='Email already registered')
    await db.users.insert_one({
        '_id': str(uuid4()),
        'name': payload.name,
        'email': payload.email,
        'password': hash_password(payload.password),
        'role': payload.role.value,
        'created_at': datetime.utcnow(),
        'refresh_tokens': [],
    })
    return {'message': 'User registered successfully'}


@router.post('/login', response_model=TokenPair)
async def login(payload: LoginRequest):
    db = get_db()
    user = await db.users.find_one({'email': payload.email})
    if not user or not verify_password(payload.password, user['password']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    access, refresh = issue_token_pair(user['_id'])
    await db.users.update_one({'_id': user['_id']}, {'$push': {'refresh_tokens': refresh}})
    return {'access_token': access, 'refresh_token': refresh, 'token_type': 'bearer'}


@router.post('/refresh', response_model=TokenPair)
async def refresh(payload: RefreshRequest):
    db = get_db()
    try:
        claims = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail='Invalid refresh token') from exc
    if claims.get('type') != 'refresh':
        raise HTTPException(status_code=401, detail='Invalid token type')
    user_id = claims.get('sub')
    user = await db.users.find_one({'_id': user_id, 'refresh_tokens': payload.refresh_token})
    if not user:
        raise HTTPException(status_code=401, detail='Refresh token not found')
    access, refresh_token = issue_token_pair(user_id)
    await db.users.update_one({'_id': user_id}, {'$pull': {'refresh_tokens': payload.refresh_token}, '$push': {'refresh_tokens': refresh_token}})
    return {'access_token': access, 'refresh_token': refresh_token, 'token_type': 'bearer'}


@router.post('/logout', response_model=MessageResponse)
async def logout(payload: RefreshRequest):
    await get_db().users.update_many({}, {'$pull': {'refresh_tokens': payload.refresh_token}})
    return {'message': 'Logged out successfully'}


@router.post('/forgot-password', response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    token = issue_token_pair(payload.email)[1]
    await get_db().password_resets.insert_one({'email': payload.email, 'token': token, 'created_at': datetime.utcnow()})
    return {'message': 'Reset token generated'}


@router.post('/reset-password', response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest):
    db = get_db()
    record = await db.password_resets.find_one({'token': payload.token})
    if not record:
        raise HTTPException(status_code=400, detail='Invalid reset token')
    await db.users.update_one({'email': record['email']}, {'$set': {'password': hash_password(payload.new_password)}})
    await db.password_resets.delete_one({'token': payload.token})
    return {'message': 'Password updated successfully'}
''',
r"app/routes/students.py": '''
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import require_roles
from app.models.user import UserRole
from app.schemas.student import StudentCreate, StudentUpdate
from app.services.crud_service import CRUDService

router = APIRouter()
service = CRUDService('students')


@router.get('')
async def list_students(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    return await service.list()


@router.get('/search')
async def search_students(q: str = Query(default=''), _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    if not q:
        return await service.list()
    return await service.list({'name': {'$regex': q, '$options': 'i'}})


@router.get('/risk-level')
async def risk_levels(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    students = await service.list()
    for s in students:
        score = (100 - s.get('attendance', 0)) * 0.6 + (4 - s.get('gpa', 0)) * 10
        s['risk_level'] = 'high' if score > 50 else 'medium' if score > 30 else 'low'
    return students


@router.get('/performance')
async def performance(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    students = await service.list()
    return [{'student_id': s['student_id'], 'name': s['name'], 'gpa': s.get('gpa', 0), 'attendance': s.get('attendance', 0)} for s in students]


@router.get('/{student_id}')
async def get_student(student_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    student = await service.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    return student


@router.post('')
async def create_student(payload: StudentCreate, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    return await service.create(payload.model_dump())


@router.put('/{student_id}')
async def update_student(student_id: str, payload: StudentUpdate, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    updated = await service.update(student_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail='Student not found')
    return updated


@router.delete('/{student_id}')
async def delete_student(student_id: str, _=Depends(require_roles(UserRole.admin))):
    ok = await service.delete(student_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Student not found')
    return {'message': 'Student deleted'}
''',
r"app/routes/minimal_other.py": "from fastapi import APIRouter\nteachers=APIRouter()\ncourses=APIRouter()\nattendance=APIRouter()\ndatasets=APIRouter()\nml=APIRouter()\ndashboard=APIRouter()\nanalytics=APIRouter()\nreports=APIRouter()\nfeedback=APIRouter()\nsystem=APIRouter()\n",
r"app/routes/__init__.py": "from . import auth, students\nfrom .minimal_other import teachers, courses, attendance, datasets, ml, dashboard, analytics, reports, feedback, system\n",
r"app/middleware/rate_limit.py": "import time\nfrom collections import defaultdict, deque\nfrom fastapi import Request\nfrom starlette.middleware.base import BaseHTTPMiddleware\nfrom starlette.responses import JSONResponse\nclass RateLimitMiddleware(BaseHTTPMiddleware):\n    def __init__(self, app, requests_per_minute: int = 120):\n        super().__init__(app); self.requests_per_minute=requests_per_minute; self.requests=defaultdict(deque)\n    async def dispatch(self, request: Request, call_next):\n        ip=request.client.host if request.client else 'unknown'; now=time.time(); q=self.requests[ip]\n        while q and now-q[0]>60: q.popleft()\n        if len(q)>=self.requests_per_minute: return JSONResponse({'detail':'Rate limit exceeded'},status_code=429)\n        q.append(now); return await call_next(request)\n",
r"app/middleware/security_headers.py": "from fastapi import Request\nfrom starlette.middleware.base import BaseHTTPMiddleware\nclass SecurityHeadersMiddleware(BaseHTTPMiddleware):\n    async def dispatch(self, request: Request, call_next):\n        response = await call_next(request)\n        response.headers['X-Content-Type-Options']='nosniff'\n        response.headers['X-Frame-Options']='DENY'\n        response.headers['Referrer-Policy']='strict-origin-when-cross-origin'\n        response.headers['Content-Security-Policy'] = \"default-src 'self'\"\n        return response\n",
r"app/websocket/manager.py": "from fastapi import WebSocket\nclass ConnectionManager:\n    def __init__(self): self.active_connections=[]\n    async def connect(self, websocket: WebSocket): await websocket.accept(); self.active_connections.append(websocket)\n    def disconnect(self, websocket: WebSocket):\n        if websocket in self.active_connections: self.active_connections.remove(websocket)\n    async def broadcast(self, message: dict):\n        for c in self.active_connections: await c.send_json(message)\nmanager=ConnectionManager()\n",
r"app/websocket/alerts.py": "from fastapi import APIRouter, WebSocket, WebSocketDisconnect\nfrom app.websocket.manager import manager\nrouter=APIRouter()\n@router.websocket('/ws/alerts')\nasync def alerts_socket(websocket: WebSocket):\n    await manager.connect(websocket)\n    try:\n        while True: await websocket.receive_text()\n    except WebSocketDisconnect:\n        manager.disconnect(websocket)\n",
r"app/core/celery_app.py": "from celery import Celery\nfrom app.config.settings import settings\ncelery_app = Celery('edupredict', broker=settings.redis_url, backend=settings.redis_url)\n",
r"app/tasks.py": "from app.core.celery_app import celery_app\n@celery_app.task\ndef send_system_alert(message: str):\n    return {'status': 'sent', 'message': message}\n",
r"app/utils/seeder.py": "import asyncio\nfrom app.database.mongo import connect_to_mongo, close_mongo_connection\nasync def seed():\n    await connect_to_mongo(); print('Seeder template ready'); await close_mongo_connection()\nif __name__ == '__main__': asyncio.run(seed())\n",
r"tests/test_health.py": "from fastapi.testclient import TestClient\nfrom app.main import app\nclient=TestClient(app)\ndef test_health():\n    r=client.get('/health'); assert r.status_code==200\n",
r"tests/test_auth_schema.py": "from app.schemas.auth import RegisterRequest\ndef test_schema():\n    p = RegisterRequest(name='Demo User', email='demo@example.com', password='Password123', role='Admin')\n    assert p.email == 'demo@example.com'\n",
r"datasets/sample_students.csv": "student_id,name,course,semester,attendance,gpa\nSTU-1,John Doe,Data Science,3,85,3.4\nSTU-2,Jane Smith,AI,5,91,3.8\n",
r"trained_models/.gitkeep": "",
r"requirements.txt": "fastapi\nuvicorn[standard]\npydantic>=2\npydantic-settings\npython-dotenv\nmotor\npymongo\npython-jose[cryptography]\nbcrypt\npandas\nnumpy\nscikit-learn\njoblib\nhdfs\npyarrow\ncelery\nredis\nreportlab\nopenpyxl\nfaker\nloguru\npython-multipart\npsutil\npytest\nhttpx\nbson\n",
r"Dockerfile": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n",
r"docker-compose.yml": "services:\n  backend:\n    build: .\n    ports:\n      - '8000:8000'\n    env_file:\n      - .env\n    depends_on:\n      - mongodb\n      - redis\n  mongodb:\n    image: mongo:7\n    ports:\n      - '27017:27017'\n  redis:\n    image: redis:7\n    ports:\n      - '6379:6379'\n",
r".env.example": "APP_NAME=EduPredict\nENVIRONMENT=development\nSECRET_KEY=please-change-this-secret\nALGORITHM=HS256\nACCESS_TOKEN_EXPIRE_MINUTES=30\nREFRESH_TOKEN_EXPIRE_DAYS=7\nMONGO_URI=mongodb://mongodb:27017\nMONGO_DB=edupredict\nREDIS_URL=redis://redis:6379/0\nHDFS_HOST=localhost\nHDFS_PORT=9870\nHDFS_USER=hdfs\nHDFS_BASE_PATH=/edupredict\nSMTP_HOST=localhost\nSMTP_PORT=1025\nSMTP_USER=\nSMTP_PASSWORD=\nSMTP_FROM=no-reply@edupredict.local\nRATE_LIMIT_PER_MINUTE=120\n",
r"README.md": "# EduPredict Backend\n\nFastAPI backend generated for EduPredict with JWT auth, RBAC, student CRUD and modular structure.\n\n## Run\n\n```bash\ncd backend\npython -m venv .venv\n.venv\\Scripts\\activate\npip install -r requirements.txt\ncopy .env.example .env\nuvicorn app.main:app --reload\n```\n"
}
for rel, content in files.items():
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(textwrap.dedent(content).lstrip('\n'))
for rel in ['app/config/__init__.py','app/database/__init__.py','app/auth/__init__.py','app/models/__init__.py','app/schemas/__init__.py','app/services/__init__.py','app/ml/__init__.py','app/hadoop/__init__.py','app/reports/__init__.py','app/websocket/__init__.py','app/notifications/__init__.py','app/analytics/__init__.py','app/middleware/__init__.py','app/utils/__init__.py','app/core/__init__.py']:
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p,'w').close()
print('Backend generated')
