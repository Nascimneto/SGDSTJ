<?php
require_once __DIR__ . '/ProcessoModel.php';

class ConclusaoModel
{
    private ProcessoModel $processos;

    public function __construct(private PDO $pdo)
    {
        $this->processos = new ProcessoModel($pdo);
    }

    public function listarPendentes(): array
    {
        return $this->pdo->query('SELECT * FROM v_pendentes_conclusao')->fetchAll();
    }

    public function obterTamanhoPagina(): int
    {
        return (int)($this->pdo->query("SELECT valor FROM configuracoes WHERE chave = 'conclusao_pagina'")->fetchColumn() ?: 15);
    }

    public function contarConcluidos(): int
    {
        return (int)$this->pdo->query(
            "SELECT COUNT(*) FROM datas_controlo dc
             JOIN processos p ON p.id = dc.processo_id
             JOIN estados_processo e ON e.id = p.estado_id
             WHERE dc.conclusao IS NOT NULL AND e.codigo <> 'archived'"
        )->fetchColumn();
    }

    /** @return array{erro?:string,codigo?:int} */
    public function guardar(int $id, string $data, int $uid, string $nomeUtilizador): array
    {
        if (!$this->processos->existe($id)) {
            return ['erro' => 'Processo não encontrado.', 'codigo' => 404];
        }

        // "Registado por" vem sempre da sessão, nunca do payload do cliente.
        $this->pdo->prepare('UPDATE datas_controlo SET conclusao = ?, registado_conclusao_por = ? WHERE processo_id = ?')
            ->execute([$data, $uid, $id]);

        $this->pdo->prepare(
            'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
        )->execute([$id, 'Conclusao: ' . $data . ' por ' . $nomeUtilizador, 'DATA', $uid]);

        return [];
    }
}
