<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirEscritaApi();
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?? [];

$especie               = trim((string)($dados['especie'] ?? ''));
$origem                = trim((string)($dados['origem'] ?? ''));
$partes                = trim((string)($dados['partes'] ?? ''));
$distribuicao          = trim((string)($dados['distribuicao'] ?? ''));
$numeroProcessoExterno = trim((string)($dados['numero_processo_externo'] ?? ''));

if ($especie === '' || $origem === '' || $partes === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Preencha espécie, origem e intervenientes/partes.']);
    exit;
}

$especieStmt = $pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
$especieStmt->execute([$especie]);
$especieId = $especieStmt->fetchColumn();
if (!$especieId) {
    http_response_code(400);
    echo json_encode(['erro' => 'Espécie de processo inválida.']);
    exit;
}

$estadoId = $pdo->query("SELECT id FROM estados_processo WHERE codigo = 'entry'")->fetchColumn();

$pdo->prepare(
    'INSERT INTO processos (especie_id, partes, origem, distribuicao, estado_id, numero_processo_externo, registado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
)->execute([$especieId, $partes, $origem, $distribuicao ?: null, $estadoId, $numeroProcessoExterno ?: null, $_SESSION['uid']]);

$novoId = (int)$pdo->lastInsertId();

$numStmt = $pdo->prepare('SELECT numero_processo FROM processos WHERE id = ?');
$numStmt->execute([$novoId]);
$numero = $numStmt->fetchColumn();

$pdo->prepare(
    'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
)->execute([$novoId, 'Processo registado por ' . $_SESSION['nome'], 'REGISTO', $_SESSION['uid']]);

echo json_encode(['ok' => true, 'id' => $novoId, 'numero_processo' => $numero]);
