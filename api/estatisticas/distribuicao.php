<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

// Mesmos filtros opcionais que api/estatisticas/resumo.php e funil.php.
$dataDe       = trim((string)($_GET['data_de'] ?? ''));
$dataAte      = trim((string)($_GET['data_ate'] ?? ''));
$utilizadorId = (int)($_GET['utilizador'] ?? 0);

$cond   = [];
$params = [];
if ($dataDe !== '')  { $cond[] = 'DATE(p.data_registo) >= ?'; $params[] = $dataDe; }
if ($dataAte !== '') { $cond[] = 'DATE(p.data_registo) <= ?'; $params[] = $dataAte; }
if ($utilizadorId)   { $cond[] = 'p.registado_por = ?';       $params[] = $utilizadorId; }
$ondeJoin = $cond ? ' AND ' . implode(' AND ', $cond) : '';

$stmtEstado = $pdo->prepare(
    "SELECT est.codigo, est.label, est.cor_css, est.ordem, COUNT(p.id) AS total
     FROM estados_processo est
     LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
     GROUP BY est.id, est.codigo, est.label, est.cor_css, est.ordem
     ORDER BY est.ordem"
);
$stmtEstado->execute($params);
$porEstado = $stmtEstado->fetchAll();

$stmtEspecie = $pdo->prepare(
    "SELECT ep.id, ep.nome AS especie, ep.ordem, COUNT(p.id) AS total
     FROM especies_processo ep
     LEFT JOIN processos p ON p.especie_id = ep.id$ondeJoin
     GROUP BY ep.id, ep.nome, ep.ordem
     ORDER BY ep.ordem"
);
$stmtEspecie->execute($params);
$porEspecie = $stmtEspecie->fetchAll();

// Distribuição por utilizador (quem registou cada processo) — quando o
// próprio filtro "utilizador" está activo, esta lista mostra só essa pessoa.
$stmtUtilizador = $pdo->prepare(
    "SELECT u.id, u.nome_completo AS utilizador, COUNT(p.id) AS total
     FROM utilizadores u
     LEFT JOIN processos p ON p.registado_por = u.id$ondeJoin
     GROUP BY u.id, u.nome_completo
     ORDER BY total DESC, u.nome_completo"
);
$stmtUtilizador->execute($params);
$porUtilizador = $stmtUtilizador->fetchAll();

echo json_encode(['porEstado' => $porEstado, 'porEspecie' => $porEspecie, 'porUtilizador' => $porUtilizador]);
