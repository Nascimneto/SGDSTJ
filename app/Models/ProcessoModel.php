<?php
class ProcessoModel
{
    public function __construct(private PDO $pdo) {}

    public function listarEspeciesActivas(): array
    {
        return $this->pdo->query('SELECT nome FROM especies_processo WHERE activo = 1 ORDER BY ordem')->fetchAll(PDO::FETCH_COLUMN);
    }

    public function listarEstados(): array
    {
        return $this->pdo->query('SELECT codigo, label FROM estados_processo ORDER BY ordem')->fetchAll();
    }

    public function obterTamanhoPagina(): int
    {
        return (int)($this->pdo->query("SELECT valor FROM configuracoes WHERE chave = 'processos_pagina'")->fetchColumn() ?: 15);
    }

    /** Filtros avançados: estado, espécie, distribuição, intervalo de datas, pesquisa livre. */
    public function listarComFiltros(array $get): array
    {
        $where  = [];
        $params = [];

        if (!empty($get['estado'])) {
            $where[]           = 'estado_codigo = :estado';
            $params[':estado'] = $get['estado'];
        }
        if (!empty($get['especie'])) {
            $where[]            = 'especie = :especie';
            $params[':especie'] = $get['especie'];
        }
        if (!empty($get['distribuicao'])) {
            $where[]                 = 'distribuicao LIKE :distribuicao';
            $params[':distribuicao'] = '%' . $get['distribuicao'] . '%';
        }
        if (!empty($get['data_de'])) {
            $where[]            = 'DATE(criado_em) >= :data_de';
            $params[':data_de'] = $get['data_de'];
        }
        if (!empty($get['data_ate'])) {
            $where[]             = 'DATE(criado_em) <= :data_ate';
            $params[':data_ate'] = $get['data_ate'];
        }
        if (!empty($get['q'])) {
            $where[] = '(numero_processo LIKE :q1 OR numero_processo_externo LIKE :q2 OR partes LIKE :q3 OR origem LIKE :q4 OR especie LIKE :q5 OR distribuicao LIKE :q6)';
            $qVal = '%' . $get['q'] . '%';
            $params[':q1'] = $qVal;
            $params[':q2'] = $qVal;
            $params[':q3'] = $qVal;
            $params[':q4'] = $qVal;
            $params[':q5'] = $qVal;
            $params[':q6'] = $qVal;
        }

        $sql = 'SELECT id, numero_processo, numero_processo_externo, data_registo, especie, partes, distribuicao, origem,
                       estado, estado_codigo, estado_cor, observacoes,
                       notificacao_citacao, conclusao, visto_mp, visto_adjunto1, visto_adjunto2,
                       inscricao_tabela, acordao, notificacao_acordao, conta_custas, arquivamento
                FROM v_processos_completos';

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY criado_em DESC';

        $limite = isset($get['limite']) ? max(1, min(500, (int)$get['limite'])) : null;
        if ($limite) {
            $sql .= ' LIMIT :limite';
        }

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $chave => $valor) {
            $stmt->bindValue($chave, $valor);
        }
        if ($limite) {
            $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        }
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function obterPorId(int $id): array|false
    {
        $stmt = $this->pdo->prepare('SELECT * FROM v_processos_completos WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /** @return array{erro?:string,codigo?:int,id?:int,numero_processo?:string} */
    public function criar(array $dados, int $uid, string $nomeUtilizador): array
    {
        $especie               = trim((string)($dados['especie'] ?? ''));
        $origem                = trim((string)($dados['origem'] ?? ''));
        $partes                = trim((string)($dados['partes'] ?? ''));
        $distribuicao          = trim((string)($dados['distribuicao'] ?? ''));
        $numeroProcessoExterno = trim((string)($dados['numero_processo_externo'] ?? ''));

        if ($especie === '' || $origem === '' || $partes === '') {
            return ['erro' => 'Preencha espécie, origem e intervenientes/partes.', 'codigo' => 400];
        }

        $especieStmt = $this->pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
        $especieStmt->execute([$especie]);
        $especieId = $especieStmt->fetchColumn();
        if (!$especieId) {
            return ['erro' => 'Espécie de processo inválida.', 'codigo' => 400];
        }

        $estadoId = $this->pdo->query("SELECT id FROM estados_processo WHERE codigo = 'entry'")->fetchColumn();

        $this->pdo->prepare(
            'INSERT INTO processos (especie_id, partes, origem, distribuicao, estado_id, numero_processo_externo, registado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$especieId, $partes, $origem, $distribuicao ?: null, $estadoId, $numeroProcessoExterno ?: null, $uid]);

        $novoId = (int)$this->pdo->lastInsertId();

        $numStmt = $this->pdo->prepare('SELECT numero_processo FROM processos WHERE id = ?');
        $numStmt->execute([$novoId]);
        $numero = $numStmt->fetchColumn();

        $this->pdo->prepare(
            'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
        )->execute([$novoId, 'Processo registado por ' . $nomeUtilizador, 'REGISTO', $uid]);

        return ['id' => $novoId, 'numero_processo' => $numero];
    }

    public function existe(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT id FROM processos WHERE id = ?');
        $stmt->execute([$id]);
        return (bool)$stmt->fetchColumn();
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizar(int $id, array $dados, int $uid, string $nomeUtilizador): array
    {
        if (!$this->existe($id)) {
            return ['erro' => 'Processo não encontrado.', 'codigo' => 404];
        }

        $especie               = trim((string)($dados['especie'] ?? ''));
        $origem                = trim((string)($dados['origem'] ?? ''));
        $partes                = trim((string)($dados['partes'] ?? ''));
        $distribuicao          = trim((string)($dados['distribuicao'] ?? ''));
        $observacoes           = trim((string)($dados['observacoes'] ?? ''));
        $estadoCodigo          = trim((string)($dados['estado'] ?? ''));
        $numeroProcessoExterno = trim((string)($dados['numero_processo_externo'] ?? ''));

        if ($especie === '' || $origem === '' || $partes === '') {
            return ['erro' => 'Preencha espécie, origem e intervenientes/partes.', 'codigo' => 400];
        }

        $especieStmt = $this->pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
        $especieStmt->execute([$especie]);
        $especieId = $especieStmt->fetchColumn();
        if (!$especieId) {
            return ['erro' => 'Espécie de processo inválida.', 'codigo' => 400];
        }

        // Datas de controlo — actualiza data + "registado por" (sessão, nunca o payload)
        // só para os campos que vierem presentes no pedido.
        $camposData = [
            'notificacao_citacao' => null,
            'conclusao'           => 'registado_conclusao_por',
            'visto_mp'            => 'registado_visto_mp_por',
            'visto_adjunto1'      => 'registado_visto_adj1_por',
            'visto_adjunto2'      => 'registado_visto_adj2_por',
            'inscricao_tabela'    => 'registado_tabela_por',
            'acordao'             => 'registado_acordao_por',
            'notificacao_acordao' => null,
            'conta_custas'        => null,
            'arquivamento'        => 'registado_arquivo_por',
        ];

        $dcSets   = [];
        $dcParams = [];
        foreach ($camposData as $campo => $campoPor) {
            if (array_key_exists($campo, $dados)) {
                $valor      = $dados[$campo] !== '' ? $dados[$campo] : null;
                $dcSets[]   = "$campo = ?";
                $dcParams[] = $valor;
                if ($campoPor) {
                    $dcSets[]   = "$campoPor = ?";
                    $dcParams[] = $valor !== null ? $uid : null;
                }
            }
        }

        // Regras automáticas de estado (preservam o comportamento original de wfSave()):
        // registar acórdão conclui o processo; registar arquivamento arquiva-o.
        if (!empty($dados['acordao'])) {
            $estadoCodigo = 'concluded';
        }
        if (!empty($dados['arquivamento'])) {
            $estadoCodigo = 'archived';
        }

        $estadoId = null;
        if ($estadoCodigo !== '') {
            $estStmt = $this->pdo->prepare('SELECT id FROM estados_processo WHERE codigo = ?');
            $estStmt->execute([$estadoCodigo]);
            $estadoId = $estStmt->fetchColumn();
        }

        $this->pdo->beginTransaction();
        try {
            $sets   = ['especie_id = ?', 'partes = ?', 'origem = ?', 'distribuicao = ?', 'observacoes = ?', 'numero_processo_externo = ?', 'atualizado_por = ?'];
            $params = [$especieId, $partes, $origem, $distribuicao ?: null, $observacoes ?: null, $numeroProcessoExterno ?: null, $uid];
            if ($estadoId) {
                $sets[]   = 'estado_id = ?';
                $params[] = $estadoId;
            }
            $params[] = $id;
            $this->pdo->prepare('UPDATE processos SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

            if ($dcSets) {
                $dcParams[] = $id;
                $this->pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $dcSets) . ' WHERE processo_id = ?')->execute($dcParams);
            }

            $this->pdo->prepare(
                'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
            )->execute([$id, 'Editado por ' . $nomeUtilizador, 'EDICAO', $uid]);

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log('SGD atualizar processo: ' . $e->getMessage());
            return ['erro' => 'Erro ao guardar alterações.', 'codigo' => 500];
        }

        return [];
    }

    public function eliminar(int $id): void
    {
        $this->pdo->prepare('DELETE FROM processos WHERE id = ?')->execute([$id]);
    }

    public function contarEmEstado(string $codigoEstado): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM processos p JOIN estados_processo e ON e.id = p.estado_id WHERE e.codigo = ?"
        );
        $stmt->execute([$codigoEstado]);
        return (int)$stmt->fetchColumn();
    }
}
