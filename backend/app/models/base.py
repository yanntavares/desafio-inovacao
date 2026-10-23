from datetime import UTC, datetime

from sqlalchemy import Enum


def agora() -> datetime:
    return datetime.now(UTC)


def enum_col(cls, name: str) -> Enum:
    """Enum nativo do PostgreSQL guardando o valor (ex.: "acordado"), não o nome do membro."""
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])
