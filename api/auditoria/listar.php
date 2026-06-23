<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$where  = [];
$params = [];

if (!empty($_GET['data_de'])) {
    $where[]            = 'DATE(data_evento) >= :data_de';
    $params[':data_de'] = $_GET['data_de'];
}
if (!empty($_GET['data_ate'])) {
    $where[]             = 'DATE(data_evento) <= :data_ate';
    $params[':data_ate'] = $_GET['data_ate'];
}
if (!empty($_GET['tipo_evento'])) {
    $where[]                = 'tipo_evento = :tipo_evento';
    $params[':tipo_evento'] = $_GET['tipo_evento'];
}
if (!empty($_GET['utilizador'])) {
    $where[]               = 'utilizador = :utilizador';
    $params[':utilizador'] = $_GET['utilizador'];
}
if (!empty($_GET['q'])) {
    $where[] = '(numero_processo LIKE :q1 OR descricao LIKE :q2)';
    $qVal = '%' . $_GET['q'] . '%';
    $params[':q1'] = $qVal;
    $params[':q2'] = $qVal;
}

$sql = 'SELECT * FROM v_auditoria_recente';
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY data_evento DESC';

$limite = isset($_GET['limite']) ? max(1, min(500, (int)$_GET['limite'])) : 100;
$sql .= ' LIMIT :limite';

$stmt = $pdo->prepare($sql);
foreach ($params as $chave => $valor) {
    $stmt->bindValue($chave, $valor);
}
$stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
$stmt->execute();

echo json_encode(['items' => $stmt->fetchAll()]);
