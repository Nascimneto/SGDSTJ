<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

// Filtros opcionais (data_de/data_ate/utilizador) — vêm como ?query string,
// não dá para aplicá-los às views v_relatorio_geral/v_distribuicao_especie
// (sem parâmetros), por isso este endpoint e os outros em api/estatisticas/
// passaram a interrogar processos/datas_controlo directamente.
$dataDe       = trim((string)($_GET['data_de'] ?? ''));
$dataAte      = trim((string)($_GET['data_ate'] ?? ''));
$utilizadorId = (int)($_GET['utilizador'] ?? 0);

$cond   = [];
$params = [];
if ($dataDe !== '')  { $cond[] = 'DATE(p.data_registo) >= ?'; $params[] = $dataDe; }
if ($dataAte !== '') { $cond[] = 'DATE(p.data_registo) <= ?'; $params[] = $dataAte; }
if ($utilizadorId)   { $cond[] = 'p.registado_por = ?';       $params[] = $utilizadorId; }

// Nos LEFT JOIN os filtros vão na condição ON (não num WHERE à parte), para
// os estados sem nenhum processo no intervalo continuarem a aparecer com
// total=0 em vez de desaparecerem da lista.
$ondeJoin  = $cond ? ' AND ' . implode(' AND ', $cond) : '';
$ondeWhere = $cond ? ' WHERE ' . implode(' AND ', $cond) : '';

$stmtEstado = $pdo->prepare(
    "SELECT est.codigo, est.label, est.cor_css, est.ordem, COUNT(p.id) AS total
     FROM estados_processo est
     LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
     GROUP BY est.id, est.codigo, est.label, est.cor_css, est.ordem
     ORDER BY est.ordem"
);
$stmtEstado->execute($params);
$porEstado = $stmtEstado->fetchAll();

$stmtTotais = $pdo->prepare(
    "SELECT
        COUNT(DISTINCT p.id) AS total,
        COUNT(DISTINCT CASE WHEN dc.conclusao IS NOT NULL THEN p.id END) AS com_conclusao,
        COUNT(DISTINCT CASE WHEN dc.inscricao_tabela IS NOT NULL AND dc.acordao IS NULL THEN p.id END) AS em_tabela,
        COUNT(DISTINCT CASE WHEN dc.acordao IS NOT NULL THEN p.id END) AS acordaos
     FROM processos p
     LEFT JOIN datas_controlo dc ON dc.processo_id = p.id$ondeWhere"
);
$stmtTotais->execute($params);
$totais = $stmtTotais->fetch();

echo json_encode([
    'totais'    => $totais,
    'porEstado' => $porEstado,
]);
