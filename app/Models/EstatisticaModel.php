<?php
class EstatisticaModel
{
    public function __construct(private PDO $pdo) {}

    public function listarUtilizadores(): array
    {
        return $this->pdo->query('SELECT id, nome_completo FROM utilizadores ORDER BY nome_completo')->fetchAll();
    }

    /**
     * Filtros opcionais (data_de/data_ate/utilizador) comuns a resumo/distribuicao/funil
     * — não dá para aplicá-los às views v_relatorio_geral/v_distribuicao_especie (sem
     * parâmetros), por isso estes métodos interrogam processos/datas_controlo directamente.
     * @return array{0:string[],1:array}
     */
    private function condicoes(array $get): array
    {
        $dataDe       = trim((string)($get['data_de'] ?? ''));
        $dataAte      = trim((string)($get['data_ate'] ?? ''));
        $utilizadorId = (int)($get['utilizador'] ?? 0);

        $cond   = [];
        $params = [];
        if ($dataDe !== '')  { $cond[] = 'DATE(p.data_registo) >= ?'; $params[] = $dataDe; }
        if ($dataAte !== '') { $cond[] = 'DATE(p.data_registo) <= ?'; $params[] = $dataAte; }
        if ($utilizadorId)   { $cond[] = 'p.registado_por = ?';       $params[] = $utilizadorId; }

        return [$cond, $params];
    }

    public function resumo(array $get): array
    {
        [$cond, $params] = $this->condicoes($get);
        // Nos LEFT JOIN os filtros vão na condição ON (não num WHERE à parte), para
        // os estados sem nenhum processo no intervalo continuarem a aparecer com
        // total=0 em vez de desaparecerem da lista.
        $ondeJoin  = $cond ? ' AND ' . implode(' AND ', $cond) : '';
        $ondeWhere = $cond ? ' WHERE ' . implode(' AND ', $cond) : '';

        $stmtEstado = $this->pdo->prepare(
            "SELECT est.codigo, est.label, est.cor_css, est.ordem, COUNT(p.id) AS total
             FROM estados_processo est
             LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
             GROUP BY est.id, est.codigo, est.label, est.cor_css, est.ordem
             ORDER BY est.ordem"
        );
        $stmtEstado->execute($params);
        $porEstado = $stmtEstado->fetchAll();

        $stmtTotais = $this->pdo->prepare(
            "SELECT
                COUNT(DISTINCT p.id) AS total,
                COUNT(DISTINCT CASE WHEN dc.conclusao IS NOT NULL THEN p.id END) AS com_conclusao,
                COUNT(DISTINCT CASE WHEN dc.inscricao_tabela IS NOT NULL AND dc.acordao IS NULL THEN p.id END) AS em_tabela,
                COUNT(DISTINCT CASE WHEN dc.acordao IS NOT NULL THEN p.id END) AS acordaos
             FROM processos p
             LEFT JOIN datas_controlo dc ON dc.processo_id = p.id$ondeWhere"
        );
        $stmtTotais->execute($params);
        $totais = $stmtTotais->fetch();

        // Totais globais sem filtro de período: acumulado total, pendentes (tramitação
        // activa) e findos (concluídos + arquivados) reflectem sempre o estado actual.
        $stmtGlobal = $this->pdo->query(
            "SELECT
                COUNT(p.id) AS total_acumulado,
                SUM(CASE WHEN est.codigo NOT IN ('concluded','archived') THEN 1 ELSE 0 END) AS pendentes,
                SUM(CASE WHEN est.codigo IN ('concluded','archived') THEN 1 ELSE 0 END) AS findos
             FROM processos p
             JOIN estados_processo est ON est.id = p.estado_id"
        );
        $global = $stmtGlobal->fetch();

        $totais['total_acumulado'] = (int)$global['total_acumulado'];
        $totais['pendentes']       = (int)$global['pendentes'];
        $totais['findos']          = (int)$global['findos'];

        return ['totais' => $totais, 'porEstado' => $porEstado];
    }

    public function distribuicao(array $get): array
    {
        [$cond, $params] = $this->condicoes($get);
        $ondeJoin = $cond ? ' AND ' . implode(' AND ', $cond) : '';

        $stmtEstado = $this->pdo->prepare(
            "SELECT est.codigo, est.label, est.cor_css, est.ordem, COUNT(p.id) AS total
             FROM estados_processo est
             LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
             GROUP BY est.id, est.codigo, est.label, est.cor_css, est.ordem
             ORDER BY est.ordem"
        );
        $stmtEstado->execute($params);
        $porEstado = $stmtEstado->fetchAll();

        $stmtEspecie = $this->pdo->prepare(
            "SELECT ep.id, ep.nome AS especie, ep.ordem, COUNT(p.id) AS total
             FROM especies_processo ep
             LEFT JOIN processos p ON p.especie_id = ep.id$ondeJoin
             GROUP BY ep.id, ep.nome, ep.ordem
             ORDER BY ep.ordem"
        );
        $stmtEspecie->execute($params);
        $porEspecie = $stmtEspecie->fetchAll();

        // Distribuição por utilizador (quem registou cada processo) — quando o
        // próprio filtro "utilizador" está activo, esta lista mostra só essa pessoa.
        $stmtUtilizador = $this->pdo->prepare(
            "SELECT u.id, u.nome_completo AS utilizador, COUNT(p.id) AS total
             FROM utilizadores u
             LEFT JOIN processos p ON p.registado_por = u.id$ondeJoin
             GROUP BY u.id, u.nome_completo
             ORDER BY total DESC, u.nome_completo"
        );
        $stmtUtilizador->execute($params);
        $porUtilizador = $stmtUtilizador->fetchAll();

        $ondeWhere = $cond ? ' WHERE ' . implode(' AND ', $cond) : '';
        $stmtOrigem = $this->pdo->prepare(
            "SELECT COALESCE(NULLIF(TRIM(p.origem), ''), '(Sem origem)') AS origem, COUNT(p.id) AS total
             FROM processos p"
            . $ondeWhere .
            " GROUP BY origem ORDER BY total DESC LIMIT 30"
        );
        $stmtOrigem->execute($params);
        $porOrigem = $stmtOrigem->fetchAll();

        return ['porEstado' => $porEstado, 'porEspecie' => $porEspecie, 'porUtilizador' => $porUtilizador, 'porOrigem' => $porOrigem];
    }

    /** Volumes mensais ou anuais: processos registados vs concluídos por período. */
    public function volume(array $get): array
    {
        $escala    = ($get['escala'] ?? 'mensal') === 'anual' ? 'anual' : 'mensal';
        $formato   = $escala === 'anual' ? '%Y' : '%Y-%m';
        $intervalo = $escala === 'anual' ? '5 YEAR' : '13 MONTH';

        $stmtReg = $this->pdo->prepare(
            "SELECT DATE_FORMAT(data_registo, :fmt) AS periodo, COUNT(*) AS registados
             FROM processos
             WHERE data_registo >= DATE_SUB(CURDATE(), INTERVAL $intervalo)
             GROUP BY periodo ORDER BY periodo"
        );
        $stmtReg->execute([':fmt' => $formato]);
        $regMap = [];
        foreach ($stmtReg->fetchAll() as $r) {
            $regMap[$r['periodo']] = (int)$r['registados'];
        }

        $stmtConc = $this->pdo->prepare(
            "SELECT DATE_FORMAT(conclusao, :fmt) AS periodo, COUNT(*) AS concluidos
             FROM datas_controlo
             WHERE conclusao IS NOT NULL AND conclusao >= DATE_SUB(CURDATE(), INTERVAL $intervalo)
             GROUP BY periodo ORDER BY periodo"
        );
        $stmtConc->execute([':fmt' => $formato]);
        $concMap = [];
        foreach ($stmtConc->fetchAll() as $r) {
            $concMap[$r['periodo']] = (int)$r['concluidos'];
        }

        $periodos = array_unique(array_merge(array_keys($regMap), array_keys($concMap)));
        sort($periodos);

        $dados = [];
        foreach ($periodos as $p) {
            $dados[] = [
                'periodo'    => $p,
                'registados' => $regMap[$p] ?? 0,
                'concluidos' => $concMap[$p] ?? 0,
            ];
        }

        return ['escala' => $escala, 'dados' => $dados];
    }

    /** Produtividade por Juiz Relator (campo distribuicao): total, pendentes, findos, taxa. */
    public function produtividade(array $get): array
    {
        [$cond, $params] = $this->condicoes($get);
        $ondeWhere = $cond ? ' WHERE ' . implode(' AND ', $cond) : '';

        $stmt = $this->pdo->prepare(
            "SELECT
                COALESCE(NULLIF(TRIM(p.distribuicao), ''), '(Não distribuído)') AS relator,
                COUNT(p.id) AS total,
                SUM(CASE WHEN est.codigo NOT IN ('concluded','archived') THEN 1 ELSE 0 END) AS pendentes,
                SUM(CASE WHEN est.codigo IN ('concluded','archived') THEN 1 ELSE 0 END) AS findos
             FROM processos p
             JOIN estados_processo est ON est.id = p.estado_id$ondeWhere
             GROUP BY relator
             ORDER BY total DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['total']    = (int)$r['total'];
            $r['pendentes'] = (int)$r['pendentes'];
            $r['findos']   = (int)$r['findos'];
            $r['taxa']     = $r['total'] > 0 ? round($r['findos'] / $r['total'] * 100, 1) : 0.0;
        }

        return ['relatores' => $rows];
    }

    public function funil(array $get): array
    {
        [$cond, $params] = $this->condicoes($get);
        $ondeJoin = $cond ? ' AND ' . implode(' AND ', $cond) : '';

        $stmt = $this->pdo->prepare(
            "SELECT est.codigo, est.label, est.ordem, COUNT(p.id) AS total
             FROM estados_processo est
             LEFT JOIN processos p ON p.estado_id = est.id$ondeJoin
             GROUP BY est.id, est.codigo, est.label, est.ordem
             ORDER BY est.ordem"
        );
        $stmt->execute($params);
        $porEstado = $stmt->fetchAll();

        // Os estados já têm uma ordem sequencial (entry -> analysis -> distributed ->
        // concluded -> archived), por isso a "conversão" do funil é só aritmética
        // sobre os totais já agregados (já filtrados acima) — sem SQL dedicado.
        $funil    = [];
        $anterior = null;
        foreach ($porEstado as $e) {
            $conversao = ($anterior && $anterior['total'] > 0) ? round($e['total'] / $anterior['total'] * 100, 1) : null;
            $funil[] = [
                'codigo'    => $e['codigo'],
                'label'     => $e['label'],
                'total'     => (int)$e['total'],
                'conversao' => $conversao,
            ];
            $anterior = $e;
        }

        return $funil;
    }
}
