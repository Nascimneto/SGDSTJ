<?php
require_once __DIR__ . '/../../includes/auth_funcoes.php';
require_once __DIR__ . '/../../config/conexao.php';

sgd_iniciar_sessao();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$dados    = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim((string)($dados['username'] ?? ''));
$senha    = (string)($dados['senha'] ?? '');

if ($username === '' || $senha === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Preencha utilizador e senha.']);
    exit;
}

$pdo = obterConexao();

function sgd_config(PDO $pdo, string $chave, $default)
{
    $stmt = $pdo->prepare('SELECT valor FROM configuracoes WHERE chave = ?');
    $stmt->execute([$chave]);
    $valor = $stmt->fetchColumn();
    return $valor === false ? $default : $valor;
}

// Resposta genérica — nunca distinguir "utilizador não existe" de "senha errada"
$erroGenerico = ['erro' => 'Utilizador ou senha incorrectos.'];

// Comparação de bloqueio feita em SQL (NOW() do MySQL), nunca com o relógio
// do PHP — evita falhas de bloqueio por desalinhamento de fuso horário/relógio
// entre o servidor de aplicação e o servidor de base de dados.
$stmt = $pdo->prepare(
    'SELECT id, username, senha_hash, nome_completo, perfil_id, activo, tentativas_falha, obrigar_troca_senha,
            (bloqueado_ate IS NOT NULL AND bloqueado_ate > NOW()) AS bloqueado
     FROM utilizadores WHERE username = ?'
);
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !$user['activo']) {
    http_response_code(401);
    echo json_encode($erroGenerico);
    exit;
}

if ($user['bloqueado']) {
    http_response_code(423);
    echo json_encode(['erro' => 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.']);
    exit;
}

if (!password_verify($senha, $user['senha_hash'])) {
    $maxTentativas = (int)sgd_config($pdo, 'max_tentativas_login', 5);
    $bloqueioMin   = (int)sgd_config($pdo, 'bloqueio_min', 15);
    $tentativas    = $user['tentativas_falha'] + 1;

    if ($tentativas >= $maxTentativas) {
        $pdo->prepare('UPDATE utilizadores SET tentativas_falha = ?, bloqueado_ate = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?')
            ->execute([$tentativas, $bloqueioMin, $user['id']]);
    } else {
        $pdo->prepare('UPDATE utilizadores SET tentativas_falha = ? WHERE id = ?')
            ->execute([$tentativas, $user['id']]);
    }

    http_response_code(401);
    echo json_encode($erroGenerico);
    exit;
}

// Sucesso — renovar id de sessão (mitiga session fixation)
session_regenerate_id(true);

$stmtPerfil = $pdo->prepare('SELECT codigo FROM perfis WHERE id = ?');
$stmtPerfil->execute([$user['perfil_id']]);
$perfil = $stmtPerfil->fetchColumn();

$pdo->prepare('UPDATE utilizadores SET tentativas_falha = 0, bloqueado_ate = NULL, ultimo_acesso = NOW() WHERE id = ?')
    ->execute([$user['id']]);

$_SESSION['uid']                 = $user['id'];
$_SESSION['perfil']              = $perfil;
$_SESSION['nome']                = $user['nome_completo'];
$_SESSION['username']            = $user['username'];
// Lido por sgd_deve_trocar_senha() em includes/guard.php para forçar a troca.
$_SESSION['obrigar_troca_senha'] = (bool)$user['obrigar_troca_senha'];

$expiraMin = (int)sgd_config($pdo, 'sessao_expira_min', 60);
$token     = bin2hex(random_bytes(32));

$pdo->prepare(
    'INSERT INTO sessoes_utilizador (utilizador_id, token, ip_origem, user_agent, expira_em)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))'
)->execute([
    $user['id'],
    $token,
    $_SERVER['REMOTE_ADDR'] ?? null,
    substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300),
    $expiraMin,
]);

echo json_encode([
    'ok'           => true,
    'perfil'       => $perfil,
    'nome'         => $user['nome_completo'],
    'trocarSenha'  => (bool)$user['obrigar_troca_senha'],
]);
