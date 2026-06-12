from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import require_roles
from app.models.user import UserRole
from app.schemas.student import StudentCreate, StudentUpdate
from app.database.mongo import get_db
from app.services.crud_service import CRUDService

router = APIRouter()
service = CRUDService('students')


@router.get('')
async def list_students(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    return await service.list()


@router.get('/search')
async def search_students(q: str = Query(default=''), _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    if not q:
        return await service.list()
    return await service.list({'name': {'$regex': q, '$options': 'i'}})


@router.get('/risk-level')
async def risk_levels(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    students = await service.list()
    for s in students:
        score = (100 - s.get('attendance', 0)) * 0.6 + (4 - s.get('gpa', 0)) * 10
        s['risk_level'] = 'high' if score > 50 else 'medium' if score > 30 else 'low'
    return students


@router.get('/performance')
async def performance(_=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.analyst))):
    students = await service.list()
    return [{'student_id': s['student_id'], 'name': s['name'], 'gpa': s.get('gpa', 0), 'attendance': s.get('attendance', 0)} for s in students]


@router.get('/academic-records/{student_code}')
async def academic_records(student_code: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    rows = []
    async for row in get_db().academic_records.find({'student_id': student_code}, {'semester': 1, 'gpa': 1, 'created_at': 1}):
        row['_id'] = str(row['_id'])
        rows.append(row)
    return rows


@router.get('/{student_id}')
async def get_student(student_id: str, _=Depends(require_roles(UserRole.admin, UserRole.teacher, UserRole.student, UserRole.analyst))):
    student = await service.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    return student


@router.post('')
async def create_student(payload: StudentCreate, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    return await service.create(payload.model_dump())


@router.put('/{student_id}')
async def update_student(student_id: str, payload: StudentUpdate, _=Depends(require_roles(UserRole.admin, UserRole.teacher))):
    updated = await service.update(student_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail='Student not found')
    return updated


@router.delete('/{student_id}')
async def delete_student(student_id: str, _=Depends(require_roles(UserRole.admin))):
    ok = await service.delete(student_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Student not found')
    return {'message': 'Student deleted'}
