<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

// Filtros avançados: estado, espécie, distribuição, intervalo de datas, pesquisa livre.
$where  = [];
$params = [];

if (!empty($_GET['estado'])) {
    $where[]           = 'estado_codigo = :estado';
    $params[':estado'] = $_GET['estado'];
}
if (!empty($_GET['especie'])) {
    $where[]            = 'especie = :especie';
    $params[':especie'] = $_GET['especie'];
}
if (!empty($_GET['distribuicao'])) {
    $where[]                 = 'distribuicao LIKE :distribuicao';
    $params[':distribuicao'] = '%' . $_GET['distribuicao'] . '%';
}
if (!empty($_GET['data_de'])) {
    $where[]            = 'DATE(criado_em) >= :data_de';
    $params[':data_de'] = $_GET['data_de'];
}
if (!empty($_GET['data_ate'])) {
    $where[]             = 'DATE(criado_em) <= :data_ate';
    $params[':data_ate'] = $_GET['data_ate'];
}
if (!empty($_GET['q'])) {
    $where[] = '(numero_processo LIKE :q1 OR numero_processo_externo LIKE :q2 OR partes LIKE :q3 OR origem LIKE :q4 OR especie LIKE :q5 OR distribuicao LIKE :q6)';
    $qVal = '%' . $_GET['q'] . '%';
    $params[':q1'] = $qVal;
    $params[':q2'] = $qVal;
    $params[':q3'] = $qVal;
    $params[':q4'] = $qVal;
    $params[':q5'] = $qVal;
    $params[':q6'] = $qVal;
}

$sql = 'SELECT id, numero_processo, numero_processo_externo, data_registo, especie, partes, distribuicao, origem,
               estado, estado_codigo, estado_cor, observacoes,
               notificacao_citacao, conclusao, visto_mp, visto_adjunto1, visto_adjunto2,
               inscricao_tabela, acordao, notificacao_acordao, conta_custas, arquivamento
        FROM v_processos_completos';

if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY criado_em DESC';

$limite = isset($_GET['limite']) ? max(1, min(500, (int)$_GET['limite'])) : null;
if ($limite) {
    $sql .= ' LIMIT :limite';
}

$stmt = $pdo->prepare($sql);
foreach ($params as $chave => $valor) {
    $stmt->bindValue($chave, $valor);
}
if ($limite) {
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
}
$stmt->execute();

echo json_encode(['items' => $stmt->fetchAll()]);
