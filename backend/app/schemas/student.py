from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    student_id: str
    name: str
    course: str
    semester: int = Field(ge=1, le=12)
    attendance: float = Field(default=0.0, ge=0, le=100)
    gpa: float = Field(default=0.0, ge=0, le=4)


class StudentUpdate(BaseModel):
    name: str | None = None
    course: str | None = None
    semester: int | None = Field(default=None, ge=1, le=12)
    attendance: float | None = Field(default=None, ge=0, le=100)
    gpa: float | None = Field(default=None, ge=0, le=4)
