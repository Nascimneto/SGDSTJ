<?php
class ConfiguracaoModel
{
    /** Lista branca de chaves editáveis — nunca aceitar chaves arbitrárias do payload. */
    private const PERMITIDAS = [
        'tribunal_nome', 'tribunal_endereco', 'tribunal_email', 'prefixo_numeracao',
        'processos_pagina', 'conclusao_pagina', 'vistos_pagina',
        'sessao_expira_min', 'max_tentativas_login', 'bloqueio_min', 'registo_auditoria',
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

    /* ═══ Espécies Processuais ═══ */

    public function listarEspecies(): array
    {
        return $this->pdo->query(
            'SELECT id, nome, activo, ordem FROM especies_processo ORDER BY ordem, nome'
        )->fetchAll();
    }

    /** @return array{erro?:string,codigo?:int,id?:int} */
    public function criarEspecie(string $nome): array
    {
        $nome = trim($nome);
        if ($nome === '') return ['erro' => 'O nome não pode ser vazio.', 'codigo' => 400];
        $dup = $this->pdo->prepare('SELECT id FROM especies_processo WHERE nome = ?');
        $dup->execute([$nome]);
        if ($dup->fetchColumn()) return ['erro' => 'Já existe uma espécie com esse nome.', 'codigo' => 409];
        $maxOrdem = (int)$this->pdo->query('SELECT COALESCE(MAX(ordem),0) FROM especies_processo')->fetchColumn();
        $this->pdo->prepare('INSERT INTO especies_processo (nome, activo, ordem) VALUES (?, 1, ?)')->execute([$nome, $maxOrdem + 1]);
        return ['id' => (int)$this->pdo->lastInsertId()];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizarEspecie(int $id, string $nome): array
    {
        $nome = trim($nome);
        if ($nome === '') return ['erro' => 'O nome não pode ser vazio.', 'codigo' => 400];
        $dup = $this->pdo->prepare('SELECT id FROM especies_processo WHERE nome = ? AND id != ?');
        $dup->execute([$nome, $id]);
        if ($dup->fetchColumn()) return ['erro' => 'Já existe uma espécie com esse nome.', 'codigo' => 409];
        $this->pdo->prepare('UPDATE especies_processo SET nome = ? WHERE id = ?')->execute([$nome, $id]);
        return [];
    }

    public function toggleEspecie(int $id): array
    {
        $this->pdo->prepare('UPDATE especies_processo SET activo = 1 - activo WHERE id = ?')->execute([$id]);
        return [];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function eliminarEspecie(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM processos WHERE especie_id = ?');
        $stmt->execute([$id]);
        if ((int)$stmt->fetchColumn() > 0) {
            return ['erro' => 'Não é possível eliminar: existem processos associados a esta espécie. Desactive-a em vez de eliminar.', 'codigo' => 409];
        }
        $this->pdo->prepare('DELETE FROM especies_processo WHERE id = ?')->execute([$id]);
        return [];
    }

    /* ═══ Estados do Processo ═══ */

    public function listarEstados(): array
    {
        return $this->pdo->query(
            'SELECT id, codigo, label, cor_css, ordem FROM estados_processo ORDER BY ordem'
        )->fetchAll();
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizarEstado(int $id, string $label): array
    {
        $label = trim($label);
        if ($label === '') return ['erro' => 'A etiqueta não pode ser vazia.', 'codigo' => 400];
        $this->pdo->prepare('UPDATE estados_processo SET label = ? WHERE id = ?')->execute([$label, $id]);
        return [];
    }

    /**
     * Cria um novo estado intermédio do fluxo processual. O código interno
     * é gerado a partir da etiqueta (nunca escolhido pelo utilizador — ver
     * gerarCodigoEstado()), porque 'entry'/'concluded'/'archived' têm regras
     * de negócio próprias noutros pontos da aplicação; um estado novo entra
     * sempre como intermédio, contado como "pendente" nas estatísticas.
     * @return array{erro?:string,codigo?:int,id?:int}
     */
    public function criarEstado(string $label): array
    {
        $label = trim($label);
        if ($label === '') return ['erro' => 'A etiqueta não pode ser vazia.', 'codigo' => 400];

        $dup = $this->pdo->prepare('SELECT id FROM estados_processo WHERE label = ?');
        $dup->execute([$label]);
        if ($dup->fetchColumn()) return ['erro' => 'Já existe um estado com essa etiqueta.', 'codigo' => 409];

        $codigo = $this->gerarCodigoEstado($label);

        $maxOrdem = (int)$this->pdo->query('SELECT COALESCE(MAX(ordem),0) FROM estados_processo')->fetchColumn();
        $this->pdo->prepare('INSERT INTO estados_processo (codigo, label, ordem) VALUES (?, ?, ?)')
            ->execute([$codigo, $label, $maxOrdem + 1]);

        return ['id' => (int)$this->pdo->lastInsertId()];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function eliminarEstado(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM processos WHERE estado_id = ?');
        $stmt->execute([$id]);
        if ((int)$stmt->fetchColumn() > 0) {
            return ['erro' => 'Não é possível eliminar: existem processos com este estado.', 'codigo' => 409];
        }
        $this->pdo->prepare('DELETE FROM estados_processo WHERE id = ?')->execute([$id]);
        return [];
    }

    /**
     * Mapa explícito de acentos -> ASCII para gerarCodigoEstado(). Não se usa
     * iconv(..., 'ASCII//TRANSLIT', ...) porque o resultado varia consoante o
     * SO/libc (testado: produz lixo tipo "t_ec" para "Técnica" no Windows).
     */
    private const ACENTOS = [
        'á'=>'a','à'=>'a','ã'=>'a','â'=>'a','ä'=>'a', 'Á'=>'a','À'=>'a','Ã'=>'a','Â'=>'a','Ä'=>'a',
        'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',           'É'=>'e','È'=>'e','Ê'=>'e','Ë'=>'e',
        'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i',           'Í'=>'i','Ì'=>'i','Î'=>'i','Ï'=>'i',
        'ó'=>'o','ò'=>'o','õ'=>'o','ô'=>'o','ö'=>'o', 'Ó'=>'o','Ò'=>'o','Õ'=>'o','Ô'=>'o','Ö'=>'o',
        'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u',           'Ú'=>'u','Ù'=>'u','Û'=>'u','Ü'=>'u',
        'ç'=>'c','Ç'=>'c', 'ñ'=>'n','Ñ'=>'n',
    ];

    /** Gera um código interno único (slug ASCII, até 20 caracteres) a partir da etiqueta. */
    private function gerarCodigoEstado(string $label): string
    {
        $base = strtolower(strtr(trim($label), self::ACENTOS));
        $base = trim((string)preg_replace('/[^a-z0-9]+/', '_', $base), '_');
        $base = $base !== '' ? substr($base, 0, 16) : 'estado';

        $existeStmt = $this->pdo->prepare('SELECT COUNT(*) FROM estados_processo WHERE codigo = ?');
        $codigo = $base;
        $i = 2;
        while (true) {
            $existeStmt->execute([$codigo]);
            if (!(int)$existeStmt->fetchColumn()) {
                return $codigo;
            }
            $sufixo = '_' . $i;
            $codigo = substr($base, 0, 20 - strlen($sufixo)) . $sufixo;
            $i++;
        }
    }

    /* ═══ Perfis de Utilizador ═══ */

    public function listarPerfisCfg(): array
    {
        return $this->pdo->query(
            'SELECT id, codigo, descricao, pode_criar_utilizadores, pode_eliminar_processos, pode_gerir_sistema FROM perfis ORDER BY id'
        )->fetchAll();
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizarPerfil(int $id, string $descricao): array
    {
        $this->pdo->prepare('UPDATE perfis SET descricao = ? WHERE id = ?')->execute([trim($descricao), $id]);
        return [];
    }

    /* ═══ Departamentos ═══ */

    public function listarDepartamentos(): array
    {
        return $this->pdo->query(
            'SELECT d.id, d.nome, d.sigla, d.activo,
                    (SELECT COUNT(*) FROM utilizadores u WHERE u.departamento_id = d.id) AS total_utilizadores
             FROM departamentos d ORDER BY d.nome'
        )->fetchAll();
    }

    /** @return array{erro?:string,codigo?:int,id?:int} */
    public function criarDepartamento(string $nome, string $sigla): array
    {
        $nome  = trim($nome);
        $sigla = strtoupper(trim($sigla));
        if ($nome === '') return ['erro' => 'O nome não pode ser vazio.', 'codigo' => 400];
        $dup = $this->pdo->prepare('SELECT id FROM departamentos WHERE nome = ?');
        $dup->execute([$nome]);
        if ($dup->fetchColumn()) return ['erro' => 'Já existe um departamento com esse nome.', 'codigo' => 409];
        $this->pdo->prepare('INSERT INTO departamentos (nome, sigla, activo) VALUES (?, ?, 1)')->execute([$nome, $sigla ?: null]);
        return ['id' => (int)$this->pdo->lastInsertId()];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizarDepartamento(int $id, string $nome, string $sigla): array
    {
        $nome  = trim($nome);
        $sigla = strtoupper(trim($sigla));
        if ($nome === '') return ['erro' => 'O nome não pode ser vazio.', 'codigo' => 400];
        $dup = $this->pdo->prepare('SELECT id FROM departamentos WHERE nome = ? AND id != ?');
        $dup->execute([$nome, $id]);
        if ($dup->fetchColumn()) return ['erro' => 'Já existe um departamento com esse nome.', 'codigo' => 409];
        $this->pdo->prepare('UPDATE departamentos SET nome = ?, sigla = ? WHERE id = ?')->execute([$nome, $sigla ?: null, $id]);
        return [];
    }

    public function toggleDepartamento(int $id): array
    {
        $this->pdo->prepare('UPDATE departamentos SET activo = 1 - activo WHERE id = ?')->execute([$id]);
        return [];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function eliminarDepartamento(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM utilizadores WHERE departamento_id = ?');
        $stmt->execute([$id]);
        if ((int)$stmt->fetchColumn() > 0) {
            return ['erro' => 'Não é possível eliminar: existem utilizadores associados a este departamento. Desactive-o em vez de eliminar.', 'codigo' => 409];
        }
        $this->pdo->prepare('DELETE FROM departamentos WHERE id = ?')->execute([$id]);
        return [];
    }
}
