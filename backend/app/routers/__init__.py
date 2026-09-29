from fastapi import APIRouter

from app.routers import auth, dashboard, doctors, health, patients, users, visits

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(doctors.router)
api_router.include_router(patients.router)
api_router.include_router(visits.router)
api_router.include_router(dashboard.router)
