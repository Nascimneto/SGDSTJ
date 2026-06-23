<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

// Mesmos filtros opcionais que api/estatisticas/resumo.php e distribuicao.php.
$dataDe       = trim((string)($_GET['data_de'] ?? ''));
$dataAte      = trim((string)($_GET['data_ate'] ?? ''));
$utilizadorId = (int)($_GET['utilizador'] ?? 0);

$cond   = [];
$params = [];
if ($dataDe !== '')  { $cond[] = 'DATE(p.data_registo) >= ?'; $params[] = $dataDe; }
if ($dataAte !== '') { $cond[] = 'DATE(p.data_registo) <= ?'; $params[] = $dataAte; }
if ($utilizadorId)   { $cond[] = 'p.registado_por = ?';       $params[] = $utilizadorId; }
$ondeJoin = $cond ? ' AND ' . implode(' AND ', $cond) : '';

$stmt = $pdo->prepare(
    "SELECT est.codigo, est.label, est.ordem, COUNT(p.id) AS total
     FROM estados_processo est
     LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
     GROUP BY est.id, est.codigo, est.label, est.ordem
     ORDER BY est.ordem"
);
$stmt->execute($params);
$porEstado = $stmt->fetchAll();

// Os estados já têm uma ordem sequencial (entry -> analysis -> distributed ->
// concluded -> archived), por isso a "conversão" do funil é só aritmética
// sobre os totais já agregados (já filtrados acima) — sem SQL dedicado.
$funil    = [];
$anterior = null;
foreach ($porEstado as $e) {
    $conversao = ($anterior && $anterior['total'] > 0) ? round($e['total'] / $anterior['total'] * 100, 1) : null;
    $funil[] = [
        'codigo'    => $e['codigo'],
        'label'     => $e['label'],
        'total'     => (int)$e['total'],
        'conversao' => $conversao,
    ];
    $anterior = $e;
}

echo json_encode(['funil' => $funil]);
