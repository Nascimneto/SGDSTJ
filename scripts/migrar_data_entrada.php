<?php
/**
 * Migração: adiciona os campos "Data de Entrada" (processos.data_entrada) e
 * "Notificação 1" (datas_controlo.notificacao1), e actualiza a vista
 * v_processos_completos para os expor. Não apaga nem altera dados existentes.
 *
 * Só pode ser executado via CLI: php scripts/migrar_data_entrada.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../app/bootstrap.php';

$pdo = Database::pdo();
$bd  = $pdo->query('SELECT DATABASE()')->fetchColumn();

function sgd_tem_coluna(PDO $pdo, string $bd, string $tabela, string $coluna): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$bd, $tabela, $coluna]);
    return (bool)$stmt->fetchColumn();
}

try {
    if (!sgd_tem_coluna($pdo, $bd, 'processos', 'data_entrada')) {
        $pdo->exec(
            "ALTER TABLE processos
             ADD COLUMN data_entrada DATE NOT NULL DEFAULT (CURRENT_DATE)
             AFTER numero_processo_externo"
        );
        echo "✓ processos.data_entrada criada.\n";
    } else {
        echo "  processos.data_entrada já existe (ignorado).\n";
    }

    if (!sgd_tem_coluna($pdo, $bd, 'datas_controlo', 'notificacao1')) {
        $pdo->exec(
            "ALTER TABLE datas_controlo
             ADD COLUMN notificacao1 DATE NULL
             AFTER notificacao_citacao"
        );
        echo "✓ datas_controlo.notificacao1 criada.\n";
    } else {
        echo "  datas_controlo.notificacao1 já existe (ignorado).\n";
    }

    if (!sgd_tem_coluna($pdo, $bd, 'datas_controlo', 'notificacao2')) {
        $pdo->exec(
            "ALTER TABLE datas_controlo
             ADD COLUMN notificacao2 DATE NULL
             AFTER notificacao1"
        );
        echo "✓ datas_controlo.notificacao2 criada.\n";
    } else {
        echo "  datas_controlo.notificacao2 já existe (ignorado).\n";
    }

    $pdo->exec('DROP VIEW IF EXISTS v_processos_completos');
    $pdo->exec(
        "CREATE VIEW v_processos_completos AS
        SELECT
            p.id,
            p.numero_processo,
            p.numero_processo_externo,
            DATE_FORMAT(p.data_entrada, '%d/%m/%Y')         AS data_entrada,
            DATE_FORMAT(p.data_registo, '%d/%m/%Y %H:%i')   AS data_registo,
            ep.nome                                          AS especie,
            p.partes,
            p.distribuicao,
            p.origem,
            est.label                                        AS estado,
            est.codigo                                       AS estado_codigo,
            est.cor_css                                       AS estado_cor,
            p.observacoes,
            DATE_FORMAT(dc.notificacao_citacao, '%d/%m/%Y')  AS notificacao_citacao,
            DATE_FORMAT(dc.notificacao1,        '%d/%m/%Y')  AS notificacao1,
            DATE_FORMAT(dc.notificacao2,        '%d/%m/%Y')  AS notificacao2,
            DATE_FORMAT(dc.conclusao,           '%d/%m/%Y')  AS conclusao,
            DATE_FORMAT(dc.visto_mp,            '%d/%m/%Y')  AS visto_mp,
            DATE_FORMAT(dc.visto_adjunto1,      '%d/%m/%Y')  AS visto_adjunto1,
            DATE_FORMAT(dc.visto_adjunto2,      '%d/%m/%Y')  AS visto_adjunto2,
            DATE_FORMAT(dc.inscricao_tabela,    '%d/%m/%Y')  AS inscricao_tabela,
            DATE_FORMAT(dc.acordao,             '%d/%m/%Y')  AS acordao,
            DATE_FORMAT(dc.acordao2,            '%d/%m/%Y')  AS acordao2,
            DATE_FORMAT(dc.acordao3,            '%d/%m/%Y')  AS acordao3,
            DATE_FORMAT(dc.notificacao_acordao, '%d/%m/%Y')  AS notificacao_acordao,
            DATE_FORMAT(dc.conta_custas,        '%d/%m/%Y')  AS conta_custas,
            DATE_FORMAT(dc.conta_custas2,       '%d/%m/%Y')  AS conta_custas2,
            DATE_FORMAT(dc.arquivamento,        '%d/%m/%Y')  AS arquivamento,
            u_reg.nome_completo                              AS registado_por,
            u_atu.nome_completo                              AS atualizado_por,
            p.criado_em,
            p.atualizado_em,
            (SELECT COUNT(*) FROM ficheiros_processo f
             WHERE f.processo_id = p.id AND f.eliminado = 0) AS total_ficheiros
        FROM processos p
        LEFT JOIN especies_processo  ep   ON ep.id  = p.especie_id
        LEFT JOIN estados_processo   est  ON est.id = p.estado_id
        LEFT JOIN datas_controlo     dc   ON dc.processo_id = p.id
        LEFT JOIN utilizadores       u_reg ON u_reg.id = p.registado_por
        LEFT JOIN utilizadores       u_atu ON u_atu.id = p.atualizado_por"
    );
    echo "✓ v_processos_completos actualizada.\n";

    echo "\nMigração concluída com sucesso.\n";
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
