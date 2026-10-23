"""Contratos de entrada da API (a saída é montada pelos services em dict simples)."""

from pydantic import BaseModel

from app.models.enums import CategoriaItem, NaturezaItem, Papel, TipoDocumento


class CadastroIn(BaseModel):
    nome: str
    email: str
    senha: str
    confirmar_senha: str
    aceite_lgpd: bool


class LoginIn(BaseModel):
    email: str
    senha: str


class DemoIn(BaseModel):
    papel: Papel


class ConviteIn(BaseModel):
    nome: str
    email: str
    papel: Papel = Papel.COMERCIAL


class UsuarioPatch(BaseModel):
    papel: Papel | None = None
    ativo: bool | None = None


class ItemPatch(BaseModel):
    acao: str  # confirmar | editar | rejeitar
    natureza_final: NaturezaItem | None = None
    descricao: str | None = None
    categoria: CategoriaItem | None = None


class ItemNovo(BaseModel):
    categoria: CategoriaItem
    descricao: str
    natureza_final: NaturezaItem


class PendenciaResolver(BaseModel):
    acao: str  # informar | esclarecido | aceitar_com_risco
    justificativa: str | None = None
    descricao: str | None = None


class HandoffIn(BaseModel):
    gerente_id: int


class AceiteIn(BaseModel):
    versao: int


class DevolucaoIn(BaseModel):
    comentario: str


class DocumentoNovo(BaseModel):
    tipo: TipoDocumento


class DocumentoEdicao(BaseModel):
    conteudo_md: str
