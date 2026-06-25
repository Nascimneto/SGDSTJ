<?php
require_once __DIR__ . '/../Models/UtilizadorModel.php';

class PerfilController
{
    private ?UtilizadorModel $model = null;

    /** Preguiçoso: index() (GET perfil.php) não toca na BD, só renderiza a página. */
    private function model(): UtilizadorModel
    {
        return $this->model ??= new UtilizadorModel(Database::pdo());
    }

    /** GET perfil.php — página HTML. */
    public function index(): void
    {
        View::render('perfil/index', [
            'paginaActiva' => 'perfil',
            'tituloPagina' => 'O Meu Perfil',
        ]);
    }

    /**
     * POST api/perfil/atualizar.php — "O Meu Perfil" só permite ao próprio
     * trocar a senha; nome e utilizador só são editáveis pelo Administrador
     * (UtilizadorController::atualizar()).
     */
    public function atualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados  = json_decode(file_get_contents('php://input'), true) ?? [];
        $senha  = (string)($dados['senha'] ?? '');
        $senha2 = (string)($dados['senha2'] ?? '');

        $erro = $this->model()->atualizarSenhaProprio((int)$_SESSION['uid'], $senha, $senha2);
        if ($erro !== null) {
            http_response_code(400);
            echo json_encode(['erro' => $erro]);
            return;
        }

        // Limpa o bloqueio lido por PageGuard em cada pedido (sem isto, a sessão
        // actual continuaria presa em perfil.php até novo login).
        $_SESSION['obrigar_troca_senha'] = false;

        echo json_encode(['ok' => true]);
    }
}
