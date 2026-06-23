<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();
$rows = $pdo->query('SELECT chave, valor FROM configuracoes')->fetchAll(PDO::FETCH_KEY_PAIR);

echo json_encode(['configuracoes' => $rows]);
