<?php
/**
 * Migração: cria a tabela "magistrados" (lista configurável de nomes para
 * os campos Distribuição e Redistribuição, geridos em Configurações) e
 * semeia-a com os nomes já usados em processos.distribuicao/redistribuicao,
 * para nenhum valor existente desaparecer quando esses campos passam de
 * texto livre a combobox. processos.distribuicao/redistribuicao continuam
 * VARCHAR — sem FK — só o formulário passa a restringir a esta lista.
 *
 * Só pode ser executado via CLI: php scripts/migrar_magistrados.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../app/bootstrap.php';

$pdo = Database::pdo();
$bd  = $pdo->query('SELECT DATABASE()')->fetchColumn();

function sgd_tem_tabela(PDO $pdo, string $bd, string $tabela): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?'
    );
    $stmt->execute([$bd, $tabela]);
    return (bool)$stmt->fetchColumn();
}

try {
    if (!sgd_tem_tabela($pdo, $bd, 'magistrados')) {
        $pdo->exec(
            "CREATE TABLE magistrados (
                id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nome   VARCHAR(150) NOT NULL UNIQUE,
                activo TINYINT(1)   NOT NULL DEFAULT 1,
                ordem  SMALLINT     NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        echo "✓ Tabela magistrados criada.\n";
    } else {
        echo "  Tabela magistrados já existe (ignorado).\n";
    }

    $existentes = $pdo->query('SELECT nome FROM magistrados')->fetchAll(PDO::FETCH_COLUMN);
    $usados = $pdo->query(
        "SELECT DISTINCT TRIM(distribuicao) AS nome FROM processos WHERE distribuicao IS NOT NULL AND TRIM(distribuicao) <> ''
         UNION
         SELECT DISTINCT TRIM(redistribuicao) AS nome FROM processos WHERE redistribuicao IS NOT NULL AND TRIM(redistribuicao) <> ''"
    )->fetchAll(PDO::FETCH_COLUMN);

    $novos = array_values(array_diff($usados, $existentes));
    if ($novos) {
        $maxOrdem = (int)$pdo->query('SELECT COALESCE(MAX(ordem),0) FROM magistrados')->fetchColumn();
        $stmt = $pdo->prepare('INSERT INTO magistrados (nome, ordem) VALUES (?, ?)');
        sort($novos, SORT_STRING | SORT_FLAG_CASE);
        foreach ($novos as $nome) {
            $stmt->execute([$nome, ++$maxOrdem]);
        }
        echo '✓ ' . count($novos) . " magistrado(s) semeado(s) a partir de processos existentes: " . implode(', ', $novos) . "\n";
    } else {
        echo "  Nenhum nome novo a semear.\n";
    }

    echo "\nMigração concluída com sucesso.\n";
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
