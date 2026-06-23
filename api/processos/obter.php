<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();
$id  = (int)($_GET['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['erro' => 'id inválido.']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM v_processos_completos WHERE id = ?');
$stmt->execute([$id]);
$processo = $stmt->fetch();

if (!$processo) {
    http_response_code(404);
    echo json_encode(['erro' => 'Processo não encontrado.']);
    exit;
}

echo json_encode(['processo' => $processo]);
