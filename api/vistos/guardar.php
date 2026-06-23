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

if (!$id) {
    http_response_code(400);
    echo json_encode(['erro' => 'id inválido.']);
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
$campos = [
    'visto_mp'       => 'registado_visto_mp_por',
    'visto_adjunto1' => 'registado_visto_adj1_por',
    'visto_adjunto2' => 'registado_visto_adj2_por',
];

$sets   = [];
$params = [];
foreach ($campos as $campo => $campoPor) {
    if (!empty($dados[$campo])) {
        $sets[]   = "$campo = ?";
        $params[] = $dados[$campo];
        $sets[]   = "$campoPor = ?";
        $params[] = $_SESSION['uid'];
    }
}

if (!$sets) {
    http_response_code(400);
    echo json_encode(['erro' => 'Indique pelo menos um visto.']);
    exit;
}

$params[] = $id;
$pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $sets) . ' WHERE processo_id = ?')->execute($params);

$pdo->prepare(
    'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
)->execute([$id, 'Vistos actualizados por ' . $_SESSION['nome'], 'DATA', $_SESSION['uid']]);

echo json_encode(['ok' => true]);
