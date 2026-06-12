from enum import Enum


class UserRole(str, Enum):
    admin = 'Admin'
    teacher = 'Teacher'
    student = 'Student'
    analyst = 'Analyst'
