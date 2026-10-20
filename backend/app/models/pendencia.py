from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    SeveridadePendencia,
    StatusPendencia,
)


class Pendencia(Base):
    __tablename__ = "pendencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    campo: Mapped[str] = mapped_column(String(80))  # da matriz de obrigatórios
    descricao: Mapped[str] = mapped_column(Text)
    severidade: Mapped[SeveridadePendencia] = mapped_column(
        enum_col(SeveridadePendencia, "severidade_pendencia")
    )
    status: Mapped[StatusPendencia] = mapped_column(
        enum_col(StatusPendencia, "status_pendencia"), default=StatusPendencia.ABERTA
    )
    justificativa: Mapped[str | None] = mapped_column(Text)  # obrigatória ao aceitar com risco
    origem_ia: Mapped[bool] = mapped_column(Boolean, default=False)
    pergunta_sugerida: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
