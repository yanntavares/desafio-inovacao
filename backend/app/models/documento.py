from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    StatusDocumento,
    TipoDocumento,
)


class Documento(Base):
    """Versionado: documento aprovado é snapshot imutável; editar cria nova versão."""

    __tablename__ = "documento"
    __table_args__ = (UniqueConstraint("jornada_id", "tipo", "versao"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    tipo: Mapped[TipoDocumento] = mapped_column(enum_col(TipoDocumento, "tipo_documento"))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[StatusDocumento] = mapped_column(
        enum_col(StatusDocumento, "status_documento"), default=StatusDocumento.RASCUNHO
    )
    conteudo_md: Mapped[str] = mapped_column(Text, default="")
    itens: Mapped[list] = mapped_column(JSON, default=list)  # parágrafo -> item_ids
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
