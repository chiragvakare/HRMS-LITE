from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Optional, List
import time
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Employee 



router = APIRouter(prefix="/employees", tags=["Employees"])

# --- Schema ---
class EmployeeCreate(BaseModel):
    fullName: str = Field(..., alias="name")
    employeeId: Optional[str] = None 
    email: EmailStr
    department: str
    
    @model_validator(mode='before')
    @classmethod
    def handle_mapping(cls, data):
        if isinstance(data, dict):
            if 'name' in data and 'fullName' not in data:
                data['fullName'] = data.get('name')
            if not data.get('employeeId'):
                data['employeeId'] = f"EMP-{int(time.time() * 1000)}"
        return data
    
    class Config:
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
        department=emp_in.department
    )
    
    try:
        db.add(new_emp)
        db.commit()
        db.refresh(new_emp)
        return {"success": True, "data": new_emp}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- GET All Employees (MAPPING & DATE FIXED) ---
@router.get("")
def get_all_employees(db: Session = Depends(get_db), page: int = 1, limit: int = 10):
    query = db.query(Employee)
    total = query.count()
    employees = query.order_by(Employee.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    
    formatted_data = []
    for emp in employees:
        # "Invalid Date" fix: converting datetime to ISO format string
        iso_date = emp.created_at.isoformat() if emp.created_at else None
        
        formatted_data.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": emp.full_name,          # Mapping for Frontend
            "email": emp.email,
            "department": emp.department,
            "joining_date": iso_date,       # Frontend will now parse this correctly
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
        # Permanent delete ensures record is gone from Dashboard stats and lists
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