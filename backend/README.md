# EduPredict Backend

FastAPI backend for the EduPredict eProject.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m app.utils.seeder
uvicorn app.main:app --reload
```

## Optional: Celery Worker

```bash
celery -A app.core.celery_app worker --loglevel=info
```

## Environment Variables

See `.env.example` for MongoDB, Redis, HDFS, and SMTP settings.

## Tests

```bash
pytest tests/ -q
```
