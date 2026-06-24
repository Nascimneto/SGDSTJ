<?php
class UtilizadorModel
{
    public function __construct(private PDO $pdo) {}

    public function listar(): array
    {
        return $this->pdo->query(
            "SELECT u.id, u.username, u.nome_completo, u.email, u.activo, u.ultimo_acesso,
                    p.codigo AS perfil, d.nome AS departamento
             FROM utilizadores u
             LEFT JOIN perfis p ON p.id = u.perfil_id
             LEFT JOIN departamentos d ON d.id = u.departamento_id
             ORDER BY u.nome_completo"
        )->fetchAll();
    }

    public function listarPerfis(): array
    {
        return $this->pdo->query('SELECT codigo FROM perfis ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
    }

    public function listarDepartamentos(): array
    {
        return $this->pdo->query('SELECT nome FROM departamentos WHERE activo = 1 ORDER BY nome')->fetchAll(PDO::FETCH_COLUMN);
    }

    /** @return array{erro?:string,codigo?:int,id?:int,senhaInicial?:string} */
    public function criar(array $dados, int $uidAdmin): array
    {
        $nome         = trim((string)($dados['nome'] ?? ''));
        $username     = trim((string)($dados['username'] ?? ''));
        $perfil       = trim((string)($dados['perfil'] ?? ''));
        $departamento = trim((string)($dados['departamento'] ?? ''));
        $activo       = !empty($dados['activo']) ? 1 : 0;

        if ($nome === '' || $username === '' || $perfil === '') {
            return ['erro' => 'Preencha nome, utilizador e perfil.', 'codigo' => 400];
        }

        $exist = $this->pdo->prepare('SELECT id FROM utilizadores WHERE username = ?');
        $exist->execute([$username]);
        if ($exist->fetchColumn()) {
            return ['erro' => 'Utilizador já existe.', 'codigo' => 409];
        }

        $perfilId = $this->obterPerfilId($perfil);
        if (!$perfilId) {
            return ['erro' => 'Perfil inválido.', 'codigo' => 400];
        }

        $deptId = $departamento !== '' ? $this->obterDepartamentoId($departamento) : null;

        // Senha inicial igual para todos (Senha::INICIAL), nunca escolhida pelo
        // admin: obriga a troca no primeiro acesso, tal como num reset.
        $hash = password_hash(Senha::INICIAL, PASSWORD_BCRYPT);

        $this->pdo->prepare(
            'INSERT INTO utilizadores (username, senha_hash, nome_completo, perfil_id, departamento_id, activo, criado_por, obrigar_troca_senha)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
        )->execute([$username, $hash, $nome, $perfilId, $deptId, $activo, $uidAdmin]);

        // Capturado antes de Auditoria::registar(), que faz o seu próprio INSERT
        // (em auditoria_sistema) — lastInsertId() devolveria o id errado depois disso.
        $novoId = (int)$this->pdo->lastInsertId();

        Auditoria::registar(
            $this->pdo,
            'UTILIZADOR',
            'UTILIZADOR_CRIADO',
            "Utilizador \"$username\" ($nome) criado, perfil $perfil."
        );

        return ['id' => $novoId, 'senhaInicial' => Senha::INICIAL];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function atualizar(int $id, array $dados): array
    {
        $nome         = trim((string)($dados['nome'] ?? ''));
        $username     = trim((string)($dados['username'] ?? ''));
        $senha        = (string)($dados['senha'] ?? '');
        $perfil       = trim((string)($dados['perfil'] ?? ''));
        $departamento = trim((string)($dados['departamento'] ?? ''));
        $activo       = !empty($dados['activo']) ? 1 : 0;

        if (!$id || $nome === '' || $username === '' || $perfil === '') {
            return ['erro' => 'Preencha nome, utilizador e perfil.', 'codigo' => 400];
        }

        $exist = $this->pdo->prepare('SELECT id FROM utilizadores WHERE username = ? AND id <> ?');
        $exist->execute([$username, $id]);
        if ($exist->fetchColumn()) {
            return ['erro' => 'Utilizador já existe.', 'codigo' => 409];
        }

        $perfilId = $this->obterPerfilId($perfil);
        if (!$perfilId) {
            return ['erro' => 'Perfil inválido.', 'codigo' => 400];
        }

        $deptId = $departamento !== '' ? $this->obterDepartamentoId($departamento) : null;

        $sets   = ['username = ?', 'nome_completo = ?', 'perfil_id = ?', 'departamento_id = ?', 'activo = ?'];
        $params = [$username, $nome, $perfilId, $deptId, $activo];

        if ($senha !== '') {
            $erroSenha = Senha::validar($senha);
            if ($erroSenha !== null) {
                return ['erro' => $erroSenha, 'codigo' => 400];
            }
            $sets[]   = 'senha_hash = ?';
            $params[] = password_hash($senha, PASSWORD_BCRYPT);
            // O admin é quem está a escolher a senha, não o próprio: tal como na
            // criação, força a troca no próximo acesso.
            $sets[]   = 'obrigar_troca_senha = 1';
        }
        $params[] = $id;

        $this->pdo->prepare('UPDATE utilizadores SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

        Auditoria::registar(
            $this->pdo,
            'UTILIZADOR',
            'UTILIZADOR_EDITADO',
            "Utilizador \"$username\" ($nome) actualizado." . ($senha !== '' ? ' Senha redefinida pelo administrador.' : '')
        );

        return [];
    }

    /** @return array{erro?:string,codigo?:int} */
    public function eliminar(int $id, int $uidAtual): array
    {
        if ($id === $uidAtual) {
            return ['erro' => 'Não pode eliminar a sua própria conta.', 'codigo' => 400];
        }

        // Lido antes do DELETE: depois de eliminado já não há linha para descrever
        // na mensagem de auditoria.
        $existe = $this->pdo->prepare('SELECT username, nome_completo FROM utilizadores WHERE id = ?');
        $existe->execute([$id]);
        $utilizador = $existe->fetch();
        if (!$utilizador) {
            return ['erro' => 'Utilizador não encontrado.', 'codigo' => 404];
        }

        $this->pdo->prepare('DELETE FROM utilizadores WHERE id = ?')->execute([$id]);

        Auditoria::registar(
            $this->pdo,
            'UTILIZADOR',
            'UTILIZADOR_ELIMINADO',
            "Utilizador \"{$utilizador['username']}\" ({$utilizador['nome_completo']}) eliminado."
        );

        return [];
    }

    /** @return array{erro?:string,codigo?:int,activo?:bool} */
    public function alternarEstado(int $id, int $uidAtual): array
    {
        if ($id === $uidAtual) {
            return ['erro' => 'Não pode desactivar a sua própria conta.', 'codigo' => 400];
        }

        $existe = $this->pdo->prepare('SELECT username FROM utilizadores WHERE id = ?');
        $existe->execute([$id]);
        $username = $existe->fetchColumn();
        if ($username === false) {
            return ['erro' => 'Utilizador não encontrado.', 'codigo' => 404];
        }

        $this->pdo->prepare('UPDATE utilizadores SET activo = NOT activo WHERE id = ?')->execute([$id]);

        $novo = $this->pdo->prepare('SELECT activo FROM utilizadores WHERE id = ?');
        $novo->execute([$id]);
        $activo = (bool)$novo->fetchColumn();

        Auditoria::registar(
            $this->pdo,
            'UTILIZADOR',
            $activo ? 'UTILIZADOR_ACTIVADO' : 'UTILIZADOR_DESACTIVADO',
            "Utilizador \"$username\" " . ($activo ? 'activado' : 'desactivado') . '.'
        );

        return ['activo' => $activo];
    }

    /** @return array{erro?:string,codigo?:int,senhaTemporaria?:string} */
    public function resetarSenha(int $id): array
    {
        $existe = $this->pdo->prepare('SELECT username FROM utilizadores WHERE id = ?');
        $existe->execute([$id]);
        $username = $existe->fetchColumn();
        if ($username === false) {
            return ['erro' => 'Utilizador não encontrado.', 'codigo' => 404];
        }

        // Senha temporária aleatória (nunca um valor fixo como "1234"); o utilizador
        // é obrigado a trocá-la no próximo acesso (obrigar_troca_senha).
        $senhaTemp = bin2hex(random_bytes(5));
        $hash      = password_hash($senhaTemp, PASSWORD_BCRYPT);

        $this->pdo->prepare(
            'UPDATE utilizadores SET senha_hash = ?, obrigar_troca_senha = 1, tentativas_falha = 0, bloqueado_ate = NULL WHERE id = ?'
        )->execute([$hash, $id]);

        Auditoria::registar(
            $this->pdo,
            'UTILIZADOR',
            'UTILIZADOR_SENHA_RESETADA',
            "Senha de \"$username\" resetada pelo administrador."
        );

        return ['senhaTemporaria' => $senhaTemp];
    }

    /** "O Meu Perfil" — o próprio troca a sua senha. @return string|null mensagem de erro, ou null se ok. */
    public function atualizarSenhaProprio(int $uid, string $senha, string $senha2): ?string
    {
        if ($senha === '') {
            return 'Defina uma nova senha.';
        }
        if ($senha !== $senha2) {
            return 'Senhas não coincidem.';
        }
        $erroSenha = Senha::validar($senha);
        if ($erroSenha !== null) {
            return $erroSenha;
        }

        $this->pdo->prepare('UPDATE utilizadores SET senha_hash = ?, obrigar_troca_senha = 0 WHERE id = ?')
            ->execute([password_hash($senha, PASSWORD_BCRYPT), $uid]);

        return null;
    }

    private function obterPerfilId(string $codigo): string|false
    {
        $stmt = $this->pdo->prepare('SELECT id FROM perfis WHERE codigo = ?');
        $stmt->execute([$codigo]);
        return $stmt->fetchColumn();
    }

    private function obterDepartamentoId(string $nome): ?string
    {
        $stmt = $this->pdo->prepare('SELECT id FROM departamentos WHERE nome = ?');
        $stmt->execute([$nome]);
        return $stmt->fetchColumn() ?: null;
    }
}
