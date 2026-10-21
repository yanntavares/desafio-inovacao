"""Erros de regra de negócio; a API os traduz em respostas com mensagem para o usuário."""


class ErroNegocio(Exception):
    def __init__(self, mensagem: str, status: int = 422, codigo: str = "regra_negocio"):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status
        self.codigo = codigo


class SemPermissao(ErroNegocio):
    def __init__(self, mensagem: str = "Seu papel não permite esta ação."):
        super().__init__(mensagem, 403, "sem_permissao")


class NaoEncontrado(ErroNegocio):
    def __init__(self, o_que: str = "Registro"):
        super().__init__(f"{o_que} não encontrado.", 404, "nao_encontrado")
