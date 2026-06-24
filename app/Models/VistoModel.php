<?php
class VistoModel
{
    public function __construct(private PDO $pdo) {}

    public function listarPendentes(): array
    {
        return $this->pdo->query(
            "SELECT p.id, p.numero_processo, ep.nome AS especie, p.partes, p.distribuicao,
                    dc.visto_mp, dc.visto_adjunto1, dc.visto_adjunto2,
                    umP.nome_completo AS visto_mp_por, ua1.nome_completo AS visto_adj1_por, ua2.nome_completo AS visto_adj2_por
             FROM processos p
             JOIN especies_processo ep ON ep.id = p.especie_id
             JOIN estados_processo est ON est.id = p.estado_id
             JOIN datas_controlo dc ON dc.processo_id = p.id
             LEFT JOIN utilizadores umP ON umP.id = dc.registado_visto_mp_por
             LEFT JOIN utilizadores ua1 ON ua1.id = dc.registado_visto_adj1_por
             LEFT JOIN utilizadores ua2 ON ua2.id = dc.registado_visto_adj2_por
             WHERE dc.conclusao IS NOT NULL
               AND (dc.visto_mp IS NULL OR dc.visto_adjunto1 IS NULL OR dc.visto_adjunto2 IS NULL)
               AND est.codigo <> 'archived'
             ORDER BY dc.conclusao"
        )->fetchAll();
    }

    public function contarConcluidos(): int
    {
        return (int)$this->pdo->query(
            "SELECT COUNT(*) FROM datas_controlo dc
             JOIN processos p ON p.id = dc.processo_id
             JOIN estados_processo e ON e.id = p.estado_id
             WHERE dc.visto_mp IS NOT NULL AND dc.visto_adjunto1 IS NOT NULL AND dc.visto_adjunto2 IS NOT NULL
               AND e.codigo <> 'archived'"
        )->fetchColumn();
    }

    public function existe(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT id FROM processos WHERE id = ?');
        $stmt->execute([$id]);
        return (bool)$stmt->fetchColumn();
    }

    /** @return array{erro?:string,codigo?:int} */
    public function guardar(int $id, array $dados, int $uid, string $nomeUtilizador): array
    {
        if (!$this->existe($id)) {
            return ['erro' => 'Processo não encontrado.', 'codigo' => 404];
        }

        // "Registado por" vem sempre da sessão, nunca do payload do cliente.
        $campos = [
            'visto_mp'       => 'registado_visto_mp_por',
            'visto_adjunto1' => 'registado_visto_adj1_por',
            'visto_adjunto2' => 'registado_visto_adj2_por',
        ];

        $sets   = [];
        $params = [];
        foreach ($campos as $campo => $campoPor) {
            if (!empty($dados[$campo])) {
                $sets[]   = "$campo = ?";
                $params[] = $dados[$campo];
                $sets[]   = "$campoPor = ?";
                $params[] = $uid;
            }
        }

        if (!$sets) {
            return ['erro' => 'Indique pelo menos um visto.', 'codigo' => 400];
        }

        $params[] = $id;
        $this->pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $sets) . ' WHERE processo_id = ?')->execute($params);

        $this->pdo->prepare(
            'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
        )->execute([$id, 'Vistos actualizados por ' . $nomeUtilizador, 'DATA', $uid]);

        return [];
    }
}
