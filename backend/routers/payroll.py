# payroll.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import get_db
from models import Payroll, Employee

router = APIRouter(prefix="/payroll", tags=["Payroll"])

# --- Schemas ---
class PayrollCreate(BaseModel):
    employee_id: int
    month: str  # Format: 'YYYY-MM'
    basic_salary: int
    allowances: int = 0
    deductions: int = 0

    @validator("month")
    def validate_month(cls, v):
        try:
            datetime.strptime(v, "%Y-%m")
        except ValueError:
            raise ValueError("Month must be in format YYYY-MM (e.g., 2024-03)")
        return v

    @validator("basic_salary")
    def validate_basic_salary(cls, v):
        if v < 0:
            raise ValueError("Basic salary must be positive")
        return v


class PayrollUpdate(BaseModel):
    basic_salary: Optional[int] = None
    allowances: Optional[int] = None
    deductions: Optional[int] = None
    status: Optional[str] = None

    @validator("status")
    def validate_status(cls, v):
        if v:
            allowed_statuses = ['Pending', 'Processed', 'Paid']
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v


# --- POST: Create Payroll ---
@router.post("", status_code=status.HTTP_201_CREATED)
def create_payroll(payroll_in: PayrollCreate, db: Session = Depends(get_db)):
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == payroll_in.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if payroll already exists for this employee and month
    existing = db.query(Payroll).filter(
        Payroll.employee_id == payroll_in.employee_id,
        Payroll.month == payroll_in.month
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Payroll already exists for this employee and month")

    net_salary = payroll_in.basic_salary + payroll_in.allowances - payroll_in.deductions

    new_payroll = Payroll(
        employee_id=payroll_in.employee_id,
        month=payroll_in.month,
        basic_salary=payroll_in.basic_salary,
        allowances=payroll_in.allowances,
        deductions=payroll_in.deductions,
        net_salary=net_salary,
        status='Pending',
        created_at=datetime.now(timezone.utc)
    )

    try:
        db.add(new_payroll)
        db.commit()
        db.refresh(new_payroll)
        return {"success": True, "data": format_payroll_response(new_payroll, employee), "message": "Payroll created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- GET: All Payroll ---
@router.get("")
def get_all_payroll(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 10,
    month: Optional[str] = None,
    status: Optional[str] = None,
    employee_id: Optional[int] = None
):
    query = db.query(Payroll).join(Employee)

    if month:
        query = query.filter(Payroll.month == month)
    if status:
        query = query.filter(Payroll.status == status)
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)

    total = query.count()
    payrolls = query.order_by(Payroll.month.desc(), Payroll.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    formatted_data = []
    for payroll in payrolls:
        employee = payroll.employee
        formatted_data.append(format_payroll_response(payroll, employee))

    return {"success": True, "total": total, "data": formatted_data}


# --- GET: Payroll by ID ---
@router.get("/{payroll_id}")
def get_payroll(payroll_id: int, db: Session = Depends(get_db)):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    employee = payroll.employee
    return {"success": True, "data": format_payroll_response(payroll, employee)}


# --- PUT: Update Payroll ---
@router.put("/{payroll_id}")
def update_payroll(payroll_id: int, payroll_in: PayrollUpdate, db: Session = Depends(get_db)):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    # Update fields if provided
    if payroll_in.basic_salary is not None:
        payroll.basic_salary = payroll_in.basic_salary
    if payroll_in.allowances is not None:
        payroll.allowances = payroll_in.allowances
    if payroll_in.deductions is not None:
        payroll.deductions = payroll_in.deductions
    if payroll_in.status:
        payroll.status = payroll_in.status

    # Recalculate net salary
    payroll.net_salary = payroll.basic_salary + payroll.allowances - payroll.deductions

    try:
        db.commit()
        db.refresh(payroll)
        employee = payroll.employee
        return {"success": True, "data": format_payroll_response(payroll, employee), "message": "Payroll updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- DELETE: Delete Payroll ---
@router.delete("/{payroll_id}")
def delete_payroll(payroll_id: int, db: Session = Depends(get_db)):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")

    try:
        db.delete(payroll)
        db.commit()
        return {"success": True, "message": "Payroll deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- GET: Payroll Stats ---
@router.get("/stats/summary")
def get_payroll_stats(db: Session = Depends(get_db)):
    total = db.query(Payroll).count()
    pending = db.query(Payroll).filter(Payroll.status == 'Pending').count()
    processed = db.query(Payroll).filter(Payroll.status == 'Processed').count()
    paid = db.query(Payroll).filter(Payroll.status == 'Paid').count()

    # Calculate total payroll amount
    all_payrolls = db.query(Payroll).all()
    total_amount = sum(p.net_salary for p in all_payrolls)

    return {
        "success": True,
        "data": {
            "total": total,
            "pending": pending,
            "processed": processed,
            "paid": paid,
            "total_amount": total_amount
        }
    }


# Helper function
def format_payroll_response(payroll, employee):
    return {
        "id": payroll.id,
        "employee_id": payroll.employee_id,
        "employee_name": employee.full_name,
        "employee_number": employee.employee_id,
        "department": employee.department,
        "month": payroll.month,
        "basic_salary": payroll.basic_salary,
        "allowances": payroll.allowances,
        "deductions": payroll.deductions,
        "net_salary": payroll.net_salary,
        "status": payroll.status,
        "created_at": payroll.created_at.isoformat() if payroll.created_at else None
    }
