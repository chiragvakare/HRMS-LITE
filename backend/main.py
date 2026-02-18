from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import routers.employee as employee
import routers.attendance as attendance
import routers.dashboard as dashboard

# 1. Database tables create karna 
Base.metadata.create_all(bind=engine)

# 2. FastAPI instance 
app = FastAPI(
    title="HRMS Python Backend",
    description="Backend migrated to FastAPI",
    version="1.0.0"
)

# 3. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include Routers
app.include_router(employee.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)

@app.get("/")
def home():
    return {"message": "HRMS Python API is running successfully!"}
