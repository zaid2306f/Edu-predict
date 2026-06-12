from datetime import timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.auth.security import create_token
from app.config.settings import settings
from app.database.mongo import get_db
from app.models.user import UserRole

security = HTTPBearer(auto_error=True)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
        user = await get_db().users.find_one({'_id': user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
        return user
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token') from exc


def require_roles(*roles: UserRole):
    async def _role_guard(user=Depends(get_current_user)):
        if user.get('role') not in [r.value for r in roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient permissions')
        return user

    return _role_guard


def issue_token_pair(user_id: str):
    access = create_token(user_id, timedelta(minutes=settings.access_token_expire_minutes), 'access')
    refresh = create_token(user_id, timedelta(days=settings.refresh_token_expire_days), 'refresh')
    return access, refresh
