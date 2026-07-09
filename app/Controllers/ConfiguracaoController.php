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
        if (!ApiGuard::exigirMetodo('POST')) return;
        $dados = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!is_array($dados)) $dados = [];
        $resultado = $this->model()->atualizar($dados);
        if (isset($resultado['erro'])) { http_response_code($resultado['codigo']); echo json_encode(['erro' => $resultado['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    /* ── Espécies ── */
    public function especiesListar(): void  { echo json_encode(['especies' => $this->model()->listarEspecies()]); }

    public function especiesCriar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->criarEspecie((string)($d['nome'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode($r);
    }

    public function especiesAtualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->atualizarEspecie((int)($d['id'] ?? 0), (string)($d['nome'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    public function especiesToggle(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->model()->toggleEspecie((int)($d['id'] ?? 0));
        echo json_encode(['ok' => true]);
    }

    public function especiesEliminar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->eliminarEspecie((int)($d['id'] ?? 0));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    /* ── Estados ── */
    public function estadosListar(): void { echo json_encode(['estados' => $this->model()->listarEstados()]); }

    public function estadosAtualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->atualizarEstado((int)($d['id'] ?? 0), (string)($d['label'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    public function estadosCriar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->criarEstado((string)($d['label'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode($r);
    }

    public function estadosEliminar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->eliminarEstado((int)($d['id'] ?? 0));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    /* ── Perfis ── */
    public function perfisListar(): void { echo json_encode(['perfis' => $this->model()->listarPerfisCfg()]); }

    public function perfisAtualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->atualizarPerfil((int)($d['id'] ?? 0), (string)($d['descricao'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    /* ── Departamentos ── */
    public function departamentosListar(): void { echo json_encode(['departamentos' => $this->model()->listarDepartamentos()]); }

    public function departamentosCriar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->criarDepartamento((string)($d['nome'] ?? ''), (string)($d['sigla'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode($r);
    }

    public function departamentosAtualizar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->atualizarDepartamento((int)($d['id'] ?? 0), (string)($d['nome'] ?? ''), (string)($d['sigla'] ?? ''));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }

    public function departamentosToggle(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->model()->toggleDepartamento((int)($d['id'] ?? 0));
        echo json_encode(['ok' => true]);
    }

    public function departamentosEliminar(): void
    {
        if (!ApiGuard::exigirMetodo('POST')) return;
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $r = $this->model()->eliminarDepartamento((int)($d['id'] ?? 0));
        if (isset($r['erro'])) { http_response_code($r['codigo']); echo json_encode(['erro' => $r['erro']]); return; }
        echo json_encode(['ok' => true]);
    }
}
