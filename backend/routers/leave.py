# leave.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import get_db
from models import Leave, Employee

router = APIRouter(prefix="/leaves", tags=["Leaves"])

# --- Schemas ---
class LeaveCreate(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

    @validator("leave_type")
    def validate_leave_type(cls, v):
        allowed_types = ['Sick', 'Casual', 'Annual', 'Unpaid']
        if v not in allowed_types:
            raise ValueError(f"Leave type must be one of: {', '.join(allowed_types)}")
        return v

    @validator("end_date")
    def validate_dates(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError("End date must be after start date")
        return v


class LeaveUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = None

    @validator("leave_type")
    def validate_leave_type(cls, v):
        if v:
            allowed_types = ['Sick', 'Casual', 'Annual', 'Unpaid']
            if v not in allowed_types:
                raise ValueError(f"Leave type must be one of: {', '.join(allowed_types)}")
        return v

    @validator("status")
    def validate_status(cls, v):
        if v:
            allowed_statuses = ['Pending', 'Approved', 'Rejected']
            if v not in allowed_statuses:
                raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v


# --- POST: Create Leave Request ---
@router.post("", status_code=status.HTTP_201_CREATED)
def create_leave(leave_in: LeaveCreate, db: Session = Depends(get_db)):
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == leave_in.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check for overlapping leaves
    overlapping = db.query(Leave).filter(
        and_(
            Leave.employee_id == leave_in.employee_id,
            Leave.status != 'Rejected',
            or_(
                and_(Leave.start_date <= leave_in.start_date, Leave.end_date >= leave_in.start_date),
                and_(Leave.start_date <= leave_in.end_date, Leave.end_date >= leave_in.end_date),
                and_(Leave.start_date >= leave_in.start_date, Leave.end_date <= leave_in.end_date)
            )
        )
    ).first()

    if overlapping:
        raise HTTPException(status_code=400, detail="Leave dates overlap with existing leave request")

    new_leave = Leave(
        employee_id=leave_in.employee_id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status='Pending',
        created_at=datetime.now(timezone.utc)
    )

    try:
        db.add(new_leave)
        db.commit()
        db.refresh(new_leave)
        return {"success": True, "data": format_leave_response(new_leave, employee), "message": "Leave request submitted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- GET: All Leaves ---
@router.get("")
def get_all_leaves(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    employee_id: Optional[int] = None
):
    query = db.query(Leave).join(Employee)

    if status:
        query = query.filter(Leave.status == status)
    if employee_id:
        query = query.filter(Leave.employee_id == employee_id)

    total = query.count()
    leaves = query.order_by(Leave.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    formatted_data = []
    for leave in leaves:
        employee = leave.employee
        formatted_data.append(format_leave_response(leave, employee))

    return {"success": True, "total": total, "data": formatted_data}


# --- GET: Leave by ID ---
@router.get("/{leave_id}")
def get_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    employee = leave.employee
    return {"success": True, "data": format_leave_response(leave, employee)}


# --- PUT: Update Leave ---
@router.put("/{leave_id}")
def update_leave(leave_id: int, leave_in: LeaveUpdate, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    # Update fields if provided
    if leave_in.leave_type:
        leave.leave_type = leave_in.leave_type
    if leave_in.start_date:
        leave.start_date = leave_in.start_date
    if leave_in.end_date:
        leave.end_date = leave_in.end_date
    if leave_in.reason is not None:
        leave.reason = leave_in.reason
    if leave_in.status:
        leave.status = leave_in.status

    try:
        db.commit()
        db.refresh(leave)
        employee = leave.employee
        return {"success": True, "data": format_leave_response(leave, employee), "message": "Leave updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- DELETE: Delete Leave ---
@router.delete("/{leave_id}")
def delete_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    try:
        db.delete(leave)
        db.commit()
        return {"success": True, "message": "Leave deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- GET: Leave Stats ---
@router.get("/stats/summary")
def get_leave_stats(db: Session = Depends(get_db)):
    total = db.query(Leave).count()
    pending = db.query(Leave).filter(Leave.status == 'Pending').count()
    approved = db.query(Leave).filter(Leave.status == 'Approved').count()
    rejected = db.query(Leave).filter(Leave.status == 'Rejected').count()

    return {
        "success": True,
        "data": {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        }
    }


# Helper function
def format_leave_response(leave, employee):
    days = (leave.end_date - leave.start_date).days + 1
    return {
        "id": leave.id,
        "employee_id": leave.employee_id,
        "employee_name": employee.full_name,
        "employee_number": employee.employee_id,
        "leave_type": leave.leave_type,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "days": days,
        "reason": leave.reason,
        "status": leave.status,
        "created_at": leave.created_at.isoformat() if leave.created_at else None
    }
