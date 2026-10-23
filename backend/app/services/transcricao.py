"""Entrada da transcrição: parsing, segmentação e mascaramento (tudo em código, sem IA).

O texto original fica guardado e só aparece na interface; o provedor de IA recebe apenas
`texto_mascarado`.
"""

import hashlib
import re

from app.core.config import get_settings
from app.services.erros import ErroNegocio

FORMATOS = {"txt", "md", "vtt", "srt", "colado"}

_TEMPO = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}\s*-->")
_FALANTE = re.compile(r"^([A-Za-zÀ-ÿ][\w À-ÿ().'-]{0,40}):\s+(.+)$", re.DOTALL)
_TAG_VOZ = re.compile(r"^<v\s+([^>]+)>(.*?)(</v>)?$", re.DOTALL)


def formato_do_arquivo(nome: str) -> str:
    ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""
    if ext not in FORMATOS - {"colado"}:
        raise ErroNegocio(
            "Formato não aceito. Envie um arquivo .txt, .md, .vtt ou .srt, ou cole o texto."
        )
    return ext


def contar_palavras(texto: str) -> int:
    return len(texto.split())


def hash_texto(texto: str) -> str:
    return hashlib.sha256(texto.encode()).hexdigest()


def _falante_e_fala(bruto: str) -> tuple[str, str]:
    bruto = bruto.strip()
    if m := _TAG_VOZ.match(bruto):
        return m.group(1).strip(), m.group(2).strip()
    if m := _FALANTE.match(bruto):
        return m.group(1).strip(), m.group(2).strip()
    return "", bruto


def _blocos_legenda(texto: str) -> list[str]:
    """VTT e SRT: cada cue vira um bloco, sem cabeçalho, índice nem marca de tempo."""
    blocos = []
    for cue in re.split(r"\n\s*\n", texto.replace("\r\n", "\n").strip()):
        linhas = [ln for ln in cue.split("\n") if ln.strip()]
        if not linhas or linhas[0].strip().upper().startswith(("WEBVTT", "NOTE", "STYLE")):
            continue
        linhas = [ln for ln in linhas if not _TEMPO.match(ln.strip())]
        if linhas and linhas[0].strip().isdigit():  # índice do SRT / id do cue
            linhas = linhas[1:]
        if linhas:
            blocos.append(" ".join(ln.strip() for ln in linhas))
    return blocos


def segmentar(texto: str, formato: str) -> list[dict]:
    if formato in ("vtt", "srt"):
        blocos = _blocos_legenda(texto)
    else:
        blocos = [b for b in re.split(r"\n\s*\n", texto.replace("\r\n", "\n")) if b.strip()]
        if len(blocos) == 1:  # sem linhas em branco: uma fala por linha
            blocos = [b for b in blocos[0].split("\n") if b.strip()]
    segmentos = []
    for bloco in blocos:
        falante, fala = _falante_e_fala(bloco)
        if fala:
            segmentos.append({"ordem": len(segmentos) + 1, "falante": falante, "texto_original": fala})
    return segmentos


# --- mascaramento -----------------------------------------------------------------

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_CNPJ = re.compile(r"(?<!\d)(?:\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}|\d{14})(?!\d)")
_CPF_FMT = re.compile(r"(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)")
_ONZE = re.compile(r"(?<!\d)\d{11}(?!\d)")
_TELEFONE = re.compile(
    r"(?<![\d])(?:\+?55\s?)?(?:\(\d{2}\)\s?\d{4,5}[-\s]?\d{4}|(?:\d{2}\s?)?9?\d{4}-\d{4})(?!\d)"
)


def _cpf_valido(cpf: str) -> bool:
    d = [int(c) for c in cpf if c.isdigit()]
    if len(d) != 11 or len(set(d)) == 1:
        return False
    for n in (9, 10):
        soma = sum(d[i] * (n + 1 - i) for i in range(n))
        if (soma * 10 % 11) % 10 != d[n]:
            return False
    return True


class Mascarador:
    """Troca dado pessoal por placeholder estável ([EMAIL_1]); o mesmo valor reaproveita o rótulo."""

    def __init__(self) -> None:
        self.mascaras: list[dict] = []
        self._por_valor: dict[tuple[str, str], str] = {}

    def _placeholder(self, tipo: str, valor: str) -> str:
        chave = (tipo, valor)
        if chave not in self._por_valor:
            n = sum(1 for m in self.mascaras if m["tipo"] == tipo) + 1
            ph = f"[{tipo.upper()}_{n}]"
            self._por_valor[chave] = ph
            self.mascaras.append({"placeholder": ph, "tipo": tipo, "valor_original": valor})
        return self._por_valor[chave]

    def aplicar(self, texto: str) -> str:
        texto = _EMAIL.sub(lambda m: self._placeholder("email", m.group()), texto)
        texto = _CNPJ.sub(lambda m: self._placeholder("cnpj", m.group()), texto)
        texto = _CPF_FMT.sub(lambda m: self._placeholder("cpf", m.group()), texto)
        texto = _ONZE.sub(
            lambda m: self._placeholder("cpf" if _cpf_valido(m.group()) else "telefone", m.group()),
            texto,
        )
        return _TELEFONE.sub(lambda m: self._placeholder("telefone", m.group()), texto)


def processar(texto: str, formato: str) -> dict:
    """Valida, segmenta e mascara. Devolve o que a reunião guarda."""
    texto = texto.strip()
    if not texto:
        raise ErroNegocio("A transcrição está vazia. Cole o texto ou envie um arquivo.")
    limite = get_settings().max_transcript_words
    palavras = contar_palavras(texto)
    if palavras > limite:
        raise ErroNegocio(
            f"Este arquivo passa de {limite // 1000} mil palavras. "
            "Divida em duas reuniões ou converta para .txt."
        )
    segmentos = segmentar(texto, formato)
    if not segmentos:
        raise ErroNegocio("Não encontrei falas neste arquivo. Confira o formato.")
    masc = Mascarador()
    for seg in segmentos:
        seg["texto_mascarado"] = masc.aplicar(seg["texto_original"])
    return {
        "texto_original": texto,
        "texto_hash": hash_texto(texto),
        "qtd_palavras": palavras,
        "formato": formato,
        "segmentos": segmentos,
        "mascaras": masc.mascaras,
    }
