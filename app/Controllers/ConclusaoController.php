<?php
require_once __DIR__ . '/../Models/ConclusaoModel.php';

class ConclusaoController
{
    private ConclusaoModel $model;

    public function __construct()
    {
        $this->model = new ConclusaoModel(Database::pdo());
    }

    /** GET conclusao.php — página HTML. */
    public function index(): void
    {
        View::render('conclusao/index', [
            'paginaActiva' => 'conclusao',
            'tituloPagina' => 'Conclusão',
        ]);
    }

    /** GET api/conclusao/pendentes.php */
    public function pendentes(): void
    {
        echo json_encode([
            'pendentes'       => $this->model->listarPendentes(),
            'concluidosCount' => $this->model->contarConcluidos(),
        ]);
    }

    /** POST api/conclusao/guardar.php — chamador já correu ApiGuard::exigirEscrita(). */
    public function guardar(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido.']);
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['processo_id'] ?? 0);
        $data  = trim((string)($dados['conclusao'] ?? ''));

        if (!$id || !$data) {
            http_response_code(400);
            echo json_encode(['erro' => 'Indique o processo e a data de conclusão.']);
            return;
        }

        $resultado = $this->model->guardar($id, $data, (int)$_SESSION['uid'], (string)$_SESSION['nome']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }
}
