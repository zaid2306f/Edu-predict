import asyncio
import random
from datetime import datetime, timedelta
from uuid import uuid4

import pandas as pd
from faker import Faker

from app.auth.security import hash_password
from app.database.mongo import close_mongo_connection, connect_to_mongo, get_db
from app.hadoop.hdfs_service import hdfs_service
from app.hadoop.processor import hadoop_processor
from app.ml.models import MLService

fake = Faker()

DEMO_USERS = [
    {"name": "Admin User", "email": "admin@edupredict.com", "password": "Admin@1234", "role": "Admin"},
    {"name": "Sarah Mitchell", "email": "teacher@edupredict.com", "password": "Teacher@1234", "role": "Teacher"},
    {"name": "Emma Wilson", "email": "student@edupredict.com", "password": "Student@1234", "role": "Student"},
    {"name": "Alex Rivera", "email": "analyst@edupredict.com", "password": "Analyst@1234", "role": "Analyst"},
]


async def ensure_demo_users(db):
    for user in DEMO_USERS:
        legacy_email = user["email"].replace(".com", ".local")
        await db.users.delete_many({"email": {"$in": [legacy_email, user["email"]]}})
        await db.users.insert_one(
            {
                "_id": str(uuid4()),
                "name": user["name"],
                "email": user["email"],
                "password": hash_password(user["password"]),
                "role": user["role"],
                "created_at": datetime.utcnow(),
                "refresh_tokens": [],
            }
        )
    print("Demo users ready:", ", ".join(u["email"] for u in DEMO_USERS))


async def seed_hdfs(db):
    """Export MongoDB collections to HDFS — primary data lake for EduPredict."""
    if not hdfs_service.is_connected():
        print("WARNING: Hadoop HDFS not running. Start with: docker compose up -d namenode datanode")
        return

    exports = {
        "students.csv": [doc async for doc in db.students.find({}, {"_id": 0})],
        "attendance.csv": [doc async for doc in db.attendance.find({}, {"_id": 0}).limit(5000)],
        "academic_records.csv": [doc async for doc in db.academic_records.find({}, {"_id": 0})],
        "courses.csv": [doc async for doc in db.courses.find({}, {"_id": 0})],
    }

    for filename, rows in exports.items():
        if not rows:
            continue

        frame = pd.DataFrame(rows)

        # Convert datetime columns to string before exporting
        for col in frame.columns:
            if str(frame[col].dtype).startswith("datetime"):
                frame[col] = frame[col].astype(str)

        path = hadoop_processor.export_dataframe_to_hdfs(filename, frame)
        stats = hadoop_processor.process_hdfs_file(path)

        await db.datasets.update_one(
            {"filename": filename},
            {
                "$set": {
                    "filename": filename,
                    "hdfs_path": path,
                    "hdfs_status": "stored",
                    "rows_after": len(frame),
                    "rows_before": len(frame),
                    "columns": list(frame.columns),
                    "hadoop_processed": True,
                    "batch_stats": stats,
                    "source": "academic",
                    "size": f"{round(len(frame) * 50 / 1024, 1)} KB",
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

        print(f"HDFS: uploaded {filename} ({len(frame)} rows) -> {path}")

    print("HDFS seed complete — all datasets stored in", hdfs_service.list_files())

async def seed():
    await connect_to_mongo()
    db = get_db()

    if await db.students.count_documents({}) == 0:
        teachers = [{"name": fake.name(), "email": fake.email(), "department": fake.word()} for _ in range(100)]
        await db.teachers.insert_many(teachers)

        courses = [
            {
                "name": f"Course {fake.word().title()}",
                "code": f"CRS{100 + i}",
                "enrolled": random.randint(30, 220),
                "completed": random.randint(20, 200),
                "rating": round(random.uniform(2, 5), 1),
                "instructor": random.choice(teachers)["name"],
            }
            for i in range(50)
        ]
        await db.courses.insert_many(courses)

        students = []
        records = []
        attendance_rows = []
        for idx in range(1000):
            student_id = f"STU-{1000 + idx}"
            gpa = round(random.uniform(1.8, 4.0), 2)
            attendance = round(random.uniform(45, 100), 2)
            semester = random.randint(1, 8)
            students.append(
                {
                    "student_id": student_id,
                    "name": fake.name(),
                    "course": random.choice(courses)["name"],
                    "semester": semester,
                    "attendance": attendance,
                    "gpa": gpa,
                }
            )
            records.append({"student_id": student_id, "semester": semester, "gpa": gpa, "created_at": datetime.utcnow()})
            for day in range(30):
                attendance_rows.append(
                    {
                        "student_id": student_id,
                        "date": datetime.utcnow() - timedelta(days=day),
                        "status": 1 if random.random() > 0.12 else 0,
                        "timestamp": (datetime.utcnow() - timedelta(days=day)).isoformat(),
                    }
                )

        await db.students.insert_many(students)
        await db.academic_records.insert_many(records)
        await db.attendance.insert_many(attendance_rows)

        alerts = []
        for student in [s for s in students if s["attendance"] < 60][:20]:
            alerts.append(
                {
                    "type": "Attendance Alert",
                    "message": f"{student['name']} attendance dropped to {student['attendance']}%",
                    "severity": "high",
                    "student_id": student["student_id"],
                    "created_at": datetime.utcnow(),
                }
            )
        for student in [s for s in students if s["gpa"] < 2.5][:15]:
            alerts.append(
                {
                    "type": "Academic Alert",
                    "message": f"{student['name']} GPA is {student['gpa']}",
                    "severity": "medium",
                    "student_id": student["student_id"],
                    "created_at": datetime.utcnow(),
                }
            )
        for student in [s for s in students if s["attendance"] < 55 and s["gpa"] < 2.8][:10]:
            alerts.append(
                {
                    "type": "Dropout Alert",
                    "message": f"High dropout risk for {student['name']}",
                    "severity": "high",
                    "student_id": student["student_id"],
                    "created_at": datetime.utcnow(),
                }
            )
        alerts.append(
            {
                "type": "System Alert",
                "message": "EduPredict analytics platform initialized successfully",
                "severity": "low",
                "created_at": datetime.utcnow(),
            }
        )
        await db.alerts.insert_many(alerts)

        ml = MLService()
        performance_rows = [{"attendance": s["attendance"], "semester": s["semester"], "gpa": s["gpa"]} for s in students]
        dropout_rows = [
            {"attendance": s["attendance"], "gpa": s["gpa"], "dropout": 1 if s["attendance"] < 60 or s["gpa"] < 2.5 else 0}
            for s in students
        ]
        demand_rows = [
            {
                "semester": random.randint(1, 8),
                "historical_enrollment": c["enrolled"],
                "future_enrollment": int(c["enrolled"] * random.uniform(0.95, 1.25)),
            }
            for c in courses
        ]
        ml.train_performance(performance_rows)
        ml.train_dropout(dropout_rows)
        ml.train_course_demand(demand_rows)

        print("Seed complete: 1000 students, 100 teachers, 50 courses, attendance, records, alerts, ML models.")
    else:
        print("Dataset already present, skipping bulk seed.")

    await ensure_demo_users(db)
    await seed_hdfs(db)
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed())
