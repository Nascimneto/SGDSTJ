<?php
/**
 * Auditoria do sistema (auditoria_sistema) — acções administrativas fora
 * do âmbito de um processo. Distinta de api/auditoria/listar.php, que lista
 * o histórico por processo (historico_processo).
 */
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$where  = [];
$params = [];

if (!empty($_GET['data_de'])) {
    $where[]            = 'DATE(a.criado_em) >= :data_de';
    $params[':data_de'] = $_GET['data_de'];
}
if (!empty($_GET['data_ate'])) {
    $where[]             = 'DATE(a.criado_em) <= :data_ate';
    $params[':data_ate'] = $_GET['data_ate'];
}
if (!empty($_GET['tipo_evento'])) {
    $where[]                = 'a.tipo_evento = :tipo_evento';
    $params[':tipo_evento'] = $_GET['tipo_evento'];
}
if (!empty($_GET['utilizador'])) {
    $where[]               = 'u.nome_completo = :utilizador';
    $params[':utilizador'] = $_GET['utilizador'];
}
if (!empty($_GET['q'])) {
    $where[] = '(a.mensagem LIKE :q1 OR a.codigo_evento LIKE :q2)';
    $qVal = '%' . $_GET['q'] . '%';
    $params[':q1'] = $qVal;
    $params[':q2'] = $qVal;
}

$sql = 'SELECT a.id, a.criado_em, a.mensagem, a.tipo_evento, a.codigo_evento, a.ip_origem,
               u.nome_completo AS criado_por
        FROM auditoria_sistema a
        LEFT JOIN utilizadores u ON u.id = a.criado_por';
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY a.criado_em DESC';

$limite = isset($_GET['limite']) ? max(1, min(500, (int)$_GET['limite'])) : 100;
$sql .= ' LIMIT :limite';

$stmt = $pdo->prepare($sql);
foreach ($params as $chave => $valor) {
    $stmt->bindValue($chave, $valor);
}
$stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
$stmt->execute();

echo json_encode(['items' => $stmt->fetchAll()]);
