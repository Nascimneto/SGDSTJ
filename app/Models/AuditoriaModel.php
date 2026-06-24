<?php
class AuditoriaModel
{
    public function __construct(private PDO $pdo) {}

    public function listarUtilizadores(): array
    {
        return $this->pdo->query('SELECT nome_completo FROM utilizadores ORDER BY nome_completo')->fetchAll(PDO::FETCH_COLUMN);
    }

    /** Histórico por processo (historico_processo, via v_auditoria_recente). */
    public function listarHistorico(array $get): array
    {
        $where  = [];
        $params = [];

        if (!empty($get['data_de'])) {
            $where[]            = 'DATE(data_evento) >= :data_de';
            $params[':data_de'] = $get['data_de'];
        }
        if (!empty($get['data_ate'])) {
            $where[]             = 'DATE(data_evento) <= :data_ate';
            $params[':data_ate'] = $get['data_ate'];
        }
        if (!empty($get['tipo_evento'])) {
            $where[]                = 'tipo_evento = :tipo_evento';
            $params[':tipo_evento'] = $get['tipo_evento'];
        }
        if (!empty($get['utilizador'])) {
            $where[]               = 'utilizador = :utilizador';
            $params[':utilizador'] = $get['utilizador'];
        }
        if (!empty($get['q'])) {
            $where[] = '(numero_processo LIKE :q1 OR descricao LIKE :q2)';
            $qVal = '%' . $get['q'] . '%';
            $params[':q1'] = $qVal;
            $params[':q2'] = $qVal;
        }

        $sql = 'SELECT * FROM v_auditoria_recente';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY data_evento DESC';

        $limite = isset($get['limite']) ? max(1, min(500, (int)$get['limite'])) : 100;
        $sql .= ' LIMIT :limite';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $chave => $valor) {
            $stmt->bindValue($chave, $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /** Auditoria do sistema (auditoria_sistema) — acções administrativas sem processo associado. */
    public function listarSistema(array $get): array
    {
        $where  = [];
        $params = [];

        if (!empty($get['data_de'])) {
            $where[]            = 'DATE(a.criado_em) >= :data_de';
            $params[':data_de'] = $get['data_de'];
        }
        if (!empty($get['data_ate'])) {
            $where[]             = 'DATE(a.criado_em) <= :data_ate';
            $params[':data_ate'] = $get['data_ate'];
        }
        if (!empty($get['tipo_evento'])) {
            $where[]                = 'a.tipo_evento = :tipo_evento';
            $params[':tipo_evento'] = $get['tipo_evento'];
        }
        if (!empty($get['utilizador'])) {
            $where[]               = 'u.nome_completo = :utilizador';
            $params[':utilizador'] = $get['utilizador'];
        }
        if (!empty($get['q'])) {
            $where[] = '(a.mensagem LIKE :q1 OR a.codigo_evento LIKE :q2)';
            $qVal = '%' . $get['q'] . '%';
            $params[':q1'] = $qVal;
            $params[':q2'] = $qVal;
        }

        $sql = 'SELECT a.id, a.criado_em, a.mensagem, a.tipo_evento, a.codigo_evento, a.ip_origem,
                       u.nome_completo AS criado_por
                FROM auditoria_sistema a
                LEFT JOIN utilizadores u ON u.id = a.criado_por';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY a.criado_em DESC';

        $limite = isset($get['limite']) ? max(1, min(500, (int)$get['limite'])) : 100;
        $sql .= ' LIMIT :limite';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $chave => $valor) {
            $stmt->bindValue($chave, $valor);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
