from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config.settings import settings
from app.database.mongo import connect_to_mongo, close_mongo_connection
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routes import auth, students, teachers, courses, attendance, datasets, ml, analytics, dashboard, feedback, reports, system, alerts_router, hdfs_router
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
app.include_router(teachers, prefix='/api/teachers', tags=['Teachers'])
app.include_router(courses, prefix='/api/courses', tags=['Courses'])
app.include_router(attendance, prefix='/api/attendance', tags=['Attendance'])
app.include_router(datasets, prefix='/api/datasets', tags=['Datasets'])
app.include_router(ml, prefix='/api/ml', tags=['ML'])
app.include_router(dashboard, prefix='/api/dashboard', tags=['Dashboard'])
app.include_router(analytics, prefix='/api/analytics', tags=['Analytics'])
app.include_router(reports, prefix='/api/reports', tags=['Reports'])
app.include_router(feedback, prefix='/api/feedback', tags=['Feedback'])
app.include_router(alerts_router, prefix='/api/alerts', tags=['Alerts'])
app.include_router(hdfs_router, prefix='/api/hdfs', tags=['HDFS'])
app.include_router(system, prefix='/api/system', tags=['System'])
app.include_router(websocket_router)


@app.get('/health')
async def health_check():
    return {'status': 'ok', 'service': 'EduPredict backend'}
