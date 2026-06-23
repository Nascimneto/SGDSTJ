<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$pendentes = $pdo->query('SELECT * FROM v_pendentes_conclusao')->fetchAll();

$concluidos = (int)$pdo->query(
    "SELECT COUNT(*) FROM datas_controlo dc
     JOIN processos p ON p.id = dc.processo_id
     JOIN estados_processo e ON e.id = p.estado_id
     WHERE dc.conclusao IS NOT NULL AND e.codigo <> 'archived'"
)->fetchColumn();

echo json_encode(['pendentes' => $pendentes, 'concluidosCount' => $concluidos]);
