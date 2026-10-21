"""Contrato da saída da IA na extração. Tudo que o modelo devolve passa por aqui antes do banco."""

from pydantic import BaseModel, Field

from app.models.enums import CategoriaItem, NaturezaItem


class EvidenciaIA(BaseModel):
    segmento_ordem: int
    trecho: str = Field(min_length=1)


class ItemIA(BaseModel):
    categoria: CategoriaItem
    descricao: str = Field(min_length=1)
    natureza_proposta: NaturezaItem | None = None
    evidencias: list[EvidenciaIA] = []


class SaidaExtracao(BaseModel):
    itens: list[ItemIA]
