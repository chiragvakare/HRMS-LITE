# employee.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
import time, re
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Employee
from datetime import datetime, timezone

router = APIRouter(prefix="/employees", tags=["Employees"])

# --- Schema ---
class EmployeeCreate(BaseModel):
    fullName: str = Field(..., alias="name")
    employeeId: Optional[str] = None 
    email: EmailStr
    department: str
    
    @validator("fullName")
    def name_must_be_alphabets(cls, v):
        if not re.fullmatch(r"[A-Za-z ]+", v):
            raise ValueError("Name must contain only alphabets and spaces")
        return v
    
    # Handle mapping & auto employeeId
    @validator("employeeId", pre=True, always=True)
    def auto_employee_id(cls, v):
        if not v:
            return f"EMP-{int(time.time() * 1000)}"
        return v
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# --- POST Route ---
@router.post("", status_code=status.HTTP_201_CREATED)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(Employee).filter(
        or_(Employee.email == emp_in.email, Employee.employee_id == emp_in.employeeId)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID or Email already exists")

    new_emp = Employee(
        employee_id=emp_in.employeeId,
        full_name=emp_in.fullName,
        email=emp_in.email,
        department=emp_in.department,
        created_at=datetime.now(timezone.utc)  # UTC to fix 1-day issue
    )
    
    try:
        db.add(new_emp)
        db.commit()
        db.refresh(new_emp)
        return {"success": True, "data": new_emp}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- GET All Employees (with search) ---
@router.get("")
def get_all_employees(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None
):
    query = db.query(Employee)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Employee.full_name.ilike(search_term) |
            Employee.employee_id.ilike(search_term) |
            Employee.email.ilike(search_term)
        )
    
    total = query.count()
    employees = query.order_by(Employee.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    
    formatted_data = []
    for emp in employees:
        iso_date = emp.created_at.isoformat() if emp.created_at else None
        formatted_data.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": emp.full_name,
            "email": emp.email,
            "department": emp.department,
            "joining_date": iso_date,
            "status": "Active"
        })
    
    return {"success": True, "total": total, "data": formatted_data}


# --- DELETE Route (Permanent Delete) ---
@router.delete("/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        db.delete(emp)
        db.commit()
        return {"success": True, "message": "Employee deleted permanently"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- Stats Route ---
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Employee).count()
    return {"success": True, "data": {"totalEmployees": total}}