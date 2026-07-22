<?php
require_once __DIR__ . '/../Models/ProcessoModel.php';

class ProcessoController
{
    private ProcessoModel $model;

    public function __construct()
    {
        $this->model = new ProcessoModel(Database::pdo());
    }

    /** GET processos.php — página HTML. */
    public function index(): void
    {
        View::render('processos/index', [
            'paginaActiva' => 'processos',
            'tituloPagina' => 'Lista de Processos',
            'especies'     => $this->model->listarEspeciesActivas(),
            'estados'      => $this->model->listarEstados(),
            'magistrados'  => $this->model->listarMagistradosActivos(),
            'pageSize'     => $this->model->obterTamanhoPagina(),
        ]);
    }

    /** GET api/processos/listar.php */
    public function listar(): void
    {
        echo json_encode(['items' => $this->model->listarComFiltros($_GET)]);
    }

    /** GET api/processos/obter.php */
    public function obter(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $processo = $this->model->obterPorId($id);
        if (!$processo) {
            http_response_code(404);
            echo json_encode(['erro' => 'Processo não encontrado.']);
            return;
        }
        echo json_encode(['processo' => $processo]);
    }

    /** POST api/processos/criar.php — chamador já correu ApiGuard::exigirEscrita(). */
    public function criar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $resultado = $this->model->criar($dados, (int)$_SESSION['uid'], (string)$_SESSION['nome']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true, 'id' => $resultado['id'], 'numero_processo' => $resultado['numero_processo']]);
    }

    /** POST api/processos/atualizar.php — chamador já correu ApiGuard::exigirEscrita(). */
    public function atualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $resultado = $this->model->atualizar($id, $dados, (int)$_SESSION['uid'], (string)$_SESSION['nome']);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }

    /** POST api/processos/eliminar.php — chamador já correu ApiGuard::exigirPerfil(['Administrador']). */
    public function eliminar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = (int)($dados['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['erro' => 'id inválido.']);
            return;
        }
        $resultado = $this->model->eliminar($id);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }

    /** GET api/processos/contagem-entrada.php */
    public function contagemEntrada(): void
    {
        echo json_encode(['total' => $this->model->contarEmEstado('entry')]);
    }
}
