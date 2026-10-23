"""Dois workers nunca reservam o mesmo job (FOR UPDATE SKIP LOCKED)."""

import os
import threading

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import worker
from app.models import Job
from app.models.enums import StatusJob

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"),
                                reason="SKIP LOCKED só existe no PostgreSQL")


def test_dois_workers_nao_pegam_o_mesmo_job(engine):
    with Session(engine) as db:
        db.add_all(Job(tipo="extracao", chave_idempotencia=f"teste-{i}") for i in range(40))
        db.commit()

    pegos: dict[str, list[int]] = {"a": [], "b": []}
    largada = threading.Barrier(2)

    def consumir(nome: str) -> None:
        largada.wait()
        with Session(engine, expire_on_commit=False) as db:
            while job := worker.pegar_proximo_job(db):
                pegos[nome].append(job.id)

    threads = [threading.Thread(target=consumir, args=(n,)) for n in pegos]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    todos = pegos["a"] + pegos["b"]
    assert len(todos) == len(set(todos)) == 40
    assert pegos["a"] and pegos["b"]  # os dois trabalharam ao mesmo tempo
    with Session(engine) as db:
        jobs = db.scalars(select(Job)).all()
        assert all(j.status == StatusJob.EXECUTANDO and j.tentativas == 1 for j in jobs)
