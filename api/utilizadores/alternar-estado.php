<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../includes/log.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$dados = json_decode(file_get_contents('php://input'), true) ?? [];
$id    = (int)($dados['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['erro' => 'id inválido.']);
    exit;
}

if ($id === (int)$_SESSION['uid']) {
    http_response_code(400);
    echo json_encode(['erro' => 'Não pode desactivar a sua própria conta.']);
    exit;
}

$existe = $pdo->prepare('SELECT username FROM utilizadores WHERE id = ?');
$existe->execute([$id]);
$username = $existe->fetchColumn();
if ($username === false) {
    http_response_code(404);
    echo json_encode(['erro' => 'Utilizador não encontrado.']);
    exit;
}

$pdo->prepare('UPDATE utilizadores SET activo = NOT activo WHERE id = ?')->execute([$id]);

$novo = $pdo->prepare('SELECT activo FROM utilizadores WHERE id = ?');
$novo->execute([$id]);
$activo = (bool)$novo->fetchColumn();

sgd_registar_auditoria(
    $pdo,
    'UTILIZADOR',
    $activo ? 'UTILIZADOR_ACTIVADO' : 'UTILIZADOR_DESACTIVADO',
    "Utilizador \"$username\" " . ($activo ? 'activado' : 'desactivado') . '.'
);

echo json_encode(['ok' => true, 'activo' => $activo]);
