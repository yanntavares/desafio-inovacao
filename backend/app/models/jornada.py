from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    EstadoJornada,
)


class Jornada(Base):
    __tablename__ = "jornada"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_nome: Mapped[str] = mapped_column(String(200))  # o cliente não usa o sistema
    titulo: Mapped[str] = mapped_column(String(200))
    responsavel_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    gerente_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    estado: Mapped[EstadoJornada] = mapped_column(
        enum_col(EstadoJornada, "estado_jornada"), default=EstadoJornada.CRIADA
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=agora, onupdate=agora
    )

    reunioes: Mapped[list["Reuniao"]] = relationship(
        back_populates="jornada", order_by="Reuniao.id"
    )


class Reuniao(Base):
    __tablename__ = "reuniao"

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    titulo: Mapped[str] = mapped_column(String(200), default="")
    analista_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    data_reuniao: Mapped[date | None] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(30), default="exploratoria")
    participantes: Mapped[list] = mapped_column(JSON, default=list)  # [{nome, cliente: bool}]
    texto_original: Mapped[str] = mapped_column(Text)  # preservado; só aparece na interface
    texto_hash: Mapped[str] = mapped_column(String(64))
    qtd_palavras: Mapped[int] = mapped_column(Integer)
    formato: Mapped[str] = mapped_column(String(10), default="txt")  # txt|md|vtt|srt|colado
    segmentos: Mapped[list] = mapped_column(JSON, default=list)  # texto_mascarado é o que a IA vê
    mascaras: Mapped[list] = mapped_column(JSON, default=list)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)

    jornada: Mapped[Jornada] = relationship(back_populates="reunioes")
