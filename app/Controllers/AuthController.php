<?php
require_once __DIR__ . '/../Models/AuthModel.php';
require_once __DIR__ . '/../Models/ConfiguracaoModel.php';
require_once __DIR__ . '/../Core/ApiGuard.php';

class AuthController
{
    private AuthModel $model;
    private ConfiguracaoModel $configuracoes;

    /**
     * Sem construtor a abrir ligação à BD: index() (GET index.php) nunca
     * tocava na BD directamente no ficheiro original — só Session::configurar()
     * o faz, e já cai graciosamente para um valor por defeito se a BD estiver
     * em baixo. Abrir ligação aqui no construtor faria a própria página de
     * login deixar de carregar (503 JSON) só por a BD estar indisponível.
     */
    private function modelos(): array
    {
        $pdo = Database::pdo();
        return [new AuthModel($pdo), new ConfiguracaoModel($pdo)];
    }

    /** GET index.php — página HTML de login (sem PageGuard: é o ponto de entrada para quem não está autenticado). */
    public function index(): void
    {
        Auth::iniciarSessao();
        if (Auth::autenticado()) {
            header('Location: painel.php');
            exit;
        }
        View::render('login/index', []);
    }

    /** POST api/auth/login.php */
    public function login(): void
    {
        Auth::iniciarSessao();
        header('Content-Type: application/json; charset=utf-8');
        [$this->model, $this->configuracoes] = $this->modelos();

        if (!ApiGuard::exigirMetodo('POST')) {
            return;
        }

        $dados    = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim((string)($dados['username'] ?? ''));
        $senha    = (string)($dados['senha'] ?? '');

        if ($username === '' || $senha === '') {
            http_response_code(400);
            echo json_encode(['erro' => 'Preencha utilizador e senha.']);
            return;
        }

        // Resposta genérica — nunca distinguir "utilizador não existe" de "senha errada".
        $erroGenerico = ['erro' => 'Utilizador ou senha incorrectos.'];

        $user = $this->model->buscarParaLogin($username);

        if (!$user || !$user['activo']) {
            http_response_code(401);
            echo json_encode($erroGenerico);
            return;
        }

        if ($user['bloqueado']) {
            $this->model->registarTentativaContaBloqueada($user['username']);
            http_response_code(423);
            echo json_encode(['erro' => 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.']);
            return;
        }

        if (!password_verify($senha, $user['senha_hash'])) {
            $maxTentativas = (int)$this->configuracoes->obter('max_tentativas_login', 5);
            $bloqueioMin   = (int)$this->configuracoes->obter('bloqueio_min', 15);
            $this->model->registarTentativaFalha((int)$user['id'], $user['username'], (int)$user['tentativas_falha'], $maxTentativas, $bloqueioMin);

            http_response_code(401);
            echo json_encode($erroGenerico);
            return;
        }

        // Sucesso — renovar id de sessão (mitiga session fixation).
        session_regenerate_id(true);

        $perfil = $this->model->obterPerfilCodigo((int)$user['perfil_id']);

        $expiraMin = (int)$this->configuracoes->obter('sessao_expira_min', 60);
        $this->model->registarLoginSucesso((int)$user['id'], $user['username'], $expiraMin);

        $_SESSION['uid']      = $user['id'];
        $_SESSION['perfil']   = $perfil;
        $_SESSION['nome']     = $user['nome_completo'];
        $_SESSION['username'] = $user['username'];
        // Lido por Auth::deveTrocarSenha() (app/Core/PageGuard.php) para forçar a troca.
        $_SESSION['obrigar_troca_senha'] = (bool)$user['obrigar_troca_senha'];

        echo json_encode([
            'ok'          => true,
            'perfil'      => $perfil,
            'nome'        => $user['nome_completo'],
            'trocarSenha' => (bool)$user['obrigar_troca_senha'],
        ]);
    }

    /** POST api/auth/logout.php */
    public function logout(): void
    {
        Auth::iniciarSessao();
        header('Content-Type: application/json; charset=utf-8');

        if (!empty($_SESSION['uid'])) {
            try {
                [$this->model] = $this->modelos();
                $this->model->encerrarSessoesAbertas((int)$_SESSION['uid'], (string)($_SESSION['username'] ?? ''));
            } catch (Throwable $e) {
                // não bloquear o logout por falha no registo de auditoria
            }
        }

        $_SESSION = [];
        session_destroy();

        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);

        echo json_encode(['ok' => true]);
    }
}
