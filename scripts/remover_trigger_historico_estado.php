<?php
/**
 * Migração: remove o trigger trg_historico_estado.
 *
 * Este trigger inseria um registo em historico_processo sempre que
 * processos.estado_id mudava. Desde a alteração a ProcessoModel::atualizar(),
 * essa mesma gravação passou a ser feita explicitamente em PHP (com a
 * descrição a usar o label do estado e um único registo por edição), o que
 * tornou o trigger redundante — as duas fontes chegavam a gerar dois
 * registos de histórico para a mesma alteração de estado.
 *
 * Não apaga nem altera dados existentes em historico_processo.
 *
 * Só pode ser executado via CLI: php scripts/remover_trigger_historico_estado.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../app/bootstrap.php';

$pdo = Database::pdo();

try {
    $pdo->exec('DROP TRIGGER IF EXISTS trg_historico_estado');
    echo "✓ Trigger trg_historico_estado removido (ou já não existia).\n";
    echo "\nMigração concluída com sucesso.\n";
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
