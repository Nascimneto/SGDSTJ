<?php
require_once __DIR__ . '/../Models/ConfiguracaoModel.php';

class ConfiguracaoController
{
    private ?ConfiguracaoModel $model = null;

    /** Preguiçoso: index() (GET configuracoes.php) não toca na BD, só renderiza a página. */
    private function model(): ConfiguracaoModel
    {
        return $this->model ??= new ConfiguracaoModel(Database::pdo());
    }

    /** GET configuracoes.php — página HTML. */
    public function index(): void
    {
        View::render('configuracoes/index', [
            'paginaActiva' => 'configuracoes',
            'tituloPagina' => 'Configurações',
        ]);
    }

    /** GET api/configuracoes/obter.php */
    public function obter(): void
    {
        echo json_encode(['configuracoes' => $this->model()->obterTodas()]);
    }

    /** POST api/configuracoes/atualizar.php */
    public function atualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!is_array($dados)) {
            $dados = [];
        }
        $resultado = $this->model()->atualizar($dados);
        if (isset($resultado['erro'])) {
            http_response_code($resultado['codigo']);
            echo json_encode(['erro' => $resultado['erro']]);
            return;
        }
        echo json_encode(['ok' => true]);
    }
}
