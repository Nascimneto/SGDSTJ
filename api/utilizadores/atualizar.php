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
$id           = (int)($dados['id'] ?? 0);
$nome         = trim((string)($dados['nome'] ?? ''));
$username     = trim((string)($dados['username'] ?? ''));
$senha        = (string)($dados['senha'] ?? '');
$perfil       = trim((string)($dados['perfil'] ?? ''));
$departamento = trim((string)($dados['departamento'] ?? ''));
$activo       = !empty($dados['activo']) ? 1 : 0;

if (!$id || $nome === '' || $username === '' || $perfil === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Preencha nome, utilizador e perfil.']);
    exit;
}

$exist = $pdo->prepare('SELECT id FROM utilizadores WHERE username = ? AND id <> ?');
$exist->execute([$username, $id]);
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

$sets   = ['username = ?', 'nome_completo = ?', 'perfil_id = ?', 'departamento_id = ?', 'activo = ?'];
$params = [$username, $nome, $perfilId, $deptId, $activo];

if ($senha !== '') {
    $erroSenha = sgd_validar_senha($senha);
    if ($erroSenha !== null) {
        http_response_code(400);
        echo json_encode(['erro' => $erroSenha]);
        exit;
    }
    $sets[]   = 'senha_hash = ?';
    $params[] = password_hash($senha, PASSWORD_BCRYPT);
    // O admin é quem está a escolher a senha, não o próprio: tal como na
    // criação, força a troca no próximo acesso.
    $sets[]   = 'obrigar_troca_senha = 1';
}
$params[] = $id;

$pdo->prepare('UPDATE utilizadores SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

sgd_registar_auditoria(
    $pdo,
    'UTILIZADOR',
    'UTILIZADOR_EDITADO',
    "Utilizador \"$username\" ($nome) actualizado." . ($senha !== '' ? ' Senha redefinida pelo administrador.' : '')
);

echo json_encode(['ok' => true]);
