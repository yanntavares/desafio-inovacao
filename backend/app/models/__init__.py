"""Modelo de dados enxuto do MVP (10 tabelas).

Cadeia de rastreabilidade: Documento -> Item -> evidência -> segmento da Reuniao.
A Jornada é o agregado central; só o orquestrador (services/) muda `Jornada.estado`.

O que é JSON em vez de tabela (a integridade é checada no código e por teste):
- Reuniao.segmentos   lista de {ordem, falante, texto_original, texto_mascarado}
- Reuniao.mascaras    lista de {placeholder, tipo, valor_original}; nunca vai ao provedor
- Item.evidencias     lista de {segmento_ordem, trecho, inicio, fim}
- Documento.itens     lista de {paragrafo, item_ids}
"""

from app.models.auditoria import Auditoria  # noqa: F401
from app.models.documento import Documento  # noqa: F401
from app.models.item import Item  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.jornada import Jornada, Reuniao  # noqa: F401
from app.models.pacote import Aprovacao, PacoteHandoff  # noqa: F401
from app.models.pendencia import Pendencia  # noqa: F401
from app.models.usuario import Usuario  # noqa: F401
