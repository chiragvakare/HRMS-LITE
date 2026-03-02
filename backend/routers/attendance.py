# attendance.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from datetime import datetime, date as date_type
from pydantic import BaseModel, Field
from database import get_db
from models import Employee, Attendance

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# -----------------------------
# Pydantic model for POST
# -----------------------------
class AttendanceCreate(BaseModel):
    employee_id: int = Field(..., alias="employeeId")  # frontend sends "employeeId"
    date: date_type
    status: str

    class Config:
        allow_population_by_field_name = True


# -----------------------------
# Get All Attendance
# -----------------------------
@router.get("")
@router.get("/", include_in_schema=False)
def get_all_attendance(
    db: Session = Depends(get_db),
    date: Optional[date_type] = None,
    employee: Optional[int] = None,
    status: Optional[str] = None,  # added status filter
    page: int = 1,
    limit: int = 10
):
    query = db.query(Attendance, Employee).join(Employee, Attendance.employee_id == Employee.id)

    if date:
        query = query.filter(Attendance.date == date)
    if employee:
        query = query.filter(Attendance.employee_id == employee)
    if status:
        query = query.filter(Attendance.status == status)

    total = query.count()
    offset = (page - 1) * limit
    results = query.order_by(Attendance.date.desc()).offset(offset).limit(limit).all()

    formatted_results = []
    for att, emp in results:
        formatted_results.append({
            "id": att.id,
            "employee_id": att.employee_id,
            "date": att.date.isoformat(),
            "status": att.status,
            "createdAt": att.created_at.isoformat(),
            "employee": {
                "name": emp.full_name,
                "employeeId": emp.employee_id
            }
        })

    import math
    return {
        "success": True,
        "total": total,
        "totalPages": math.ceil(total / limit),
        "data": formatted_results
    }


# -----------------------------
# Mark Attendance
# -----------------------------
@router.post("")
@router.post("/", include_in_schema=False)
def mark_attendance(att_data: AttendanceCreate, db: Session = Depends(get_db)):

    emp_id = att_data.employee_id
    att_date = att_data.date
    status = att_data.status

    # Check if attendance already exists
    existing = db.query(Attendance).filter(
        and_(Attendance.employee_id == emp_id, Attendance.date == att_date)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked")

    # Create new attendance record
    new_att = Attendance(
        employee_id=emp_id,
        date=att_date,
        status=status,
        created_at=datetime.utcnow()
    )

    db.add(new_att)
    db.commit()
    db.refresh(new_att)

    return {
        "success": True,
        "data": {
            "id": new_att.id,
            "employee_id": new_att.employee_id,
            "date": new_att.date.isoformat(),
            "status": new_att.status,
            "createdAt": new_att.created_at.isoformat()
        }
    }