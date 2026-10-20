"""schema inicial

Revision ID: 0001
Revises:
Create Date: 2026-10-20

Cria todo o modelo inicial a partir do metadata. Isso evita criar duas vezes os tipos
enum do PostgreSQL que são compartilhados entre colunas (ex.: natureza_item,
resultado_ia). As próximas migrações devem ser geradas com:

    alembic revision --autogenerate -m "descricao"
"""
from alembic import op

from app.core.database import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
