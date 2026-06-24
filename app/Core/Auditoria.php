<?php
/**
 * Auditoria do sistema — regista acções administrativas que não pertencem
 * ao histórico de um processo (gestão de utilizadores, configurações).
 * Lido depois por AuditoriaController. Ver database.sql, tabela
 * auditoria_sistema, e a distinção com historico_processo.
 */
class Auditoria
{
    public static function registar(PDO $pdo, string $tipoEvento, string $codigoEvento, string $mensagem): void
    {
        $pdo->prepare(
            'INSERT INTO auditoria_sistema (mensagem, tipo_evento, codigo_evento, criado_por, ip_origem)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $mensagem,
            $tipoEvento,
            $codigoEvento,
            $_SESSION['uid'] ?? null,
            $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    }
}
