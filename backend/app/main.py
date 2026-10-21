from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import get_settings
from app.services.erros import ErroNegocio

app = FastAPI(title="Handoff Comercial → Projetos", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origens.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErroNegocio)
async def erro_negocio(_: Request, exc: ErroNegocio) -> JSONResponse:
    """Toda recusa de regra volta com mensagem legível para a tela (ex.: 403 por papel)."""
    return JSONResponse(status_code=exc.status, content={"detail": exc.mensagem, "codigo": exc.codigo})


app.include_router(api_router)
