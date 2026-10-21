from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    Papel,
)


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    papel: Mapped[Papel] = mapped_column(enum_col(Papel, "papel"))
    senha_hash: Mapped[str | None] = mapped_column(String(300))  # None = convidado, sem conta ainda
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    aceite_lgpd_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
