from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    ResultadoIA,
    StatusJob,
)


class Job(Base):
    """Fila no PostgreSQL consumida pelo worker (RNF-01) + registro de cada chamada de IA.

    Um job = uma operação assíncrona (extracao, lacunas, briefing...). As colunas de
    provedor/tokens/latência/custo respondem ao custo por jornada (RNF-11) e ao painel
    de operações de IA, sem tabela separada.
    """

    __tablename__ = "job"

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int | None] = mapped_column(ForeignKey("jornada.id"))
    tipo: Mapped[str] = mapped_column(String(40))  # extracao|lacunas|redacao|briefing|pauta
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    chave_idempotencia: Mapped[str | None] = mapped_column(String(128), unique=True)
    status: Mapped[StatusJob] = mapped_column(
        enum_col(StatusJob, "status_job"), default=StatusJob.PENDENTE
    )
    tentativas: Mapped[int] = mapped_column(Integer, default=0)  # reparos de schema (máx. 2)
    erro: Mapped[str | None] = mapped_column(Text)
    # execução de IA
    provedor: Mapped[str | None] = mapped_column(String(20))
    modelo: Mapped[str | None] = mapped_column(String(80))
    versao_prompt: Mapped[str | None] = mapped_column(String(40))
    tokens_entrada: Mapped[int] = mapped_column(Integer, default=0)
    tokens_saida: Mapped[int] = mapped_column(Integer, default=0)
    latencia_ms: Mapped[int] = mapped_column(Integer, default=0)
    custo_estimado: Mapped[float] = mapped_column(Float, default=0.0)
    resultado_ia: Mapped[ResultadoIA | None] = mapped_column(enum_col(ResultadoIA, "resultado_ia"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=agora, onupdate=agora
    )
