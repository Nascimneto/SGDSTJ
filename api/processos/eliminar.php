<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?? [];
$id    = (int)($dados['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['erro' => 'id inválido.']);
    exit;
}

$pdo->prepare('DELETE FROM processos WHERE id = ?')->execute([$id]);
echo json_encode(['ok' => true]);
