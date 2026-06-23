<?php
/**
 * Seed de desenvolvimento: utilizadores + processos de demonstração.
 * Só pode ser executado via CLI (php scripts/seed.php) — nunca via browser.
 * As senhas são guardadas com bcrypt (password_hash), nunca MD5/texto simples.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../config/conexao.php';
require_once __DIR__ . '/../includes/senha.php';

$pdo = obterConexao();

// Mesma senha inicial fixa usada por api/utilizadores/criar.php para todo
// utilizador novo (SGD_SENHA_INICIAL) — também aqui no seed, por consistência.
$utilizadoresSeed = [
    ['username' => 'admin',      'nome' => 'Administrador',     'perfil' => 'Administrador', 'dept' => 'SEC', 'email' => 'admin@supremo.cv',     'activo' => 1],
    ['username' => 'secretaria', 'nome' => 'Maria Santos',      'perfil' => 'Secretario',    'dept' => 'SEC', 'email' => 'msantos@supremo.cv',   'activo' => 1],
    ['username' => 'juiz1',      'nome' => 'Dr. Joao Ferreira', 'perfil' => 'Magistrado',    'dept' => 'TRB', 'email' => 'jferreira@supremo.cv', 'activo' => 1],
    ['username' => 'tecnico',    'nome' => 'Ana Costa',         'perfil' => 'Tecnico',       'dept' => 'SEC', 'email' => 'acosta@supremo.cv',    'activo' => 0],
    ['username' => 'visualizador', 'nome' => 'Carlos Pereira',  'perfil' => 'Visualizador',  'dept' => 'SEC', 'email' => 'cpereira@supremo.cv',  'activo' => 1],
];

$idsPorUsername = [];

foreach ($utilizadoresSeed as $u) {
    $stmt = $pdo->prepare('SELECT id FROM utilizadores WHERE username = ?');
    $stmt->execute([$u['username']]);
    $id = $stmt->fetchColumn();

    if ($id) {
        echo "- {$u['username']} já existe (id {$id}), ignorado.\n";
        $idsPorUsername[$u['username']] = (int)$id;
        continue;
    }

    $perfilStmt = $pdo->prepare('SELECT id FROM perfis WHERE codigo = ?');
    $perfilStmt->execute([$u['perfil']]);
    $perfilId = $perfilStmt->fetchColumn();

    $deptStmt = $pdo->prepare('SELECT id FROM departamentos WHERE sigla = ?');
    $deptStmt->execute([$u['dept']]);
    $deptId = $deptStmt->fetchColumn();

    $hash = password_hash(SGD_SENHA_INICIAL, PASSWORD_BCRYPT);

    // obrigar_troca_senha = 1: mesmo no seed, a senha é "definida por outra
    // pessoa" (o script), por isso a app pede a troca no primeiro login.
    $pdo->prepare(
        'INSERT INTO utilizadores (username, senha_hash, nome_completo, email, perfil_id, departamento_id, activo, obrigar_troca_senha)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    )->execute([$u['username'], $hash, $u['nome'], $u['email'], $perfilId, $deptId, $u['activo']]);

    $idsPorUsername[$u['username']] = (int)$pdo->lastInsertId();
    echo "+ {$u['username']} criado (senha inicial: " . SGD_SENHA_INICIAL . " — trocar no primeiro acesso).\n";
}

// ── Processos de demonstração ──────────────────────────────────────────
function sgd_seed_especie(PDO $pdo, string $nome)
{
    $s = $pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
    $s->execute([$nome]);
    return $s->fetchColumn();
}
function sgd_seed_estado(PDO $pdo, string $codigo)
{
    $s = $pdo->prepare('SELECT id FROM estados_processo WHERE codigo = ?');
    $s->execute([$codigo]);
    return $s->fetchColumn();
}
function sgd_seed_processo_existe(PDO $pdo, string $partes): bool
{
    $s = $pdo->prepare('SELECT id FROM processos WHERE partes = ?');
    $s->execute([$partes]);
    return (bool)$s->fetchColumn();
}

$processosSeed = [
    [
        'partes' => 'Joao Silva vs Ministerio da Justica',
        'especie' => 'Recurso', 'origem' => 'Tribunal da Relacao', 'distribuicao' => 'Dr. Joao Ferreira',
        'estado' => 'analysis', 'obs' => 'Recurso admitido.', 'registado_por' => 'admin',
        'datas' => ['notificacao_citacao' => '2026-05-28', 'inscricao_tabela' => '2026-06-15'],
    ],
    [
        'partes' => 'Empresa ABC Lda vs Banco Nacional',
        'especie' => 'Accao', 'origem' => 'Tribunal Civel', 'distribuicao' => 'Dr. Joao Ferreira',
        'estado' => 'analysis', 'obs' => null, 'registado_por' => 'secretaria',
        'datas' => [
            'notificacao_citacao' => '2026-05-26', 'conclusao' => '2026-05-27',
            'visto_mp' => '2026-05-28', 'visto_adjunto1' => '2026-05-29',
            'inscricao_tabela' => '2026-06-20',
        ],
    ],
    [
        'partes' => 'Maria Andrade vs Pedro Costa',
        'especie' => 'Execucao', 'origem' => 'Tribunal Administrativo', 'distribuicao' => 'Dr. Joao Ferreira',
        'estado' => 'concluded', 'obs' => 'Acordao proferido.', 'registado_por' => 'secretaria',
        'datas' => [
            'notificacao_citacao' => '2026-05-25', 'conclusao' => '2026-05-26',
            'visto_mp' => '2026-05-27', 'visto_adjunto1' => '2026-05-28', 'visto_adjunto2' => '2026-05-29',
            'inscricao_tabela' => '2026-06-05', 'acordao' => '2026-06-10',
            'notificacao_acordao' => '2026-06-12', 'conta_custas' => '2026-06-15',
        ],
    ],
];

foreach ($processosSeed as $p) {
    if (sgd_seed_processo_existe($pdo, $p['partes'])) {
        echo "- processo '{$p['partes']}' já existe, ignorado.\n";
        continue;
    }

    $especieId = sgd_seed_especie($pdo, $p['especie']);
    $estadoId  = sgd_seed_estado($pdo, $p['estado']);
    $regPorId  = $idsPorUsername[$p['registado_por']] ?? null;

    $pdo->prepare(
        'INSERT INTO processos (especie_id, partes, origem, distribuicao, estado_id, observacoes, registado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$especieId, $p['partes'], $p['origem'], $p['distribuicao'], $estadoId, $p['obs'], $regPorId]);

    $processoId = (int)$pdo->lastInsertId();

    if (!empty($p['datas'])) {
        $campos = [];
        $valores = [];
        foreach ($p['datas'] as $campo => $valor) {
            $campos[] = "$campo = ?";
            $valores[] = $valor;
        }
        $valores[] = $processoId;
        $pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $campos) . ' WHERE processo_id = ?')
            ->execute($valores);
    }

    $pdo->prepare(
        'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id)
         VALUES (?, ?, ?, ?)'
    )->execute([$processoId, 'Processo registado', 'REGISTO', $regPorId]);

    echo "+ processo '{$p['partes']}' criado.\n";
}

echo "\nSeed concluído.\n";
