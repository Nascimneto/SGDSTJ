<?php
/**
 * Auditoria do sistema — regista acções administrativas que não pertencem
 * ao histórico de um processo (gestão de utilizadores, configurações).
 * Lido depois por AuditoriaController. Ver database.sql, tabela
 * auditoria_sistema, e a distinção com historico_processo.
 */
class Auditoria
{
    /**
     * $uid: por defeito lido da sessão (caso normal — admin a gerir utilizadores/
     * configurações). Aceita um uid explícito para o caso do login bem sucedido,
     * em que a sessão ainda não tem 'uid' definido no momento do registo.
     */
    public static function registar(PDO $pdo, string $tipoEvento, string $codigoEvento, string $mensagem, ?int $uid = null): void
    {
        $pdo->prepare(
            'INSERT INTO auditoria_sistema (mensagem, tipo_evento, codigo_evento, criado_por, ip_origem)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $mensagem,
            $tipoEvento,
            $codigoEvento,
            $uid ?? ($_SESSION['uid'] ?? null),
            $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    }
}
