from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt

from app.auth.dependencies import get_current_user, issue_token_pair
from app.auth.security import hash_password, verify_password
from app.config.settings import settings  # noqa: F401 — used in forgot_password
from app.database.mongo import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenPair, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest, UserProfile, ProfileUpdateRequest, ChangePasswordRequest
from app.schemas.common import MessageResponse

router = APIRouter()


@router.get('/me', response_model=UserProfile)
async def get_me(user=Depends(get_current_user)):
    return {
        'id': user['_id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
    }


@router.put('/profile', response_model=UserProfile)
async def update_profile(payload: ProfileUpdateRequest, user=Depends(get_current_user)):
    await get_db().users.update_one({'_id': user['_id']}, {'$set': {'name': payload.name}})
    user['name'] = payload.name
    return {'id': user['_id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}


@router.post('/change-password', response_model=MessageResponse)
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    if not verify_password(payload.current_password, user['password']):
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    await get_db().users.update_one({'_id': user['_id']}, {'$set': {'password': hash_password(payload.new_password)}})
    return {'message': 'Password updated successfully'}


@router.post('/register', response_model=MessageResponse)
async def register(payload: RegisterRequest):
    db = get_db()
    if await db.users.find_one({'email': payload.email}):
        raise HTTPException(status_code=400, detail='Email already registered')
    await db.users.insert_one({
        '_id': str(uuid4()),
        'name': payload.name,
        'email': payload.email,
        'password': hash_password(payload.password),
        'role': payload.role.value,
        'created_at': datetime.utcnow(),
        'refresh_tokens': [],
    })
    return {'message': 'User registered successfully'}


@router.post('/login', response_model=TokenPair)
async def login(payload: LoginRequest):
    db = get_db()
    user = await db.users.find_one({'email': payload.email})
    if not user or not verify_password(payload.password, user['password']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    access, refresh = issue_token_pair(user['_id'])
    await db.users.update_one({'_id': user['_id']}, {'$push': {'refresh_tokens': refresh}})
    return {'access_token': access, 'refresh_token': refresh, 'token_type': 'bearer'}


@router.post('/refresh', response_model=TokenPair)
async def refresh(payload: RefreshRequest):
    db = get_db()
    try:
        claims = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail='Invalid refresh token') from exc
    if claims.get('type') != 'refresh':
        raise HTTPException(status_code=401, detail='Invalid token type')
    user_id = claims.get('sub')
    user = await db.users.find_one({'_id': user_id, 'refresh_tokens': payload.refresh_token})
    if not user:
        raise HTTPException(status_code=401, detail='Refresh token not found')
    access, refresh_token = issue_token_pair(user_id)
    await db.users.update_one({'_id': user_id}, {'$pull': {'refresh_tokens': payload.refresh_token}, '$push': {'refresh_tokens': refresh_token}})
    return {'access_token': access, 'refresh_token': refresh_token, 'token_type': 'bearer'}


@router.post('/logout', response_model=MessageResponse)
async def logout(payload: RefreshRequest):
    await get_db().users.update_many({}, {'$pull': {'refresh_tokens': payload.refresh_token}})
    return {'message': 'Logged out successfully'}


@router.post('/forgot-password')
async def forgot_password(payload: ForgotPasswordRequest):
    token = issue_token_pair(payload.email)[1]
    await get_db().password_resets.insert_one({'email': payload.email, 'token': token, 'created_at': datetime.utcnow()})
    response = {'message': 'Reset token generated'}
    if settings.environment == 'development':
        response['reset_token'] = token
    return response


@router.post('/reset-password', response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest):
    db = get_db()
    record = await db.password_resets.find_one({'token': payload.token})
    if not record:
        raise HTTPException(status_code=400, detail='Invalid reset token')
    await db.users.update_one({'email': record['email']}, {'$set': {'password': hash_password(payload.new_password)}})
    await db.password_resets.delete_one({'token': payload.token})
    return {'message': 'Password updated successfully'}
