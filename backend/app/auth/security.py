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
