<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$total = (int)$pdo->query(
    "SELECT COUNT(*) FROM processos p JOIN estados_processo e ON e.id = p.estado_id WHERE e.codigo = 'entry'"
)->fetchColumn();

echo json_encode(['total' => $total]);
