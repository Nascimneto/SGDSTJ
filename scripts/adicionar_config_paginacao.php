<?php
/**
 * Migração: adiciona as configurações "conclusao_pagina" e "vistos_pagina"
 * (tamanho de página das listagens de Conclusão e Vistos, tal como já existe
 * "processos_pagina" para Processos). Não apaga nem altera configurações
 * existentes.
 *
 * Só pode ser executado via CLI: php scripts/adicionar_config_paginacao.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../app/bootstrap.php';

$pdo = Database::pdo();

try {
    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)'
    );
    $stmt->execute(['conclusao_pagina', '15', 'Processos por página em Conclusão']);
    echo "✓ conclusao_pagina (ou já existia).\n";
    $stmt->execute(['vistos_pagina', '15', 'Processos por página em Vistos']);
    echo "✓ vistos_pagina (ou já existia).\n";

    echo "\nMigração concluída com sucesso.\n";
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
