from celery import Celery
from app.config.settings import settings
celery_app = Celery('edupredict', broker=settings.redis_url, backend=settings.redis_url)
