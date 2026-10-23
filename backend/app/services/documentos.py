"""Documentos (resumo, briefings, pauta): redigidos pela IA a partir de itens validados.

Aprovado é imutável: editar cria nova versão. O código confere que todo número e data do
texto existe nos itens validados (a IA não inventa valor).
"""

import json
import logging
import re
import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.llm import get_provider
from app.models import Documento, Item, Job, Jornada, Pendencia, Usuario
from app.models.enums import (
    EstadoJornada,
    Gate,
    NaturezaItem,
    StatusDocumento,
    StatusJob,
    StatusPendencia,
    StatusValidacao,
    TipoDocumento,
)
from app.services import auditoria, orquestrador, permissoes
from app.services.erros import ErroNegocio, NaoEncontrado, SemPermissao
from app.services.permissoes import Acao

log = logging.getLogger("documentos")

COMERCIAIS = {TipoDocumento.RESUMO_COMERCIAL, TipoDocumento.BRIEFING_COMERCIAL}
DE_PROJETO = {TipoDocumento.BRIEFING_PROJETO, TipoDocumento.PAUTA_KICKOFF, TipoDocumento.RESUMO_GERENCIAL}

_NUMERO = re.compile(r"(?<![\w#])(R\$\s?)?(\d[\d.,/:]*\d|\d)")


def numeros_do_texto(texto: str) -> list[tuple[str, str]]:
    """(como aparece, só o número) de cada número ou data citado, sem a numeração de listas e títulos."""
    sem_marcas = re.sub(r"^\s*(?:#+|\d+[.)]|[-*])\s+", "", texto, flags=re.MULTILINE)
    return [((moeda or "") + num.rstrip(".,"), num.rstrip(".,")) for moeda, num in _NUMERO.findall(sem_marcas)]


def conferir_numeros(texto: str, descricoes: list[str]) -> None:
    base = " ".join(descricoes)
    for exibido, numero in numeros_do_texto(texto):
        if numero not in base:
            raise ErroNegocio(f"O valor {exibido} não existe nos itens validados. Corrija o item ou o texto.")


def _itens_validados(db: Session, jornada_id: int) -> list[Item]:
    return list(db.scalars(
        select(Item).where(
            Item.jornada_id == jornada_id,
            Item.status_validacao.in_([StatusValidacao.CONFIRMADO, StatusValidacao.EDITADO]),
        ).order_by(Item.id)
    ))


def obter(db: Session, documento_id: int) -> Documento:
    doc = db.get(Documento, documento_id)
    if not doc:
        raise NaoEncontrado("Documento")
    return doc


def listar(db: Session, jornada_id: int) -> list[Documento]:
    return list(db.scalars(select(Documento).where(Documento.jornada_id == jornada_id)
                           .order_by(Documento.criado_em, Documento.id)))


def ultimo(db: Session, jornada_id: int, tipo: TipoDocumento) -> Documento | None:
    return db.scalar(select(Documento).where(Documento.jornada_id == jornada_id, Documento.tipo == tipo)
                     .order_by(Documento.versao.desc()).limit(1))


def _proxima_versao(db: Session, jornada_id: int, tipo: TipoDocumento) -> int:
    ultima = db.scalar(select(func.max(Documento.versao))
                       .where(Documento.jornada_id == jornada_id, Documento.tipo == tipo))
    return (ultima or 0) + 1


def gerar(db: Session, jornada: Jornada, usuario: Usuario, tipo: TipoDocumento) -> Documento:
    if tipo in COMERCIAIS:
        permissoes.exigir(usuario, Acao.EDITAR_DOCUMENTO_COMERCIAL)
        if jornada.responsavel_id != usuario.id:
            raise SemPermissao("Este lead pertence a outro analista.")
        if jornada.estado not in {EstadoJornada.EM_VALIDACAO, EstadoJornada.VALIDADA}:
            raise ErroNegocio("Documentos comerciais são gerados com a jornada em validação ou validada.", 409)
    else:
        permissoes.exigir(usuario, Acao.GERAR_DOCUMENTO_PROJETO)
        if jornada.gerente_id != usuario.id:
            raise SemPermissao("Só o gerente designado gera este documento.")
        pos_aceite = {EstadoJornada.ACEITO, EstadoJornada.BRIEFING_APROVADO}
        if tipo == TipoDocumento.RESUMO_GERENCIAL:
            # apoia a decisão do G3, então existe antes do aceite
            if jornada.estado not in pos_aceite | {EstadoJornada.HANDOFF_ENVIADO}:
                raise ErroNegocio("O resumo gerencial é gerado depois que o handoff é enviado.", 409)
        elif jornada.estado not in pos_aceite:
            raise ErroNegocio("Este documento só é gerado depois do aceite do handoff.", 409)

    itens = _itens_validados(db, jornada.id)
    if not itens:
        raise ErroNegocio("Não há itens validados para gerar o documento.")
    contexto = {"cliente": jornada.cliente_nome, "itens": {}, "pendencias": [
        p.descricao for p in db.scalars(select(Pendencia).where(
            Pendencia.jornada_id == jornada.id, Pendencia.status == StatusPendencia.ABERTA))
    ]}
    for it in itens:
        contexto["itens"].setdefault(it.categoria.value, []).append({
            "id": it.id, "descricao": it.descricao,
            "natureza": (it.natureza_final or NaturezaItem.EM_DISCUSSAO).value,
        })
    provider = get_provider()
    inicio = time.monotonic()
    resp = provider.redigir(tipo.value, contexto)
    # custo e tokens por jornada: toda chamada de IA fica registrada em `job`
    db.add(Job(jornada_id=jornada.id, tipo="redacao", status=StatusJob.CONCLUIDO, payload={"tipo": tipo.value},
               provedor=provider.nome, modelo=resp.modelo, tokens_entrada=resp.tokens_entrada,
               tokens_saida=resp.tokens_saida, custo_estimado=resp.custo_estimado,
               latencia_ms=int((time.monotonic() - inicio) * 1000)))
    saida = json.loads(resp.texto)
    # o título carrega o nome do cliente (dado do cadastro, não da IA): fora da conferência
    corpo = "\n".join(saida["markdown"].splitlines()[1:])
    conferir_numeros(corpo, [i.descricao for i in itens])
    # a IA não liga documento a item de outro cliente: só valem os ids enviados no contexto
    validos = {i.id for i in itens}
    vinculos, descartados = [], 0
    for v in saida["itens"]:
        ids = [i for i in v["item_ids"] if i in validos]
        descartados += len(v["item_ids"]) - len(ids)
        if ids:
            vinculos.append({**v, "item_ids": ids})
    if descartados:
        log.warning("redação devolveu %d item_id(s) fora do lead %s; descartados", descartados, jornada.id)
    doc = Documento(jornada_id=jornada.id, tipo=tipo, versao=_proxima_versao(db, jornada.id, tipo),
                    conteudo_md=saida["markdown"], itens=vinculos)
    db.add(doc)
    db.flush()
    auditoria.registrar(db, usuario, "gerar_documento", "documento", doc.id, jornada.id, None,
                        {"tipo": tipo.value, "versao": doc.versao})
    return doc


def _remapear_vinculos(antigo: str, vinculos: list[dict], novo: str) -> list[dict]:
    """O vínculo aponta o índice da linha: segue a linha de texto idêntico; linha nova ou alterada fica sem evidência."""
    linhas = antigo.splitlines()
    por_texto = {linhas[v["paragrafo"]]: v["item_ids"] for v in vinculos if v["paragrafo"] < len(linhas)}
    return [{"paragrafo": i, "item_ids": por_texto[t]} for i, t in enumerate(novo.splitlines()) if t in por_texto]


def editar(db: Session, doc: Documento, usuario: Usuario, conteudo_md: str) -> Documento:
    """Rascunho edita no lugar; aprovado é imutável e a edição gera nova versão."""
    permissoes.exigir(usuario, Acao.EDITAR_DOCUMENTO_COMERCIAL)
    if doc.tipo not in COMERCIAIS:
        raise SemPermissao("Este documento não é editado por analistas.")
    jornada = db.get(Jornada, doc.jornada_id)
    if jornada.responsavel_id != usuario.id:
        raise SemPermissao("Este lead pertence a outro analista.")
    itens = [i.descricao for i in _itens_validados(db, doc.jornada_id)]
    conferir_numeros("\n".join(conteudo_md.splitlines()[1:]), itens)
    vinculos = _remapear_vinculos(doc.conteudo_md, doc.itens or [], conteudo_md)
    if doc.status == StatusDocumento.APROVADO:
        novo = Documento(jornada_id=doc.jornada_id, tipo=doc.tipo, versao=_proxima_versao(db, doc.jornada_id, doc.tipo),
                         conteudo_md=conteudo_md, itens=vinculos)
        db.add(novo)
        db.flush()
        auditoria.registrar(db, usuario, "nova_versao_documento", "documento", novo.id, doc.jornada_id,
                            {"versao": doc.versao}, {"versao": novo.versao})
        return novo
    antes = {"conteudo_md": doc.conteudo_md}
    doc.conteudo_md, doc.itens = conteudo_md, vinculos
    auditoria.registrar(db, usuario, "editar_documento", "documento", doc.id, doc.jornada_id, antes,
                        {"conteudo_md": conteudo_md})
    return doc


def aprovar(db: Session, doc: Documento, usuario: Usuario) -> Documento:
    jornada = db.get(Jornada, doc.jornada_id)
    if doc.status == StatusDocumento.APROVADO:
        raise ErroNegocio("Este documento já foi aprovado.", 409)
    itens = [i.descricao for i in _itens_validados(db, doc.jornada_id)]
    conferir_numeros("\n".join(doc.conteudo_md.splitlines()[1:]), itens)
    if doc.tipo in COMERCIAIS:
        permissoes.exigir(usuario, Acao.EDITAR_DOCUMENTO_COMERCIAL)
        if jornada.responsavel_id != usuario.id:
            raise SemPermissao("Este lead pertence a outro analista.")
    elif doc.tipo == TipoDocumento.BRIEFING_PROJETO:
        orquestrador.exigir_gate(db, Gate.G4, jornada, usuario)  # G4
    else:
        permissoes.exigir(usuario, Acao.APROVAR_G4)
        if jornada.gerente_id != usuario.id:
            raise SemPermissao("Só o gerente designado aprova este documento.")
    doc.status = StatusDocumento.APROVADO
    auditoria.registrar(db, usuario, "aprovar_documento", "documento", doc.id, jornada.id,
                        {"status": "rascunho"}, {"status": "aprovado", "tipo": doc.tipo.value, "versao": doc.versao})
    if doc.tipo == TipoDocumento.BRIEFING_PROJETO:
        from app.models import Aprovacao
        from app.models.enums import DecisaoAprovacao
        db.add(Aprovacao(jornada_id=jornada.id, gate=Gate.G4, decisao=DecisaoAprovacao.APROVADO,
                         usuario_id=usuario.id, documento_id=doc.id))
        orquestrador.transitar(db, jornada, EstadoJornada.BRIEFING_APROVADO, usuario, "G4 aprovado")
    return doc


def concluir(db: Session, jornada: Jornada, usuario: Usuario) -> None:
    permissoes.exigir(usuario, Acao.APROVAR_G4)
    if jornada.gerente_id != usuario.id:
        raise SemPermissao("Só o gerente designado conclui a jornada.")
    pauta = db.scalar(select(Documento).where(
        Documento.jornada_id == jornada.id, Documento.tipo == TipoDocumento.PAUTA_KICKOFF,
        Documento.status == StatusDocumento.APROVADO))
    if not pauta:
        raise ErroNegocio("Aprove a pauta de kickoff antes de concluir.", 409)
    orquestrador.transitar(db, jornada, EstadoJornada.CONCLUIDA, usuario, "kickoff realizado")
