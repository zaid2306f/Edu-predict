from app.schemas.auth import RegisterRequest
def test_schema():
    p = RegisterRequest(name='Demo User', email='demo@example.com', password='Password123', role='Admin')
    assert p.email == 'demo@example.com'
