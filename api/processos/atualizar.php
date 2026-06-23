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
$id    = (int)($dados['id'] ?? 0);

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

$especie               = trim((string)($dados['especie'] ?? ''));
$origem                = trim((string)($dados['origem'] ?? ''));
$partes                = trim((string)($dados['partes'] ?? ''));
$distribuicao          = trim((string)($dados['distribuicao'] ?? ''));
$observacoes           = trim((string)($dados['observacoes'] ?? ''));
$estadoCodigo          = trim((string)($dados['estado'] ?? ''));
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

// Datas de controlo — actualiza data + "registado por" (sessão, nunca o payload)
// só para os campos que vierem presentes no pedido.
$camposData = [
    'notificacao_citacao' => null,
    'conclusao'           => 'registado_conclusao_por',
    'visto_mp'            => 'registado_visto_mp_por',
    'visto_adjunto1'      => 'registado_visto_adj1_por',
    'visto_adjunto2'      => 'registado_visto_adj2_por',
    'inscricao_tabela'    => 'registado_tabela_por',
    'acordao'             => 'registado_acordao_por',
    'notificacao_acordao' => null,
    'conta_custas'        => null,
    'arquivamento'        => 'registado_arquivo_por',
];

$dcSets   = [];
$dcParams = [];
foreach ($camposData as $campo => $campoPor) {
    if (array_key_exists($campo, $dados)) {
        $valor      = $dados[$campo] !== '' ? $dados[$campo] : null;
        $dcSets[]   = "$campo = ?";
        $dcParams[] = $valor;
        if ($campoPor) {
            $dcSets[]   = "$campoPor = ?";
            $dcParams[] = $valor !== null ? $_SESSION['uid'] : null;
        }
    }
}

// Regras automáticas de estado (preservam o comportamento original de wfSave()):
// registar acórdão conclui o processo; registar arquivamento arquiva-o.
if (!empty($dados['acordao'])) {
    $estadoCodigo = 'concluded';
}
if (!empty($dados['arquivamento'])) {
    $estadoCodigo = 'archived';
}

$estadoId = null;
if ($estadoCodigo !== '') {
    $estStmt = $pdo->prepare('SELECT id FROM estados_processo WHERE codigo = ?');
    $estStmt->execute([$estadoCodigo]);
    $estadoId = $estStmt->fetchColumn();
}

$pdo->beginTransaction();
try {
    $sets   = ['especie_id = ?', 'partes = ?', 'origem = ?', 'distribuicao = ?', 'observacoes = ?', 'numero_processo_externo = ?', 'atualizado_por = ?'];
    $params = [$especieId, $partes, $origem, $distribuicao ?: null, $observacoes ?: null, $numeroProcessoExterno ?: null, $_SESSION['uid']];
    if ($estadoId) {
        $sets[]   = 'estado_id = ?';
        $params[] = $estadoId;
    }
    $params[] = $id;
    $pdo->prepare('UPDATE processos SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    if ($dcSets) {
        $dcParams[] = $id;
        $pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $dcSets) . ' WHERE processo_id = ?')->execute($dcParams);
    }

    $pdo->prepare(
        'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
    )->execute([$id, 'Editado por ' . $_SESSION['nome'], 'EDICAO', $_SESSION['uid']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('SGD atualizar processo: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['erro' => 'Erro ao guardar alterações.']);
    exit;
}

echo json_encode(['ok' => true]);
