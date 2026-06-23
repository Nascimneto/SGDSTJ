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
$id    = (int)($dados['processo_id'] ?? 0);
$data  = trim((string)($dados['conclusao'] ?? ''));

if (!$id || !$data) {
    http_response_code(400);
    echo json_encode(['erro' => 'Indique o processo e a data de conclusão.']);
    exit;
}

$existe = $pdo->prepare('SELECT id FROM processos WHERE id = ?');
$existe->execute([$id]);
if (!$existe->fetchColumn()) {
    http_response_code(404);
    echo json_encode(['erro' => 'Processo não encontrado.']);
    exit;
}

// "Registado por" vem sempre da sessão, nunca do payload do cliente.
$pdo->prepare('UPDATE datas_controlo SET conclusao = ?, registado_conclusao_por = ? WHERE processo_id = ?')
    ->execute([$data, $_SESSION['uid'], $id]);

$pdo->prepare(
    'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
)->execute([$id, 'Conclusao: ' . $data . ' por ' . $_SESSION['nome'], 'DATA', $_SESSION['uid']]);

echo json_encode(['ok' => true]);
