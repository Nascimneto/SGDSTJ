<?php
/**
 * Migração de perfis: reduz de 6 para 3 perfis.
 *
 *   Administrador → mantém (sem alteração)
 *   Secretario    → renomeia para Secretaria
 *   Magistrado    → converte utilizadores para Visualizador, apaga perfil
 *   Tecnico       → converte utilizadores para Visualizador, apaga perfil
 *   Utilizador    → converte utilizadores para Visualizador, apaga perfil
 *   Visualizador  → mantém (sem alteração)
 *
 * Só pode ser executado via CLI: php scripts/migrar_perfis.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Apenas via linha de comando.');
}

require_once __DIR__ . '/../app/bootstrap.php';

$pdo = Database::pdo();
$pdo->beginTransaction();

try {
    /* 1. Garantir que o perfil Secretaria existe (renomeia Secretario se ainda
     *    não foi renomeado; se já existe um com esse código, não faz nada). */
    $jaTem = $pdo->query("SELECT id FROM perfis WHERE codigo = 'Secretaria'")->fetchColumn();
    if (!$jaTem) {
        $n = $pdo->exec("UPDATE perfis SET codigo = 'Secretaria', descricao = 'Secretaria — registo, edição e consulta de processos e relatórios' WHERE codigo = 'Secretario'");
        echo $n ? "✓ Secretario → Secretaria\n" : "  Secretario não encontrado (ignorado).\n";
    } else {
        echo "  Secretaria já existe (sem alteração).\n";
        /* Apaga Secretario se ainda existir como duplicado */
        $pdo->exec("DELETE FROM perfis WHERE codigo = 'Secretario'");
    }

    /* 2. Obter id do Visualizador (destino dos perfis eliminados) */
    $visId = $pdo->query("SELECT id FROM perfis WHERE codigo = 'Visualizador'")->fetchColumn();
    if (!$visId) {
        throw new RuntimeException("Perfil Visualizador não encontrado na base de dados.");
    }

    /* 3. Mover utilizadores dos perfis a eliminar para Visualizador */
    $obsoletos = ['Magistrado', 'Tecnico', 'Utilizador'];
    foreach ($obsoletos as $cod) {
        $oldId = $pdo->query("SELECT id FROM perfis WHERE codigo = '$cod'")->fetchColumn();
        if (!$oldId) {
            echo "  Perfil $cod não encontrado (ignorado).\n";
            continue;
        }
        $stmt = $pdo->prepare("UPDATE utilizadores SET perfil_id = ? WHERE perfil_id = ?");
        $stmt->execute([$visId, $oldId]);
        $n = $stmt->rowCount();
        echo "✓ $n utilizador(es) com perfil $cod → Visualizador\n";

        $pdo->exec("DELETE FROM perfis WHERE codigo = '$cod'");
        echo "✓ Perfil $cod eliminado\n";
    }

    /* 4. Actualizar descrição do Administrador */
    $pdo->exec("UPDATE perfis SET descricao = 'Acesso total — utilizadores, configurações e auditoria' WHERE codigo = 'Administrador'");

    /* 5. Actualizar descrição do Visualizador */
    $pdo->exec("UPDATE perfis SET descricao = 'Só consulta — visualizar processos e exportar relatórios' WHERE codigo = 'Visualizador'");

    $pdo->commit();
    echo "\nMigração concluída com sucesso.\n";
    echo "Perfis activos: ";
    $perfis = $pdo->query("SELECT codigo FROM perfis ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
    echo implode(', ', $perfis) . "\n";

} catch (Throwable $e) {
    $pdo->rollBack();
    echo "ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
