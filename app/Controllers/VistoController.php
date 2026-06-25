<?php
require_once __DIR__ . '/../Models/VistoModel.php';

class VistoController
{
    private ?VistoModel $model = null;

    /** Preguiçoso: index() (GET vistos.php) não toca na BD, só renderiza a página. */
    private function model(): VistoModel
    {
        return $this->model ??= new VistoModel(Database::pdo());
    }

    /** GET vistos.php — página HTML. */
    public function index(): void
    {
        View::render('vistos/index', [
            'paginaActiva' => 'vistos',
            'tituloPagina' => 'Vistos',
        ]);
    }

    /** GET api/vistos/pendentes.php */
    public function pendentes(): void
    {
        echo json_encode([
            'pendentes'       => $this->model()->listarPendentes(),
            'concluidosCount' => $this->model()->contarConcluidos(),
        ]);
    }

    /** POST api/vistos/guardar.php — chamador já correu ApiGuard::exigirEscrita(). */
    public function guardar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['processo_id'] ?? 0);

        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }

        $resultado = $this->model()->guardar($id, $dados, (int)$_SESSION['uid'], (string)$_SESSION['nome']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }
}
