from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    DecisaoAprovacao,
    Gate,
)


class PacoteHandoff(Base):
    """Snapshot imutável com 16 seções; `hash` identifica a versão aceita no G3."""

    __tablename__ = "pacote_handoff"
    __table_args__ = (UniqueConstraint("jornada_id", "versao"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    secoes: Mapped[dict] = mapped_column(JSON)  # 16 seções, acordado x em discussão
    indice_completude: Mapped[float] = mapped_column(Float, default=0.0)
    hash: Mapped[str] = mapped_column(String(64))
    gerente_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    enviado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)



class Aprovacao(Base):
    """Registro de gate: quem decidiu, qual gate, sobre qual versão."""

    __tablename__ = "aprovacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    gate: Mapped[Gate] = mapped_column(enum_col(Gate, "gate"))
    decisao: Mapped[DecisaoAprovacao] = mapped_column(
        enum_col(DecisaoAprovacao, "decisao_aprovacao")
    )
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    pacote_id: Mapped[int | None] = mapped_column(ForeignKey("pacote_handoff.id"))
    documento_id: Mapped[int | None] = mapped_column(ForeignKey("documento.id"))
    comentario: Mapped[str | None] = mapped_column(Text)  # obrigatório ao devolver
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
