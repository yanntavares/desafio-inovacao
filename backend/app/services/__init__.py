"""Regras de negócio.

Aqui vivem o orquestrador de estados, os gates G2/G3/G4 (checados por papel e estado),
a matriz de obrigatórios, o índice de completude, o pacote de handoff e a auditoria
gravada na mesma transação. Routers e worker chamam esta camada; nunca o contrário.
"""
