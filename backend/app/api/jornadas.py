"""Leads/jornadas: kanban, cadastro de reunião, revisão (G2), handoff (G3), documentos (G4)."""

import json
from datetime import date

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import usuario_atual
from app.core.database import get_db
from app.models import Auditoria, Item, Jornada, Pendencia, Reuniao, Usuario
from app.models.enums import EstadoJornada, StatusPendencia, TipoDocumento
from app.schemas.api import (
    AceiteIn,
    DevolucaoIn,
    DocumentoEdicao,
    DocumentoNovo,
    HandoffIn,
    ItemNovo,
    ItemPatch,
    PendenciaResolver,
)
from app.services import (
    documentos,
    itens,
    jornadas,
    orquestrador,
    pacote,
    painel,
    pendencias,
    permissoes,
    transcricao,
)
from app.services.erros import ErroNegocio, NaoEncontrado, SemPermissao
from app.services.permissoes import Acao

router = APIRouter(tags=["leads"])


def _jornada(db: Session, user: Usuario, jornada_id: int) -> Jornada:
    return jornadas.obter_visivel(db, user, jornada_id)


def _serializar_item(it: Item) -> dict:
    return {
        "id": it.id, "categoria": it.categoria.value, "descricao": it.descricao,
        "natureza_proposta": it.natureza_proposta.value if it.natureza_proposta else None,
        "natureza_final": it.natureza_final.value if it.natureza_final else None,
        "origem": it.origem.value, "situacao": it.situacao.value,
        "status_validacao": it.status_validacao.value, "evidencias": it.evidencias,
        # item sem evidência é tratado como inferido (marca de aviso na tela)
        "sem_evidencia": not it.evidencias,
    }


def _serializar_pendencia(p: Pendencia) -> dict:
    return {"id": p.id, "jornada_id": p.jornada_id, "campo": p.campo, "descricao": p.descricao,
            "severidade": p.severidade.value, "status": p.status.value, "justificativa": p.justificativa,
            "origem_ia": p.origem_ia, "pergunta_sugerida": p.pergunta_sugerida}


def _serializar_documento(d, completo: bool = False) -> dict:
    base = {"id": d.id, "jornada_id": d.jornada_id, "tipo": d.tipo.value, "versao": d.versao,
            "status": d.status.value, "criado_em": d.criado_em.isoformat()}
    return {**base, "conteudo_md": d.conteudo_md, "itens": d.itens} if completo else base


def _serializar_pacote(p, db: Session, completo: bool = False) -> dict:
    r = pacote.resumo(p.secoes, orquestrador.pendencias_bloqueantes_abertas(db, p.jornada_id))
    base = {"id": p.id, "jornada_id": p.jornada_id, "versao": p.versao, "hash": p.hash,
            "indice_completude": p.indice_completude, "gerente_id": p.gerente_id,
            "enviado_em": p.enviado_em.isoformat() if p.enviado_em else None, "resumo": r}
    return {**base, "secoes": p.secoes} if completo else base


# --- kanban -----------------------------------------------------------------------

@router.get("/kanban")
def kanban(analista_id: int | None = None, negocio_id: int | None = None, so_bloqueantes: bool = False,
           q: str | None = None, concluidas: bool = False,
           user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return jornadas.kanban(db, user, analista_id=analista_id, negocio_id=negocio_id,
                           so_bloqueantes=so_bloqueantes, q=q, concluidas=concluidas)


@router.get("/handoffs")
def handoffs_recebidos(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Fila do gerente: pacotes designados a ele."""
    permissoes.exigir(user, Acao.ACEITAR_G3)
    js = db.scalars(select(Jornada).where(Jornada.gerente_id == user.id).order_by(Jornada.atualizado_em.desc()))
    out = []
    for j in js:
        p = pacote.ultimo(db, j.id)
        if p:
            out.append({"jornada_id": j.id, "cliente": j.cliente_nome, "titulo": j.titulo,
                        "estado": j.estado.value, "pacote": _serializar_pacote(p, db)})
    return out


@router.get("/pendencias/minhas")
def minhas_pendencias(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.REVISAR_ITENS)
    rows = db.execute(
        select(Pendencia, Jornada).join(Jornada, Jornada.id == Pendencia.jornada_id)
        .where(Jornada.responsavel_id == user.id, Pendencia.status == StatusPendencia.ABERTA)
        .order_by(Pendencia.severidade, Pendencia.id)
    )
    return [{**_serializar_pendencia(p), "cliente": j.cliente_nome, "titulo": j.titulo} for p, j in rows]


# --- cadastro de reunião ----------------------------------------------------------

@router.post("/reunioes", status_code=201)
async def cadastrar_reuniao(
    jornada_id: int | None = Form(None), cliente_nome: str | None = Form(None),
    titulo_negocio: str = Form(...), analista_id: int = Form(...), data_reuniao: date = Form(...),
    tipo: str = Form(...), participantes: str = Form(..., description='JSON: [{"nome": "...", "cliente": true}]'),
    texto: str | None = Form(None), arquivo: UploadFile | None = File(None),
    user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db),
):
    permissoes.exigir(user, Acao.CADASTRAR_REUNIAO)
    try:
        lista = json.loads(participantes)
        assert isinstance(lista, list) and all(isinstance(p, dict) and p.get("nome") for p in lista)
    except (ValueError, AssertionError):
        raise ErroNegocio('Participantes inválidos. Envie um JSON como [{"nome": "Ana", "cliente": false}].')
    if arquivo is not None and arquivo.filename:
        formato = transcricao.formato_do_arquivo(arquivo.filename)
        bruto = await arquivo.read()
        try:
            conteudo = bruto.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ErroNegocio("Não consegui ler o arquivo. Salve-o em UTF-8 e envie de novo.")
    elif texto and texto.strip():
        formato, conteudo = "colado", texto
    else:
        raise ErroNegocio("Envie a transcrição: cole o texto ou escolha um arquivo.")
    jornada, reuniao = jornadas.cadastrar_reuniao(
        db, user, jornada_id=jornada_id, cliente_nome=cliente_nome, titulo_negocio=titulo_negocio,
        analista_id=analista_id, data_reuniao=data_reuniao, tipo=tipo, participantes=lista,
        texto=conteudo, formato=formato,
    )
    db.commit()
    return {"jornada_id": jornada.id, "reuniao_id": reuniao.id, "estado": jornada.estado.value,
            "palavras": reuniao.qtd_palavras, "segmentos": len(reuniao.segmentos),
            "dados_mascarados": len(reuniao.mascaras), "formato": reuniao.formato}


@router.get("/jornadas/{jornada_id}/reunioes")
def listar_reunioes(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    return [{"id": r.id, "titulo": r.titulo, "tipo": r.tipo, "data_reuniao": r.data_reuniao.isoformat() if r.data_reuniao else None,
             "participantes": r.participantes, "palavras": r.qtd_palavras, "segmentos": len(r.segmentos),
             "dados_mascarados": len(r.mascaras)} for r in j.reunioes]


@router.get("/reunioes/{reuniao_id}")
def ver_reuniao(reuniao_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Transcrição com o texto original (só a interface vê; a IA recebe o mascarado)."""
    r = db.get(Reuniao, reuniao_id)
    if not r:
        raise NaoEncontrado("Reunião")
    _jornada(db, user, r.jornada_id)
    return {"id": r.id, "jornada_id": r.jornada_id, "titulo": r.titulo, "tipo": r.tipo,
            "data_reuniao": r.data_reuniao.isoformat() if r.data_reuniao else None,
            "participantes": r.participantes, "palavras": r.qtd_palavras,
            "dados_mascarados": len(r.mascaras),
            "segmentos": [{"ordem": s["ordem"], "falante": s["falante"], "texto": s["texto_original"],
                           "texto_mascarado": s["texto_mascarado"]} for s in r.segmentos]}


@router.post("/jornadas/{jornada_id}/extracao/tentar-novamente")
def tentar_de_novo(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    jornadas.tentar_extracao_de_novo(db, user, j)
    db.commit()
    return {"estado": j.estado.value}


# --- detalhe, visão geral, timeline -----------------------------------------------

@router.get("/jornadas/{jornada_id}")
def detalhe(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    out = jornadas.detalhe(db, j, user)
    dev = pacote.ultima_devolucao(db, j)
    out["devolucao"] = {"comentario": dev.comentario, "quando": dev.criado_em.isoformat()} if dev else None
    ultimo = pacote.ultimo(db, j.id)
    out["handoff"] = _serializar_pacote(ultimo, db) if ultimo else None
    return out


@router.get("/jornadas/{jornada_id}/visao-geral")
def visao_geral(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Seções com itens e chips de natureza/origem (aba 'Visão geral' do lead)."""
    j = _jornada(db, user, jornada_id)
    secoes = pacote.montar_secoes(db, j.id)
    nao_informados = [s["titulo"] for s in secoes.values() if not s["preenchida"]]
    return {"secoes": secoes, "nao_informados": nao_informados}


@router.get("/jornadas/{jornada_id}/auditoria")
def linha_do_tempo(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    regs = db.scalars(select(Auditoria).where(Auditoria.jornada_id == j.id).order_by(Auditoria.id.desc()))
    return [painel.serializar_auditoria(db, a) for a in regs]


# --- itens e evidência ------------------------------------------------------------

@router.get("/jornadas/{jornada_id}/itens")
def listar_itens(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    return [_serializar_item(i) for i in itens.listar(db, j.id)]


@router.post("/jornadas/{jornada_id}/itens", status_code=201)
def adicionar_item(jornada_id: int, dados: ItemNovo, user: Usuario = Depends(usuario_atual),
                   db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.REVISAR_ITENS)
    j = _jornada(db, user, jornada_id)
    _so_responsavel(j, user)
    item = itens.adicionar(db, j, user, dados.categoria, dados.descricao, dados.natureza_final)
    db.commit()
    return _serializar_item(item)


@router.patch("/itens/{item_id}")
def revisar_item(item_id: int, dados: ItemPatch, user: Usuario = Depends(usuario_atual),
                 db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.REVISAR_ITENS)
    item = itens.obter(db, item_id)
    j = _jornada(db, user, item.jornada_id)
    _so_responsavel(j, user)
    itens.revisar(db, item, j, user, dados.acao, dados.natureza_final, dados.descricao, dados.categoria)
    db.commit()
    return _serializar_item(item)


@router.get("/itens/{item_id}/evidencia")
def evidencia(item_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Evidência a um clique: trecho e segmento da transcrição (offsets valem no texto mascarado)."""
    item = itens.obter(db, item_id)
    _jornada(db, user, item.jornada_id)
    reuniao = db.get(Reuniao, item.reuniao_id) if item.reuniao_id else None
    trechos = []
    for ev in item.evidencias:
        seg = next((s for s in (reuniao.segmentos if reuniao else []) if s["ordem"] == ev["segmento_ordem"]), None)
        if seg:
            trechos.append({**ev, "reuniao_id": reuniao.id, "falante": seg["falante"],
                            "texto_mascarado": seg["texto_mascarado"], "texto": seg["texto_original"]})
    return {"item_id": item.id, "origem": item.origem.value, "evidencias": trechos,
            "aviso": None if trechos else "sem evidência: tratado como inferido"}


def _so_responsavel(j: Jornada, user: Usuario) -> None:
    if j.responsavel_id != user.id:
        raise SemPermissao("Este lead pertence a outro analista.")


# --- pendências -------------------------------------------------------------------

@router.get("/jornadas/{jornada_id}/pendencias")
def listar_pendencias(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    ps = db.scalars(select(Pendencia).where(Pendencia.jornada_id == j.id).order_by(Pendencia.severidade, Pendencia.id))
    return [_serializar_pendencia(p) for p in ps]


@router.post("/pendencias/{pendencia_id}/resolver")
def resolver_pendencia(pendencia_id: int, dados: PendenciaResolver, user: Usuario = Depends(usuario_atual),
                       db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.REVISAR_ITENS)
    pend = pendencias.obter(db, pendencia_id)
    j = _jornada(db, user, pend.jornada_id)
    _so_responsavel(j, user)
    pendencias.resolver(db, pend, user, dados.acao, dados.justificativa, dados.descricao)
    db.commit()
    return _serializar_pendencia(pend)


# --- gates ------------------------------------------------------------------------

@router.get("/jornadas/{jornada_id}/gates")
def gates(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return jornadas.gates_do_usuario(db, _jornada(db, user, jornada_id), user)


@router.post("/jornadas/{jornada_id}/validar")
def aprovar_validacao(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """G2: aprovar a validação da ficha."""
    permissoes.exigir(user, Acao.VALIDAR_G2)
    j = _jornada(db, user, jornada_id)
    orquestrador.aprovar_g2(db, j, user)
    db.commit()
    return {"estado": j.estado.value}


@router.post("/jornadas/{jornada_id}/handoff", status_code=201)
def enviar_handoff(jornada_id: int, dados: HandoffIn, user: Usuario = Depends(usuario_atual),
                   db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    p = pacote.enviar(db, j, user, dados.gerente_id)
    db.commit()
    return _serializar_pacote(p, db, completo=True)


@router.get("/jornadas/{jornada_id}/pacotes")
def listar_pacotes(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    return [_serializar_pacote(p, db) for p in pacote.listar(db, j.id)]


@router.get("/pacotes/{pacote_id}")
def ver_pacote(pacote_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    p = pacote.obter(db, pacote_id)
    _jornada(db, user, p.jornada_id)
    return _serializar_pacote(p, db, completo=True)


@router.post("/jornadas/{jornada_id}/handoff/aceitar")
def aceitar_handoff(jornada_id: int, dados: AceiteIn, user: Usuario = Depends(usuario_atual),
                    db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.ACEITAR_G3)
    j = _jornada(db, user, jornada_id)
    p = pacote.aceitar(db, j, user, dados.versao)
    db.commit()
    return {"estado": j.estado.value, "versao": p.versao}


@router.post("/jornadas/{jornada_id}/handoff/devolver")
def devolver_handoff(jornada_id: int, dados: DevolucaoIn, user: Usuario = Depends(usuario_atual),
                     db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.ACEITAR_G3)
    j = _jornada(db, user, jornada_id)
    pacote.devolver(db, j, user, dados.comentario)
    db.commit()
    return {"estado": j.estado.value}


# --- documentos -------------------------------------------------------------------

@router.get("/jornadas/{jornada_id}/documentos")
def historico_documentacao(jornada_id: int, user: Usuario = Depends(usuario_atual),
                           db: Session = Depends(get_db)):
    """Histórico de documentação: documentos versionados + pacotes + o que vem após o aceite."""
    j = _jornada(db, user, jornada_id)
    docs = [_serializar_documento(d) for d in documentos.listar(db, j.id)]
    pacotes = [{"tipo": "pacote_handoff", **_serializar_pacote(p, db)} for p in pacote.listar(db, j.id)]
    pos_aceite = [t.value for t in (TipoDocumento.BRIEFING_PROJETO, TipoDocumento.PAUTA_KICKOFF)
                  if not any(d["tipo"] == t.value for d in docs)]
    return {"documentos": docs, "pacotes": pacotes, "apos_o_aceite": pos_aceite}


@router.post("/jornadas/{jornada_id}/documentos", status_code=201)
def gerar_documento(jornada_id: int, dados: DocumentoNovo, user: Usuario = Depends(usuario_atual),
                    db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    d = documentos.gerar(db, j, user, dados.tipo)
    db.commit()
    return _serializar_documento(d, completo=True)


@router.get("/documentos/{documento_id}")
def ver_documento(documento_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    d = documentos.obter(db, documento_id)
    _jornada(db, user, d.jornada_id)
    return _serializar_documento(d, completo=True)


@router.put("/documentos/{documento_id}")
def editar_documento(documento_id: int, dados: DocumentoEdicao, user: Usuario = Depends(usuario_atual),
                     db: Session = Depends(get_db)):
    d = documentos.obter(db, documento_id)
    _jornada(db, user, d.jornada_id)
    novo = documentos.editar(db, d, user, dados.conteudo_md)
    db.commit()
    return _serializar_documento(novo, completo=True)


@router.post("/documentos/{documento_id}/aprovar")
def aprovar_documento(documento_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    d = documentos.obter(db, documento_id)
    _jornada(db, user, d.jornada_id)
    documentos.aprovar(db, d, user)
    db.commit()
    return _serializar_documento(d, completo=True)


@router.get("/documentos/{documento_id}/exportar", response_class=PlainTextResponse)
def exportar_documento(documento_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    d = documentos.obter(db, documento_id)
    _jornada(db, user, d.jornada_id)
    return PlainTextResponse(d.conteudo_md, media_type="text/markdown; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{d.tipo.value}_v{d.versao}.md"'})


@router.post("/jornadas/{jornada_id}/concluir")
def concluir(jornada_id: int, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    j = _jornada(db, user, jornada_id)
    documentos.concluir(db, j, user)
    db.commit()
    return {"estado": j.estado.value}
