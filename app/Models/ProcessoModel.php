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

    public function listarMagistradosActivos(): array
    {
        return $this->pdo->query('SELECT nome FROM magistrados WHERE activo = 1 ORDER BY ordem, nome')->fetchAll(PDO::FETCH_COLUMN);
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

        $sql = 'SELECT id, numero_processo, numero_processo_externo, data_entrada, data_registo, especie, partes, distribuicao, distribuicao_data, redistribuicao, origem,
                       estado, estado_codigo, estado_cor, observacoes,
                       redistribuicao_data, notificacao_citacao, notificacao1, notificacao2, conclusao, visto_mp, visto_adjunto1, visto_adjunto2,
                       inscricao_tabela, acordao, numero_acordao, acordao2, numero_acordao2, acordao3, numero_acordao3,
                       notificacao_acordao, notificacao_acordao2, notificacao_acordao3,
                       conta_custas, conta_custas2, notificacao_conta_custas, notificacao_conta_custas2, arquivamento
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
        $distribuicaoData      = trim((string)($dados['distribuicao_data'] ?? '')) ?: null;
        $redistribuicao        = trim((string)($dados['redistribuicao'] ?? ''));
        $numeroProcessoExterno = trim((string)($dados['numero_processo_externo'] ?? ''));
        $observacoes           = trim((string)($dados['observacoes'] ?? ''));
        $dataEntrada           = trim((string)($dados['data_entrada'] ?? '')) ?: date('Y-m-d');

        if ($especie === '' || $partes === '') {
            return ['erro' => 'Preencha espécie e intervenientes/partes.', 'codigo' => 400];
        }
        if ($numeroProcessoExterno === '') {
            return ['erro' => 'Preencha o número de processo.', 'codigo' => 400];
        }
        if ($distribuicao === '') {
            return ['erro' => 'Preencha a Distribuição (Juiz Relator).', 'codigo' => 400];
        }
        if (mb_strlen($observacoes) > 1500) {
            return ['erro' => 'Observações: máximo de 1500 caracteres.', 'codigo' => 400];
        }

        $especieStmt = $this->pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
        $especieStmt->execute([$especie]);
        $especieId = $especieStmt->fetchColumn();
        if (!$especieId) {
            return ['erro' => 'Espécie de processo inválida.', 'codigo' => 400];
        }

        $estadoCodigo = trim((string)($dados['estado'] ?? '')) ?: 'entry';
        $estStmt = $this->pdo->prepare('SELECT id FROM estados_processo WHERE codigo = ?');
        $estStmt->execute([$estadoCodigo]);
        $estadoId = $estStmt->fetchColumn()
            ?: $this->pdo->query("SELECT id FROM estados_processo WHERE codigo = 'entry'")->fetchColumn();

        $this->pdo->prepare(
            'INSERT INTO processos (especie_id, partes, origem, distribuicao, distribuicao_data, redistribuicao, estado_id, numero_processo_externo, data_entrada, observacoes, registado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$especieId, $partes, $origem, $distribuicao ?: null, $distribuicaoData, $redistribuicao ?: null, $estadoId, $numeroProcessoExterno, $dataEntrada, $observacoes ?: null, $uid]);

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

        $estStmtAntigo = $this->pdo->prepare('SELECT estado_id FROM processos WHERE id = ?');
        $estStmtAntigo->execute([$id]);
        $estadoIdAntigo = (int)$estStmtAntigo->fetchColumn();

        $especie               = trim((string)($dados['especie'] ?? ''));
        $origem                = trim((string)($dados['origem'] ?? ''));
        $partes                = trim((string)($dados['partes'] ?? ''));
        $distribuicao          = trim((string)($dados['distribuicao'] ?? ''));
        $distribuicaoData      = trim((string)($dados['distribuicao_data'] ?? '')) ?: null;
        $redistribuicao        = trim((string)($dados['redistribuicao'] ?? ''));
        $observacoes           = trim((string)($dados['observacoes'] ?? ''));
        $estadoCodigo          = trim((string)($dados['estado'] ?? ''));
        $numeroProcessoExterno = trim((string)($dados['numero_processo_externo'] ?? ''));
        $dataEntrada           = trim((string)($dados['data_entrada'] ?? ''));

        if ($especie === '' || $partes === '') {
            return ['erro' => 'Preencha espécie e intervenientes/partes.', 'codigo' => 400];
        }
        if ($numeroProcessoExterno === '') {
            return ['erro' => 'Preencha o número de processo.', 'codigo' => 400];
        }
        if ($distribuicao === '') {
            return ['erro' => 'Preencha a Distribuição (Juiz Relator).', 'codigo' => 400];
        }
        if (mb_strlen($observacoes) > 1500) {
            return ['erro' => 'Observações: máximo de 1500 caracteres.', 'codigo' => 400];
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
            'redistribuicao_data' => null,
            'notificacao_citacao' => null,
            'notificacao1'        => null,
            'notificacao2'        => null,
            'conclusao'           => 'registado_conclusao_por',
            'visto_mp'            => 'registado_visto_mp_por',
            'visto_adjunto1'      => 'registado_visto_adj1_por',
            'visto_adjunto2'      => 'registado_visto_adj2_por',
            'inscricao_tabela'    => 'registado_tabela_por',
            'acordao'             => 'registado_acordao_por',
            'numero_acordao'      => null,
            'acordao2'            => 'registado_acordao2_por',
            'numero_acordao2'     => null,
            'acordao3'            => 'registado_acordao3_por',
            'numero_acordao3'     => null,
            'notificacao_acordao'  => null,
            'notificacao_acordao2' => null,
            'notificacao_acordao3' => null,
            'conta_custas'              => null,
            'conta_custas2'             => null,
            'notificacao_conta_custas'  => null,
            'notificacao_conta_custas2' => null,
            'arquivamento'              => 'registado_arquivo_por',
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

        $dcAntigoStmt = $this->pdo->prepare('SELECT acordao, acordao2, acordao3, arquivamento, conclusao FROM datas_controlo WHERE processo_id = ?');
        $dcAntigoStmt->execute([$id]);
        $dcAntigo = $dcAntigoStmt->fetch() ?: ['acordao' => null, 'acordao2' => null, 'acordao3' => null, 'arquivamento' => null, 'conclusao' => null];

        // Regras automáticas de estado (preservam o comportamento original de wfSave()):
        // registar (ou alterar) um acórdão conclui o processo; registar/alterar o
        // arquivamento arquiva-o. Só dispara quando a data está de facto a ser
        // registada/alterada nesta submissão — não quando o formulário completo
        // reenvia, sem alterações, uma data já gravada numa edição anterior (o que
        // impedia mudar manualmente o estado de um processo já concluído/arquivado).
        $acordaoAlterado = (!empty($dados['acordao']) && $dados['acordao'] !== $dcAntigo['acordao'])
            || (!empty($dados['acordao2']) && $dados['acordao2'] !== $dcAntigo['acordao2'])
            || (!empty($dados['acordao3']) && $dados['acordao3'] !== $dcAntigo['acordao3']);
        if ($acordaoAlterado) {
            $estadoCodigo = 'concluded';
        }
        $arquivamentoAlterado = !empty($dados['arquivamento']) && $dados['arquivamento'] !== $dcAntigo['arquivamento'];
        if ($arquivamentoAlterado) {
            $estadoCodigo = 'archived';
        }

        // Sincroniza as datas de controlo com o estado final: se o estado ficar
        // 'concluded'/'archived' (por regra automática acima OU por alteração manual
        // no próprio campo de estado) e a data de conclusão/arquivamento ainda não
        // tiver sido registada, preenche-a agora. Evita que o Painel/Estatísticas
        // mostrem o processo como concluído/arquivado enquanto as telas de
        // Pendentes (que filtram pelas datas de datas_controlo) continuem a listá-lo.
        if ($estadoCodigo === 'concluded' && !array_key_exists('conclusao', $dados) && !$dcAntigo['conclusao']) {
            $dcSets[]   = 'conclusao = ?';
            $dcParams[] = date('Y-m-d');
            $dcSets[]   = 'registado_conclusao_por = ?';
            $dcParams[] = $uid;
        }
        if ($estadoCodigo === 'archived' && !array_key_exists('arquivamento', $dados) && !$dcAntigo['arquivamento']) {
            $dcSets[]   = 'arquivamento = ?';
            $dcParams[] = date('Y-m-d');
            $dcSets[]   = 'registado_arquivo_por = ?';
            $dcParams[] = $uid;
        }

        $estadoId = null;
        if ($estadoCodigo !== '') {
            $estStmt = $this->pdo->prepare('SELECT id FROM estados_processo WHERE codigo = ?');
            $estStmt->execute([$estadoCodigo]);
            $estadoId = $estStmt->fetchColumn();
        }

        $this->pdo->beginTransaction();
        try {
            $sets   = ['especie_id = ?', 'partes = ?', 'origem = ?', 'distribuicao = ?', 'redistribuicao = ?', 'observacoes = ?', 'numero_processo_externo = ?', 'atualizado_por = ?'];
            $params = [$especieId, $partes, $origem, $distribuicao ?: null, $redistribuicao ?: null, $observacoes ?: null, $numeroProcessoExterno ?: null, $uid];
            if ($estadoId) {
                $sets[]   = 'estado_id = ?';
                $params[] = $estadoId;
            }
            if ($dataEntrada !== '') {
                $sets[]   = 'data_entrada = ?';
                $params[] = $dataEntrada;
            }
            // Só toca em distribuicao_data quando o campo vier presente no pedido —
            // evita apagar a data em chamadas parciais que não passam por este campo
            // do formulário (ex: dtSt(), mudança rápida de estado no modal de detalhe).
            if (array_key_exists('distribuicao_data', $dados)) {
                $sets[]   = 'distribuicao_data = ?';
                $params[] = $distribuicaoData;
            }
            $params[] = $id;
            $this->pdo->prepare('UPDATE processos SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

            if ($dcSets) {
                $dcParams[] = $id;
                $this->pdo->prepare('UPDATE datas_controlo SET ' . implode(', ', $dcSets) . ' WHERE processo_id = ?')->execute($dcParams);
            }

            // Um único registo de histórico por edição: se o estado mudou, guarda a
            // transição (tipo 'ESTADO'); caso contrário, o registo genérico de edição.
            // (Antes disto havia também um trigger de BD que duplicava este evento —
            // ver scripts/remover_trigger_historico_estado.php.)
            if ($estadoId && (int)$estadoId !== $estadoIdAntigo) {
                $labelStmt = $this->pdo->prepare('SELECT codigo, label FROM estados_processo WHERE id = ?');
                $labelStmt->execute([$estadoIdAntigo]);
                $antigo = $labelStmt->fetch() ?: ['codigo' => null, 'label' => '—'];
                $labelStmt->execute([$estadoId]);
                $novo = $labelStmt->fetch() ?: ['codigo' => null, 'label' => '—'];

                $this->pdo->prepare(
                    'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, estado_anterior, estado_novo, utilizador_id) VALUES (?, ?, ?, ?, ?, ?)'
                )->execute([
                    $id,
                    'Estado alterado: ' . $antigo['label'] . ' -> ' . $novo['label'] . ' (por ' . $nomeUtilizador . ')',
                    'ESTADO',
                    $antigo['codigo'],
                    $novo['codigo'],
                    $uid,
                ]);
            } else {
                $this->pdo->prepare(
                    'INSERT INTO historico_processo (processo_id, descricao, tipo_evento, utilizador_id) VALUES (?, ?, ?, ?)'
                )->execute([$id, 'Editado por ' . $nomeUtilizador, 'EDICAO', $uid]);
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log('SGD atualizar processo: ' . $e->getMessage());
            return ['erro' => 'Erro ao guardar alterações.', 'codigo' => 500];
        }

        return [];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function eliminar(int $id): array
    {
        if (!$this->existe($id)) {
            return ['erro' => 'Processo não encontrado.', 'codigo' => 404];
        }
        $this->pdo->prepare('DELETE FROM processos WHERE id = ?')->execute([$id]);
        return [];
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
