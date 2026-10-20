from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import agora, enum_col
from app.models.enums import (
    CategoriaItem,
    NaturezaItem,
    OrigemItem,
    SituacaoItem,
    StatusValidacao,
)


class Item(Base):
    """Linha estruturada (não só JSON). A natureza final só muda por ação humana."""

    __tablename__ = "item"

    id: Mapped[int] = mapped_column(primary_key=True)
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornada.id"))
    reuniao_id: Mapped[int | None] = mapped_column(ForeignKey("reuniao.id"))
    job_id: Mapped[int | None] = mapped_column(ForeignKey("job.id"))  # extração de origem
    categoria: Mapped[CategoriaItem] = mapped_column(enum_col(CategoriaItem, "categoria_item"))
    descricao: Mapped[str] = mapped_column(Text)
    natureza_proposta: Mapped[NaturezaItem | None] = mapped_column(
        enum_col(NaturezaItem, "natureza_item")
    )  # sugerida pela IA
    natureza_final: Mapped[NaturezaItem | None] = mapped_column(
        enum_col(NaturezaItem, "natureza_item")
    )  # só por ação humana
    origem: Mapped[OrigemItem] = mapped_column(enum_col(OrigemItem, "origem_item"))
    situacao: Mapped[SituacaoItem] = mapped_column(
        enum_col(SituacaoItem, "situacao_item"), default=SituacaoItem.INFORMADO
    )
    status_validacao: Mapped[StatusValidacao] = mapped_column(
        enum_col(StatusValidacao, "status_validacao"), default=StatusValidacao.PENDENTE
    )
    validado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    evidencias: Mapped[list] = mapped_column(JSON, default=list)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
