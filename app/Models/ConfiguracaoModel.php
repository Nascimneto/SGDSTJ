<?php
class ConfiguracaoModel
{
    /** Lista branca de chaves editáveis — nunca aceitar chaves arbitrárias do payload. */
    private const PERMITIDAS = [
        'tribunal_nome', 'tribunal_endereco', 'tribunal_email', 'prefixo_numeracao',
        'processos_pagina', 'sessao_expira_min', 'max_tentativas_login', 'bloqueio_min', 'registo_auditoria',
    ];

    public function __construct(private PDO $pdo) {}

    public function obterTodas(): array
    {
        return $this->pdo->query('SELECT chave, valor FROM configuracoes')->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    public function obter(string $chave, $default = null)
    {
        $stmt = $this->pdo->prepare('SELECT valor FROM configuracoes WHERE chave = ?');
        $stmt->execute([$chave]);
        $valor = $stmt->fetchColumn();
        return $valor === false ? $default : $valor;
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizar(array $dados): array
    {
        if (!$dados) {
            return ['erro' => 'Sem dados para guardar.', 'codigo' => 400];
        }

        $stmt = $this->pdo->prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
        $alteradas = [];
        foreach ($dados as $chave => $valor) {
            if (!in_array($chave, self::PERMITIDAS, true)) {
                continue;
            }
            $stmt->execute([$chave, (string)$valor]);
            $alteradas[] = $chave;
        }

        if ($alteradas) {
            Auditoria::registar(
                $this->pdo,
                'CONFIGURACAO',
                'CONFIGURACAO_ALTERADA',
                'Configurações actualizadas: ' . implode(', ', $alteradas) . '.'
            );
        }

        return [];
    }
}
