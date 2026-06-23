<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../includes/senha.php';
require_once __DIR__ . '/../../includes/log.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$dados        = json_decode(file_get_contents('php://input'), true) ?? [];
$nome         = trim((string)($dados['nome'] ?? ''));
$username     = trim((string)($dados['username'] ?? ''));
$perfil       = trim((string)($dados['perfil'] ?? ''));
$departamento = trim((string)($dados['departamento'] ?? ''));
$activo       = !empty($dados['activo']) ? 1 : 0;

if ($nome === '' || $username === '' || $perfil === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Preencha nome, utilizador e perfil.']);
    exit;
}

$exist = $pdo->prepare('SELECT id FROM utilizadores WHERE username = ?');
$exist->execute([$username]);
if ($exist->fetchColumn()) {
    http_response_code(409);
    echo json_encode(['erro' => 'Utilizador já existe.']);
    exit;
}

$perfilStmt = $pdo->prepare('SELECT id FROM perfis WHERE codigo = ?');
$perfilStmt->execute([$perfil]);
$perfilId = $perfilStmt->fetchColumn();
if (!$perfilId) {
    http_response_code(400);
    echo json_encode(['erro' => 'Perfil inválido.']);
    exit;
}

$deptId = null;
if ($departamento !== '') {
    $d = $pdo->prepare('SELECT id FROM departamentos WHERE nome = ?');
    $d->execute([$departamento]);
    $deptId = $d->fetchColumn() ?: null;
}

// Senha inicial igual para todos (SGD_SENHA_INICIAL), nunca escolhida pelo
// admin: obriga a troca no primeiro acesso, tal como num reset (resetar-senha.php).
$hash = password_hash(SGD_SENHA_INICIAL, PASSWORD_BCRYPT);

$pdo->prepare(
    'INSERT INTO utilizadores (username, senha_hash, nome_completo, perfil_id, departamento_id, activo, criado_por, obrigar_troca_senha)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
)->execute([$username, $hash, $nome, $perfilId, $deptId, $activo, $_SESSION['uid']]);

// Capturado antes de sgd_registar_auditoria(), que faz o seu próprio INSERT
// (em auditoria_sistema) — lastInsertId() devolveria o id errado depois disso.
$novoId = (int)$pdo->lastInsertId();

sgd_registar_auditoria(
    $pdo,
    'UTILIZADOR',
    'UTILIZADOR_CRIADO',
    "Utilizador \"$username\" ($nome) criado, perfil $perfil."
);

echo json_encode(['ok' => true, 'id' => $novoId, 'senhaInicial' => SGD_SENHA_INICIAL]);
