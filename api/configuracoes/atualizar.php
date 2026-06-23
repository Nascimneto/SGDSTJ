<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../includes/log.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?? [];
if (!is_array($dados) || !$dados) {
    http_response_code(400);
    echo json_encode(['erro' => 'Sem dados para guardar.']);
    exit;
}

// Lista branca de chaves editáveis — nunca aceitar chaves arbitrárias do payload.
$permitidas = [
    'tribunal_nome', 'tribunal_endereco', 'tribunal_email', 'prefixo_numeracao',
    'processos_pagina', 'sessao_expira_min', 'max_tentativas_login', 'bloqueio_min', 'registo_auditoria',
];

$stmt = $pdo->prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
$alteradas = [];
foreach ($dados as $chave => $valor) {
    if (!in_array($chave, $permitidas, true)) {
        continue;
    }
    $stmt->execute([$chave, (string)$valor]);
    $alteradas[] = $chave;
}

if ($alteradas) {
    sgd_registar_auditoria(
        $pdo,
        'CONFIGURACAO',
        'CONFIGURACAO_ALTERADA',
        'Configurações actualizadas: ' . implode(', ', $alteradas) . '.'
    );
}

echo json_encode(['ok' => true]);
