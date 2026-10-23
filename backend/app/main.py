import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import get_settings
from app.services import auditoria
from app.services.erros import ErroNegocio

log = logging.getLogger("api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_settings().validar_producao()
    yield


app = FastAPI(title="Handoff Comercial → Projetos", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origens.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErroNegocio)
async def erro_negocio(request: Request, exc: ErroNegocio) -> JSONResponse:
    """Toda recusa de regra volta com mensagem legível para a tela (ex.: 403 por papel)."""
    usuario_id = getattr(request.state, "usuario_id", None)
    if exc.status in (403, 409) and usuario_id:
        db = request.state.db
        try:
            db.rollback()  # nada da requisição recusada foi commitado; só a recusa fica
            jornada_id = request.path_params.get("jornada_id")
            auditoria.registrar_recusa(db, usuario_id, request.method, request.url.path,
                                       int(jornada_id) if jornada_id else None, exc.status, exc.mensagem)
            db.commit()
        except Exception:
            db.rollback()
            log.exception("falha ao auditar recusa")
    return JSONResponse(status_code=exc.status, content={"detail": exc.mensagem, "codigo": exc.codigo})


app.include_router(api_router)
