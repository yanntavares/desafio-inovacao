"""Garante que o metadata cria todas as tabelas e que o fluxo básico de dados funciona."""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models.enums import CategoriaItem, EstadoJornada, OrigemItem, Papel
import app.models as m


def _session() -> Session:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_tabelas_esperadas():
    esperadas = {
        "usuario", "jornada", "reuniao", "item", "pendencia",
        "documento", "pacote_handoff", "aprovacao", "job", "auditoria",
    }
    assert set(Base.metadata.tables) == esperadas


def test_cadeia_item_evidencia_segmento():
    db = _session()
    user = m.Usuario(nome="Ana", email="ana@x.com", papel=Papel.COMERCIAL)
    db.add(user)
    db.flush()

    j = m.Jornada(cliente_nome="ACME", titulo="Portal", responsavel_id=user.id)
    db.add(j)
    db.flush()
    assert j.estado == EstadoJornada.CRIADA

    r = m.Reuniao(
        jornada_id=j.id,
        texto_original="olá, queremos um portal",
        texto_hash="h",
        qtd_palavras=4,
        segmentos=[
            {"ordem": 1, "falante": "Cliente", "texto_original": "olá, queremos um portal",
             "texto_mascarado": "olá, queremos um portal"}
        ],
    )
    db.add(r)
    db.flush()

    item = m.Item(
        jornada_id=j.id,
        reuniao_id=r.id,
        categoria=CategoriaItem.ESCOPO,
        descricao="Portal do cliente",
        origem=OrigemItem.EXPLICITA,
        evidencias=[{"segmento_ordem": 1, "trecho": "queremos um portal"}],
    )
    db.add(item)
    db.commit()

    ev = item.evidencias[0]
    seg = next(s for s in r.segmentos if s["ordem"] == ev["segmento_ordem"])
    assert ev["trecho"] in seg["texto_mascarado"]  # evidência literal no segmento citado
    # natureza final só por ação humana: começa vazia
    assert item.natureza_final is None


def test_job_registra_execucao_de_ia():
    db = _session()
    job = m.Job(tipo="extracao", chave_idempotencia="r1:v1:abc", provedor="mock", tokens_entrada=10)
    db.add(job)
    db.commit()
    assert job.status.value == "pendente"
    assert job.tokens_entrada == 10
