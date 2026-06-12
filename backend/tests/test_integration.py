import httpx

BASE = "http://127.0.0.1:8000"

USERS = {
    "admin": ("admin@edupredict.com", "Admin@1234"),
    "teacher": ("teacher@edupredict.com", "Teacher@1234"),
    "student": ("student@edupredict.com", "Student@1234"),
    "analyst": ("analyst@edupredict.com", "Analyst@1234"),
}

ROLE_ENDPOINTS = {
    "admin": [
        ("GET", "/api/dashboard/overview"),
        ("GET", "/api/students"),
        ("GET", "/api/teachers"),
        ("GET", "/api/courses"),
        ("GET", "/api/datasets"),
        ("GET", "/api/system/hdfs"),
    ],
    "teacher": [
        ("GET", "/api/dashboard/overview"),
        ("GET", "/api/students"),
        ("GET", "/api/courses"),
        ("GET", "/api/attendance/stats"),
    ],
    "student": [
        ("GET", "/api/dashboard/overview"),
        ("GET", "/api/attendance/stats"),
        ("POST", "/api/ml/performance/predict", {"attendance": 80, "semester": 3}),
    ],
    "analyst": [
        ("GET", "/api/dashboard/overview"),
        ("GET", "/api/analytics/anomalies"),
        ("GET", "/api/datasets"),
        ("GET", "/api/system/resources"),
    ],
}


def login(client: httpx.Client, email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_health():
    with httpx.Client(base_url=BASE, timeout=30) as client:
        assert client.get("/health").status_code == 200


def test_all_role_logins():
    with httpx.Client(base_url=BASE, timeout=30) as client:
        for role, (email, password) in USERS.items():
            token = login(client, email, password)
            me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me.status_code == 200, f"{role} me failed: {me.text}"
            assert me.json()["email"] == email


def test_role_endpoint_access():
    with httpx.Client(base_url=BASE, timeout=60) as client:
        for role, endpoints in ROLE_ENDPOINTS.items():
            email, password = USERS[role]
            token = login(client, email, password)
            headers = {"Authorization": f"Bearer {token}"}
            for entry in endpoints:
                method, path = entry[0], entry[1]
                payload = entry[2] if len(entry) > 2 else None
                response = client.request(method, path, headers=headers, json=payload)
                assert response.status_code < 400, f"{role} {method} {path} -> {response.status_code} {response.text}"
