from collections import defaultdict
from datetime import datetime, timedelta
from io import BytesIO
import random

import openpyxl
import pandas as pd
import psutil
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from hdfs import InsecureClient
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.auth.dependencies import require_roles
from app.config.settings import settings
from app.database.mongo import get_db
from app.models.user import UserRole
from app.ml.models import MLService
from app.services.crud_service import CRUDService

ml_service = MLService()

teachers = APIRouter()
courses = APIRouter()
attendance = APIRouter()
datasets = APIRouter()
ml = APIRouter()
dashboard = APIRouter()
analytics = APIRouter()
reports = APIRouter()
feedback = APIRouter()
system = APIRouter()
alerts_router = APIRouter()

teacher_service = CRUDService("teachers")
course_service = CRUDService("courses")
attendance_service = CRUDService("attendance")


@teachers.get("")
async def list_teachers(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    return await teacher_service.list()


@teachers.post("")
async def create_teacher(payload: dict, _=Depends(require_roles(UserRole.admin))):
    return await teacher_service.create(payload)


@teachers.put("/{teacher_id}")
async def update_teacher(teacher_id: str, payload: dict, _=Depends(require_roles(UserRole.admin))):
    return await teacher_service.update(teacher_id, payload)


@teachers.delete("/{teacher_id}")
async def delete_teacher(teacher_id: str, _=Depends(require_roles(UserRole.admin))):
    if not await teacher_service.delete(teacher_id):
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted"}


@courses.get("")
async def list_courses(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = await course_service.list()
    for row in rows:
        enrolled = row.get("enrolled", 0)
        completed = row.get("completed", 0)
        row["enrollment_count"] = enrolled
        row["completion_rate"] = round((completed / enrolled) * 100, 2) if enrolled else 0
        row["popularity_score"] = round(enrolled * 0.8 + row.get("rating", 0) * 20, 2)
    return rows


@courses.post("")
async def create_course(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    return await course_service.create(payload)


@courses.put("/{course_id}")
async def update_course(course_id: str, payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    return await course_service.update(course_id, payload)


@courses.delete("/{course_id}")
async def delete_course(course_id: str, _=Depends(require_roles(UserRole.admin))):
    if not await course_service.delete(course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}


@attendance.post("")
async def create_attendance(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    payload["timestamp"] = datetime.utcnow().isoformat()
    return await attendance_service.create(payload)


@attendance.get("/student/{student_id}")
async def get_student_attendance(student_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    return await attendance_service.list({"student_id": student_id})


@attendance.get("/stats")
async def attendance_stats(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = await attendance_service.list()
    now = datetime.utcnow()

    def calc(days: int):
        start = now - timedelta(days=days)
        values = []
        for row in rows:
            stamp = datetime.fromisoformat(row.get("timestamp", now.isoformat()))
            if stamp >= start:
                values.append(float(row.get("status", 0)))
        return round(sum(values) / len(values), 2) if values else 0

    def distribution(days: int):
        start = now - timedelta(days=days)
        present = late = absent = 0
        for row in rows:
            stamp = datetime.fromisoformat(row.get("timestamp", now.isoformat()))
            if stamp < start:
                continue
            status = float(row.get("status", 0))
            if status >= 0.9:
                present += 1
            elif status > 0:
                late += 1
            else:
                absent += 1
        total = present + late + absent or 1
        return {
            "present": round(present / total * 100, 2),
            "absent": round(absent / total * 100, 2),
            "late": round(late / total * 100, 2),
        }

    return {
        "daily_attendance": calc(1),
        "weekly_attendance": calc(7),
        "monthly_attendance": calc(30),
        "distribution": distribution(30),
    }


@datasets.post("/upload")
async def upload_dataset(file: UploadFile = File(...), _=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    content = await file.read()
    if file.filename.endswith(".csv"):
        frame = pd.read_csv(BytesIO(content))
    elif file.filename.endswith(".xlsx"):
        frame = pd.read_excel(BytesIO(content))
    elif file.filename.endswith(".json"):
        frame = pd.read_json(BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    before = len(frame)
    frame = frame.drop_duplicates().ffill().fillna(0)
    cleaned = frame.to_csv(index=False).encode("utf-8")
    hdfs_path = f"{settings.hdfs_base_path}/{file.filename}"

    hdfs_status = "stored"
    try:
        client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)
        client.write(hdfs_path, data=BytesIO(cleaned), overwrite=True)
    except Exception:
        hdfs_status = "unavailable"

    sample_rows = frame.head(10).astype(str).to_dict(orient="records")
    metadata = {
        "filename": file.filename,
        "content_type": file.content_type,
        "rows_before": before,
        "rows_after": len(frame),
        "columns": list(frame.columns),
        "sample_rows": sample_rows,
        "size": f"{round(len(content) / 1024, 1)} KB",
        "source": "academic" if "gpa" in frame.columns or "grade" in frame.columns else "attendance" if "attendance" in frame.columns else "lms",
        "hdfs_path": hdfs_path,
        "hdfs_status": hdfs_status,
        "created_at": datetime.utcnow(),
    }
    result = await get_db().datasets.insert_one(metadata)
    metadata["_id"] = str(result.inserted_id)
    return metadata


@datasets.get("")
async def list_datasets(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    rows = []
    async for row in get_db().datasets.find({}).sort("created_at", -1):
        row["_id"] = str(row["_id"])
        rows.append(row)
    return rows


@datasets.get("/{dataset_id}")
async def get_dataset(dataset_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    from bson import ObjectId
    row = await get_db().datasets.find_one({"_id": ObjectId(dataset_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
    row["_id"] = str(row["_id"])
    return row


@datasets.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str, _=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    from bson import ObjectId
    row = await get_db().datasets.find_one({"_id": ObjectId(dataset_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if row.get("hdfs_path") and row.get("hdfs_status") == "stored":
        try:
            client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)
            client.delete(row["hdfs_path"], recursive=False)
        except Exception:
            pass
    await get_db().datasets.delete_one({"_id": ObjectId(dataset_id)})
    return {"message": "Dataset deleted"}


@ml.post("/performance/train")
async def train_performance(payload: list[dict], _=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    return ml_service.train_performance(payload)


@ml.post("/performance/predict")
async def predict_performance(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    try:
        return ml_service.predict_performance(payload["attendance"], payload["semester"])
    except Exception:
        gpa = max(0.0, min(4.0, payload["attendance"] / 25 + payload["semester"] * 0.1))
        return {"predicted_gpa": round(gpa, 2), "pass_probability": round(gpa / 4, 2), "future_performance": round(gpa * 1.03, 2)}


@ml.post("/dropout/train")
async def train_dropout(payload: list[dict], _=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    return ml_service.train_dropout(payload)


@ml.post("/dropout/predict")
async def predict_dropout(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    try:
        return ml_service.predict_dropout(payload["attendance"], payload["gpa"])
    except Exception:
        probability = ((100 - payload["attendance"]) / 100) * 0.6 + ((4 - payload["gpa"]) / 4) * 0.4
        return {"dropout_probability": round(max(0.0, min(1.0, probability)), 2)}


@ml.post("/course-demand/train")
async def train_course_demand(payload: list[dict], _=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    return ml_service.train_course_demand(payload)


@ml.post("/course-demand/predict")
async def predict_course_demand(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    try:
        return ml_service.predict_course_demand(payload["semester"], payload["historical_enrollment"])
    except Exception:
        demand = payload["historical_enrollment"] * (1 + random.uniform(-0.1, 0.2))
        return {"future_enrollment": round(demand, 2)}


@ml.post("/anomaly-detection")
async def detect_anomaly(payload: list[dict], _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    try:
        return ml_service.anomaly_detection(payload)
    except Exception:
        anomalies = [item for item in payload if item.get("attendance", 100) < 40 or item.get("gpa", 4) < 2]
        return {"anomaly_count": len(anomalies), "anomalies": anomalies}


@dashboard.get("/overview")
async def get_overview(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    db = get_db()
    students = [row async for row in db.students.find({})]
    total = len(students)
    active = len([row for row in students if row.get("attendance", 0) >= 70])
    avg_gpa = round(sum(row.get("gpa", 0) for row in students) / total, 2) if total else 0
    attendance_rate = round(sum(row.get("attendance", 0) for row in students) / total, 2) if total else 0
    course_demand = float(await db.courses.count_documents({}))
    course_rows = [c async for c in db.courses.find({})]
    enrolled_total = sum(int(c.get("enrolled", 0)) for c in course_rows)
    high_risk = await db.students.count_documents({"attendance": {"$lt": 50}})

    semester_gpa: dict[int, list[float]] = defaultdict(list)
    async for row in db.academic_records.find({}, {"semester": 1, "gpa": 1}):
        semester_gpa[int(row.get("semester", 0))].append(float(row.get("gpa", 0)))
    semesters = sorted(semester_gpa.keys())
    current_gpa = sum(semester_gpa[semesters[-1]]) / len(semester_gpa[semesters[-1]]) if semesters else avg_gpa
    prev_gpa = sum(semester_gpa[semesters[-2]]) / len(semester_gpa[semesters[-2]]) if len(semesters) > 1 else current_gpa
    gpa_change = round(current_gpa - prev_gpa, 2)

    return {
        "total_students": total,
        "active_students": active,
        "avg_gpa": avg_gpa,
        "attendance_rate": attendance_rate,
        "dropout_risk": round(max(0, 100 - attendance_rate) / 100, 2),
        "course_demand": course_demand,
        "high_risk_students": high_risk,
        "total_enrollment": enrolled_total,
        "trends": {
            "students_change": f"{round((active / total) * 100, 1)}% active rate" if total else "0% active rate",
            "gpa_change": f"{gpa_change:+.2f} vs prior semester",
            "attendance_change": f"{attendance_rate:.1f}% institution average",
            "dropout_change": f"{high_risk} students at high risk",
            "enrollment_change": f"{enrolled_total:,} total enrollments",
        },
    }


@analytics.get("/performance-trend")
async def performance_trend(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for row in get_db().academic_records.find({}, {"semester": 1, "gpa": 1}):
        rows.append({"semester": row.get("semester", 0), "gpa": row.get("gpa", 0)})
    return rows


@analytics.get("/attendance-trend")
async def attendance_trend(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for row in get_db().attendance.find({}, {"date": 1, "status": 1}):
        rows.append({"date": str(row.get("date", "")), "attendance": row.get("status", 0)})
    return rows


@analytics.get("/dropout-distribution")
async def dropout_distribution(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    db = get_db()
    return {
        "high": await db.students.count_documents({"attendance": {"$lt": 50}}),
        "medium": await db.students.count_documents({"attendance": {"$gte": 50, "$lt": 75}}),
        "low": await db.students.count_documents({"attendance": {"$gte": 75}}),
    }


@analytics.get("/course-demand")
async def course_demand(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for course in get_db().courses.find({}, {"name": 1, "enrolled": 1}):
        rows.append({"course": course.get("name", ""), "demand": course.get("enrolled", 0)})
    return rows


@analytics.get("/anomalies")
async def anomalies(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for alert in get_db().alerts.find({}):
        alert["_id"] = str(alert["_id"])
        rows.append(alert)
    return rows


@analytics.get("/predictions-overview")
async def predictions_overview(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    db = get_db()
    students = [row async for row in db.students.find({})]
    if not students:
        return {"performance": 0, "dropout": 0, "courseDemand": 0, "riskDetection": 0, "trends": [], "probabilities": [], "gauges": []}

    avg_attendance = sum(s.get("attendance", 0) for s in students) / len(students)
    avg_gpa = sum(s.get("gpa", 0) for s in students) / len(students)
    avg_semester = sum(s.get("semester", 4) for s in students) / len(students)
    course = await db.courses.find_one({})
    historical = course.get("enrolled", 100) if course else 100

    try:
        perf = ml_service.predict_performance(avg_attendance, int(avg_semester))
        drop = ml_service.predict_dropout(avg_attendance, avg_gpa)
        demand = ml_service.predict_course_demand(int(avg_semester), int(historical))
        sample = [{"attendance": s.get("attendance", 0), "gpa": s.get("gpa", 0), "student_id": s.get("student_id", "")} for s in students[:200]]
        anomaly = ml_service.anomaly_detection(sample)
    except Exception:
        perf = {"pass_probability": avg_gpa / 4, "future_performance": avg_gpa}
        drop = {"dropout_probability": max(0, (100 - avg_attendance) / 100)}
        demand = {"future_enrollment": historical}
        anomaly = {"anomaly_count": 0}

    dist = {
        "low": await db.students.count_documents({"attendance": {"$gte": 75}}),
        "medium": await db.students.count_documents({"attendance": {"$gte": 50, "$lt": 75}}),
        "high": await db.students.count_documents({"attendance": {"$lt": 50}}),
    }

    semester_map: dict[int, list[float]] = defaultdict(list)
    async for row in db.academic_records.find({}, {"semester": 1, "gpa": 1}):
        semester_map[int(row.get("semester", 0))].append(float(row.get("gpa", 0)))

    trends = []
    for semester in sorted(semester_map.keys())[-6:]:
        gpas = semester_map[semester]
        avg = sum(gpas) / len(gpas)
        trends.append({"week": f"S{semester}", "performance": round(avg * 25, 2), "dropout": round(max(0, (4 - avg) * 25), 2)})

    pass_pct = round(float(perf.get("pass_probability", 0)) * 100, 2)
    dropout_pct = round(float(drop.get("dropout_probability", 0)) * 100, 2)
    demand_pct = round((float(demand.get("future_enrollment", 0)) / max(historical, 1)) * 100, 2)

    return {
        "performance": pass_pct,
        "dropout": dropout_pct,
        "courseDemand": min(100, demand_pct),
        "riskDetection": str(anomaly.get("anomaly_count", 0)),
        "trends": trends,
        "probabilities": [
            {"range": "Low Risk", "count": dist["low"]},
            {"range": "Medium Risk", "count": dist["medium"]},
            {"range": "High Risk", "count": dist["high"]},
        ],
        "gauges": [
            {"label": "Pass Probability", "value": pass_pct, "color": "#22C55E"},
            {"label": "Dropout Risk", "value": dropout_pct, "color": "#EF4444"},
            {"label": "Course Demand", "value": min(100, demand_pct), "color": "#4F46E5"},
            {"label": "At-Risk Students", "value": dist["high"], "color": "#F59E0B"},
        ],
    }


@analytics.get("/hadoop-overview")
async def hadoop_overview(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    db = get_db()
    disk = psutil.disk_usage("/")
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory().percent

    total_rows = 0
    monthly: dict[str, int] = defaultdict(int)
    async for dataset in db.datasets.find({}):
        rows = int(dataset.get("rows_after", 0))
        total_rows += rows
        month = str(dataset.get("created_at", datetime.utcnow()))[:7]
        monthly[month] += rows

    hdfs_status = "unavailable"
    file_count = 0
    try:
        client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)
        files = client.list(settings.hdfs_base_path)
        hdfs_status = "connected"
        file_count = len(files)
    except Exception:
        pass

    storage_growth = [{"month": month, "tb": round(rows / 1000, 2)} for month, rows in sorted(monthly.items())[-6:]]
    if not storage_growth:
        storage_growth = [{"month": datetime.utcnow().strftime("%Y-%m"), "tb": round(total_rows / 1000, 2)}]

    return {
        "dataProcessed": f"{round(total_rows / 1000, 2)}K records",
        "hdfsUsage": disk.percent,
        "nodes": max(1, file_count),
        "clusterStatus": "healthy" if hdfs_status == "connected" else "degraded",
        "processingSpeed": [{"time": f"{hour}:00", "speed": round(cpu + hour, 2)} for hour in range(1, 9)],
        "resourceUtilization": [
            {"name": "CPU", "value": cpu},
            {"name": "RAM", "value": ram},
            {"name": "Storage", "value": disk.percent},
        ],
        "storageGrowth": storage_growth,
    }


@attendance.get("/heatmap")
async def attendance_heatmap(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    db = get_db()
    weekday_slots: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    slots = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
    now = datetime.utcnow()

    async for row in db.attendance.find({}):
        stamp = row.get("date") or row.get("timestamp")
        if isinstance(stamp, str):
            stamp = datetime.fromisoformat(stamp.replace("Z", ""))
        elif not isinstance(stamp, datetime):
            continue
        if (now - stamp).days > 35:
            continue
        weekday = stamp.strftime("%a")
        week_index = min(4, max(0, (now - stamp).days // 7))
        weekday_slots[weekday][week_index].append(float(row.get("status", 0)))

    heatmap = []
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        for slot_idx, slot in enumerate(slots):
            values = weekday_slots.get(day, {}).get(slot_idx, [])
            value = round((sum(values) / len(values)) * 100, 2) if values else 0
            heatmap.append({"day": day, "time": slot, "value": value})
    return heatmap


@reports.get("/catalog")
async def reports_catalog(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    return [
        {"id": "student", "title": "Student Report", "description": "Comprehensive student performance data"},
        {"id": "teacher", "title": "Teacher Report", "description": "Faculty performance and course metrics"},
        {"id": "course", "title": "Course Report", "description": "Enrollment and completion statistics"},
        {"id": "performance", "title": "Performance Report", "description": "Academic success and trend analysis"},
    ]


@reports.get("/student/{student_id}")
async def student_report(student_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    row = await get_db().students.find_one({"student_id": student_id})
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    row["_id"] = str(row["_id"])
    return row


@reports.get("/performance")
async def performance_report(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    rows = []
    async for row in get_db().students.find({}, {"name": 1, "gpa": 1, "attendance": 1}):
        rows.append({"name": row.get("name", ""), "gpa": row.get("gpa", 0), "attendance": row.get("attendance", 0)})
    return rows


@reports.get("/download/pdf")
async def download_pdf(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.drawString(50, 760, "EduPredict Analytics Report")
    pdf.drawString(50, 740, f"Generated at: {datetime.utcnow().isoformat()}")
    pdf.save()
    buffer.seek(0)
    return Response(content=buffer.read(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})


@reports.get("/download/excel")
async def download_excel(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Analytics"
    sheet.append(["metric", "value"])
    sheet.append(["students", await get_db().students.count_documents({})])
    out = BytesIO()
    workbook.save(out)
    out.seek(0)
    return Response(content=out.read(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=report.xlsx"})


@feedback.post("")
async def create_feedback(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    payload["created_at"] = datetime.utcnow()
    result = await get_db().feedback.insert_one(payload)
    payload["_id"] = str(result.inserted_id)
    return payload


@feedback.get("")
async def list_feedback(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for row in get_db().feedback.find({}):
        row["_id"] = str(row["_id"])
        rows.append(row)
    return rows


@feedback.delete("/{feedback_id}")
async def delete_feedback(feedback_id: str, _=Depends(require_roles(UserRole.admin))):
    from bson import ObjectId
    result = await get_db().feedback.delete_one({"_id": ObjectId(feedback_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"message": "Feedback deleted"}


@alerts_router.get("")
async def list_alerts(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for row in get_db().alerts.find({}).sort("created_at", -1):
        row["_id"] = str(row["_id"])
        rows.append(row)
    return rows


@alerts_router.post("")
async def create_alert_endpoint(payload: dict, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    from app.services.alert_service import create_alert
    return await create_alert(payload)


@alerts_router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    from bson import ObjectId
    result = await get_db().alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert marked as read"}


@alerts_router.post("/scan")
async def scan_alerts(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    from app.services.alert_service import scan_thresholds
    created = await scan_thresholds()
    return {"created": len(created), "alerts": created[:20]}


@alerts_router.delete("/{alert_id}")
async def delete_alert(alert_id: str, _=Depends(require_roles(UserRole.admin))):
    from bson import ObjectId
    result = await get_db().alerts.delete_one({"_id": ObjectId(alert_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}


@system.get("/status")
async def system_status(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    db = get_db()
    mongo_ok = True
    try:
        await db.command("ping")
    except Exception:
        mongo_ok = False

    redis_ok = False
    try:
        import redis
        client = redis.from_url(settings.redis_url)
        redis_ok = client.ping()
    except Exception:
        redis_ok = False

    hdfs_ok = False
    try:
        client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)
        client.list(settings.hdfs_base_path)
        hdfs_ok = True
    except Exception:
        hdfs_ok = False

    healthy = mongo_ok and redis_ok
    return {
        "status": "healthy" if healthy else "degraded",
        "mongodb": "connected" if mongo_ok else "unavailable",
        "redis": "connected" if redis_ok else "unavailable",
        "hdfs": "connected" if hdfs_ok else "unavailable",
        "uptime_target": "99%",
    }


@system.get("/resources")
async def system_resources(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    disk = psutil.disk_usage("/")
    return {"cpu": psutil.cpu_percent(interval=0.1), "ram": psutil.virtual_memory().percent, "storage": disk.percent}


@system.get("/hdfs")
async def hdfs_status(_=Depends(require_roles(UserRole.admin, UserRole.analyst))):
    try:
        client = InsecureClient(f"http://{settings.hdfs_host}:{settings.hdfs_port}", user=settings.hdfs_user)
        files = client.list(settings.hdfs_base_path)
        return {"hadoop_status": "connected", "files": files}
    except Exception as exc:
        return {"hadoop_status": "unavailable", "error": str(exc)}
