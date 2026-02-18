from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from database import get_db
from models import Employee, Attendance
from pydantic import BaseModel, field_validator
from datetime import date as date_type
from datetime import datetime

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# --- Attendance Get All (MAPPING FOR FRONTEND) ---
@router.get("")
@router.get("/", include_in_schema=False)
def get_all_attendance(
    db: Session = Depends(get_db),
    date: Optional[date_type] = None,
    employee: Optional[int] = None,
    page: int = 1, limit: int = 10
):
    # JOIN query taaki humein Employee ka name mil sake
    query = db.query(Attendance, Employee).join(Employee, Attendance.employee_id == Employee.id)
    
    if date: query = query.filter(Attendance.date == date)
    if employee: query = query.filter(Attendance.employee_id == employee)

    total = query.count()
    offset = (page - 1) * limit
    results = query.order_by(Attendance.date.desc()).offset(offset).limit(limit).all()
    
   
    formatted_results = []
    for att, emp in results:
        formatted_results.append({
            "id": att.id,
            "employee_id": att.employee_id,
            "date": att.date,
            "status": att.status,
            "createdAt": att.created_at, # Frontend line 214: record.createdAt
            "employee": {                # <--- NESTED OBJECT FIX
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

# --- Mark Attendance (POST logic) ---
@router.post("")
@router.post("/", include_in_schema=False)
def mark_attendance(data: dict, db: Session = Depends(get_db)):
   
    emp_id = data.get('employeeId')
    att_date = data.get('date')
    status = data.get('status')

    existing = db.query(Attendance).filter(
        and_(Attendance.employee_id == emp_id, Attendance.date == att_date)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked")

    new_att = Attendance(
        employee_id=emp_id, 
        date=att_date, 
        status=status,
        created_at=datetime.now()
    )
    
    db.add(new_att)
    db.commit()
    db.refresh(new_att)
    return {"success": True, "data": new_att}