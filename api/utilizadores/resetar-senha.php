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

$existe = $pdo->prepare('SELECT username FROM utilizadores WHERE id = ?');
$existe->execute([$id]);
$username = $existe->fetchColumn();
if ($username === false) {
    http_response_code(404);
    echo json_encode(['erro' => 'Utilizador não encontrado.']);
    exit;
}

// Senha temporária aleatória (nunca um valor fixo como "1234"); o utilizador
// é obrigado a trocá-la no próximo acesso (obrigar_troca_senha).
$senhaTemp = bin2hex(random_bytes(5));
$hash      = password_hash($senhaTemp, PASSWORD_BCRYPT);

$pdo->prepare(
    'UPDATE utilizadores SET senha_hash = ?, obrigar_troca_senha = 1, tentativas_falha = 0, bloqueado_ate = NULL WHERE id = ?'
)->execute([$hash, $id]);

sgd_registar_auditoria(
    $pdo,
    'UTILIZADOR',
    'UTILIZADOR_SENHA_RESETADA',
    "Senha de \"$username\" resetada pelo administrador."
);

echo json_encode(['ok' => true, 'senhaTemporaria' => $senhaTemp]);
