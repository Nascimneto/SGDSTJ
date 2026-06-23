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
    echo json_encode(['erro' => 'Não pode eliminar a sua própria conta.']);
    exit;
}

// Lido antes do DELETE: depois de eliminado já não há linha para descrever
// na mensagem de auditoria.
$existe = $pdo->prepare('SELECT username, nome_completo FROM utilizadores WHERE id = ?');
$existe->execute([$id]);
$utilizador = $existe->fetch();
if (!$utilizador) {
    http_response_code(404);
    echo json_encode(['erro' => 'Utilizador não encontrado.']);
    exit;
}

$pdo->prepare('DELETE FROM utilizadores WHERE id = ?')->execute([$id]);

sgd_registar_auditoria(
    $pdo,
    'UTILIZADOR',
    'UTILIZADOR_ELIMINADO',
    "Utilizador \"{$utilizador['username']}\" ({$utilizador['nome_completo']}) eliminado."
);

echo json_encode(['ok' => true]);
