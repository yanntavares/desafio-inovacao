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

logging.basicConfig(level=logging.INFO)
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


def main() -> None:
    log.info("worker iniciado")
    while True:
        with SessionLocal() as db:
            job = pegar_proximo_job(db)
            if job is None:
                time.sleep(POLL_SEGUNDOS)
                continue
            # TODO: despachar por job.tipo (extracao, ...)
            log.info("job %s (%s) recebido", job.id, job.tipo)
            job.status = StatusJob.CONCLUIDO
            db.commit()


if __name__ == "__main__":
    main()
