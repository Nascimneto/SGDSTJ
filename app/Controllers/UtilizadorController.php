<?php
require_once __DIR__ . '/../Models/UtilizadorModel.php';

class UtilizadorController
{
    private UtilizadorModel $model;

    public function __construct()
    {
        $this->model = new UtilizadorModel(Database::pdo());
    }

    /** GET utilizadores.php — página HTML. */
    public function index(): void
    {
        View::render('utilizadores/index', [
            'paginaActiva'   => 'utilizadores',
            'tituloPagina'   => 'Utilizadores',
            'perfis'         => $this->model->listarPerfis(),
            'departamentos'  => $this->model->listarDepartamentos(),
        ]);
    }

    /** GET api/utilizadores/listar.php */
    public function listar(): void
    {
        echo json_encode(['items' => $this->model->listar()]);
    }

    /** POST api/utilizadores/criar.php */
    public function criar(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido.']);
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $resultado = $this->model->criar($dados, (int)$_SESSION['uid']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true, 'id' => $resultado['id'], 'senhaInicial' => $resultado['senhaInicial']]);
    }

    /** POST api/utilizadores/atualizar.php */
    public function atualizar(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido.']);
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        $resultado = $this->model->atualizar($id, $dados);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }

    /** POST api/utilizadores/eliminar.php */
    public function eliminar(): void
    {
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $resultado = $this->model->eliminar($id, (int)$_SESSION['uid']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }

    /** POST api/utilizadores/alternar-estado.php */
    public function alternarEstado(): void
    {
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $resultado = $this->model->alternarEstado($id, (int)$_SESSION['uid']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true, 'activo' => $resultado['activo']]);
    }

    /** POST api/utilizadores/resetar-senha.php */
    public function resetarSenha(): void
    {
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $resultado = $this->model->resetarSenha($id);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true, 'senhaTemporaria' => $resultado['senhaTemporaria']]);
    }
}
