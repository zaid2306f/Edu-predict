# EduPredict — Big Data Educational Analytics Platform

Aptech eProject: Hadoop-powered predictive analytics for student performance, dropout risk, course demand, and institutional dashboards.

## Problem Statement

Education institutions face declining retention, inefficient resource allocation, and the need to personalize learning. **EduPredict** addresses these challenges using **MongoDB**, **HDFS**, **machine learning**, and **real-time dashboards**.

## Features (per eProject Specification)

| Requirement | Implementation |
|-------------|----------------|
| **User Authentication & RBAC** | JWT auth with Admin, Teacher, Student, Analyst roles |
| **Data Ingestion** | Upload CSV, Excel, JSON datasets; cleansing & HDFS storage |
| **Data Storage** | MongoDB + Hadoop HDFS (`/edupredict`) |
| **Data Processing** | Pandas cleansing, parallel analytics queries |
| **Real-time Processing** | WebSocket alerts (`/ws/alerts`), threshold scanning |
| **ML Models** | Performance, dropout, course demand, anomaly detection (scikit-learn) |
| **Data Visualization** | Executive dashboard, attendance, predictions, Hadoop analytics |
| **Notifications & Alerts** | Alert center, threshold scan, WebSocket push, mark-read |
| **Feedback & Support** | Feedback, support tickets, history |
| **System Monitoring** | CPU/RAM/disk, MongoDB/Redis/HDFS health checks |
| **Reports** | PDF/Excel export, performance reports |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TanStack Query, Recharts
- **Backend:** FastAPI, Python 3.11+, MongoDB, Redis, Celery
- **ML:** scikit-learn, joblib
- **Big Data:** HDFS (hdfs Python client), Pandas

## Hardware / Software Requirements

- Windows 10+ (64-bit), 16 GB RAM recommended
- Python 3.11+, Node.js 18+
- MongoDB, Redis (Docker or local)
- Hadoop HDFS (optional — degrades gracefully if unavailable)

## Hadoop HDFS (Docker) — Required

EduPredict stores **all datasets on HDFS**. MongoDB holds metadata only.

### Start Hadoop cluster

```bash
cd backend
docker compose up -d namenode datanode
# Wait ~60s for NameNode health, then init runs automatically on full stack
docker compose up hdfs-init
```

**NameNode Web UI:** http://localhost:9870

### Verify HDFS

```bash
docker exec edupredict-namenode hdfs dfs -ls /edupredict
```

You should see: `students.csv`, `attendance.csv`, `academic_records.csv`, `courses.csv`

**NameNode Web UI:** http://localhost:9870/dfshealth.html

### How Hadoop is used (100%)

| Step | What happens |
|------|----------------|
| **Upload** | Dataset cleansed → stored on HDFS `/edupredict` → batch processed by HadoopProcessor |
| **Seeder** | Exports all MongoDB collections to CSV on HDFS |
| **Analytics** | Live metrics from NameNode JMX + HDFS file browser |
| **Delete** | Removes file from HDFS and MongoDB metadata |
| **API** | `GET /api/hdfs/files`, `GET /api/hdfs/cluster`, `POST /api/hdfs/process/{id}` |

Upload **requires** Hadoop running — uploads fail with a clear error if HDFS is down.

```bash
.venv\Scripts\activate
python -m app.utils.seeder
```

This exports students, attendance, courses, and academic records to `/edupredict` on HDFS.

### Full stack (MongoDB + Redis + Hadoop + Backend)

```bash
docker compose up -d
```

## Quick Start (local dev)

### 1. Start MongoDB & Redis

```bash
cd backend
docker compose up -d mongodb redis
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m app.utils.seeder
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@edupredict.com | Admin@1234 |
| Teacher | teacher@edupredict.com | Teacher@1234 |
| Student | student@edupredict.com | Student@1234 |
| Analyst | analyst@edupredict.com | Analyst@1234 |

## Project Structure

```
EduPredict/
├── backend/          # FastAPI API, ML models, HDFS, WebSockets
│   ├── app/
│   │   ├── routes/   # Auth, students, teachers, courses, ML, analytics
│   │   ├── ml/       # ML training & prediction
│   │   ├── hadoop/   # HDFS service
│   │   └── websocket/# Real-time alerts
│   └── tests/
├── frontend/         # React dashboard UI
└── README.md
```

## API Overview

- `POST /api/auth/login` — Authentication
- `GET /api/dashboard/overview` — KPIs
- `GET/POST/PUT/DELETE /api/students` — Student CRUD
- `GET/POST/PUT/DELETE /api/teachers` — Teacher CRUD
- `GET/POST/PUT/DELETE /api/courses` — Course CRUD
- `POST /api/datasets/upload` — Data ingestion
- `POST /api/ml/*/predict` — ML predictions
- `GET /api/analytics/*` — Charts & Hadoop metrics
- `GET/POST /api/alerts` — Notifications
- `WS /ws/alerts` — Real-time alert stream

## Project Deliverables Checklist

- [x] Problem definition & functional requirements
- [x] Source code (frontend + backend)
- [x] Test data seeder (1000 students, 100 teachers, 50 courses)
- [x] Installation instructions (this README)
- [ ] Project report (PDF) — document diagrams & test cases
- [ ] Demo video — record walkthrough of all modules

## Assumptions

- HDFS is optional; uploads store metadata in MongoDB even if HDFS is down
- Celery worker is optional for async alerts; WebSocket broadcast works synchronously
- Demo users are re-seeded on each `python -m app.utils.seeder` run
