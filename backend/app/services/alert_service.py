from datetime import datetime, timedelta

from app.database.mongo import get_db
from app.websocket.manager import manager


async def create_alert(alert: dict) -> dict:
    alert.setdefault("created_at", datetime.utcnow())
    alert.setdefault("read", False)
    alert.setdefault("severity", alert.get("severity", "warning"))
    result = await get_db().alerts.insert_one(alert)
    alert["_id"] = str(result.inserted_id)
    await manager.broadcast({"event": "alert", "data": alert})
    try:
        from app.tasks import send_system_alert
        send_system_alert.delay(alert.get("message", "New alert"))
    except Exception:
        pass
    return alert


async def scan_thresholds() -> list[dict]:
    db = get_db()
    created = []
    cutoff = datetime.utcnow() - timedelta(hours=24)

    at_risk = []
    async for student in db.students.find({}):
        attendance = float(student.get("attendance", 100))
        gpa = float(student.get("gpa", 4))
        score = (100 - attendance) * 0.6 + (4 - gpa) * 10
        if attendance < 50 or gpa < 2.5:
            at_risk.append((score, student))

    at_risk.sort(key=lambda item: item[0], reverse=True)
    for _, student in at_risk[:15]:
        student_id = student.get("student_id")
        recent = await db.alerts.find_one({"student_id": student_id, "created_at": {"$gte": cutoff}})
        if recent:
            continue
        attendance = float(student.get("attendance", 100))
        gpa = float(student.get("gpa", 4))
        if attendance < 50:
            alert = await create_alert(
                {
                    "type": "Attendance Alert",
                    "message": f"{student.get('name')} attendance is critically low at {attendance}%",
                    "severity": "high",
                    "student_id": student_id,
                    "category": "attendance",
                }
            )
            created.append(alert)
        elif gpa < 2.5:
            alert = await create_alert(
                {
                    "type": "Academic Risk Alert",
                    "message": f"{student.get('name')} GPA dropped to {gpa}",
                    "severity": "high",
                    "student_id": student_id,
                    "category": "academic",
                }
            )
            created.append(alert)
    return created
