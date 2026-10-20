"""Camada HTTP: routers FastAPI. Sem regra de negócio aqui; ela fica em services/."""

from fastapi import APIRouter

from app.api import health

api_router = APIRouter()
api_router.include_router(health.router)
