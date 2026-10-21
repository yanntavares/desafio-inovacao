"""Camada HTTP: routers FastAPI. Sem regra de negócio aqui; ela fica em services/."""

from fastapi import APIRouter

from app.api import admin, auth, health, jornadas

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(jornadas.router)
