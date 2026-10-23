"""Worker: consome a tabela `job` do PostgreSQL (RNF-01).

Por ora só faz o laço de polling; o processamento de extração entra no passo seguinte,
atrás da interface LLMProvider (mock primeiro).
"""

import logging
import time

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Job
from app.models.enums import StatusJob
from app.services import extracao

logging.basicConfig(level=logging.INFO)
# SDK e HTTP em INFO/DEBUG podem registrar o corpo das requisições (transcrição)
for nome in ("anthropic", "httpx"):
    logging.getLogger(nome).setLevel(logging.WARNING)
log = logging.getLogger("worker")

POLL_SEGUNDOS = 2


def pegar_proximo_job(db) -> Job | None:
    """Reserva um job pendente; SKIP LOCKED evita dois workers pegarem o mesmo."""
    stmt = (
        select(Job)
        .where(Job.status == StatusJob.PENDENTE)
        .order_by(Job.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    job = db.execute(stmt).scalar_one_or_none()
    if job:
        job.status = StatusJob.EXECUTANDO
        job.tentativas += 1
        db.commit()
    return job


def processar(db, job: Job) -> None:
    """Despacha por tipo; falha controlada nunca derruba o laço e nunca deixa job preso."""
    try:
        if job.tipo == "extracao":
            extracao.executar(db, job)
        else:
            raise ValueError(f"tipo de job desconhecido: {job.tipo}")
        db.commit()
    except Exception as exc:
        db.rollback()
        log.exception("job %s falhou", job.id)
        job = db.get(Job, job.id)
        extracao.falhar(db, job, str(exc))
        db.commit()


def main() -> None:
    log.info("worker iniciado")
    while True:
        with SessionLocal() as db:
            job = pegar_proximo_job(db)
            if job is None:
                time.sleep(POLL_SEGUNDOS)
                continue
            log.info("job %s (%s) recebido", job.id, job.tipo)
            processar(db, job)


if __name__ == "__main__":
    main()
