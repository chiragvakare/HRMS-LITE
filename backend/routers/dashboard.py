from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date as date_obj
from database import get_db
from models import Employee, Attendance

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
@router.get("/", include_in_schema=False)
def get_dashboard(db: Session = Depends(get_db)):
    today = date_obj.today()

    # 1. Stats logic for StatCards
    total_employees = db.query(Employee).filter(Employee.deleted_at == None).count()
    today_attendance = db.query(Attendance).filter(Attendance.date == today).all()
    present_today = len([a for a in today_attendance if a.status == 'Present'])
    absent_today = len([a for a in today_attendance if a.status == 'Absent'])
    not_marked = total_employees - (present_today + absent_today)

  
    recent_att_query = db.query(Attendance, Employee).join(
        Employee, Attendance.employee_id == Employee.id
    ).order_by(Attendance.created_at.desc()).limit(5).all()

    formatted_recent_attendance = []
    for att, emp in recent_att_query:
        formatted_recent_attendance.append({
            "id": att.id,
            "date": str(att.date),
            "status": att.status,
            "employee": {
                "name": emp.full_name  
            }
        })

    # 3. Department Wise
    departments = db.query(
        Employee.department, func.count(Employee.id).label('count')
    ).filter(Employee.deleted_at == None).group_by(Employee.department).all()

    # 4. Recent Employees FIX
    recent_employees = db.query(Employee).filter(
        Employee.deleted_at == None
    ).order_by(Employee.created_at.desc()).limit(6).all()

    return {
        "success": True,
        "data": {
            "stats": {
                "totalEmployees": total_employees,
                "presentToday": present_today,
                "absentToday": absent_today,
                "notMarked": max(0, not_marked),
                "date": str(today)
            },
            "departments": [{"department": d[0], "count": d[1]} for d in departments],
            "recentAttendance": formatted_recent_attendance,
            "recentEmployees": [
                {
                    "id": e.id,
                    "name": e.full_name, # Mapping fixed
                    "department": e.department
                } for e in recent_employees
            ]
        }
    }