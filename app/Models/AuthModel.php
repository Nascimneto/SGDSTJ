<?php
class AuthModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * Comparação de bloqueio feita em SQL (NOW() do MySQL), nunca com o relógio
     * do PHP — evita falhas de bloqueio por desalinhamento de fuso horário/relógio
     * entre o servidor de aplicação e o servidor de base de dados.
     */
    public function buscarParaLogin(string $username): array|false
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, username, senha_hash, nome_completo, perfil_id, activo, tentativas_falha, obrigar_troca_senha,
                    (bloqueado_ate IS NOT NULL AND bloqueado_ate > NOW()) AS bloqueado
             FROM utilizadores WHERE username = ?'
        );
        $stmt->execute([$username]);
        return $stmt->fetch();
    }

    public function obterPerfilCodigo(int $perfilId): ?string
    {
        $stmt = $this->pdo->prepare('SELECT codigo FROM perfis WHERE id = ?');
        $stmt->execute([$perfilId]);
        return $stmt->fetchColumn() ?: null;
    }

    public function registarTentativaFalha(int $id, string $username, int $tentativasFalha, int $maxTentativas, int $bloqueioMin): void
    {
        $tentativas = $tentativasFalha + 1;
        $atingiuLimite = $tentativas >= $maxTentativas;

        if ($atingiuLimite) {
            $this->pdo->prepare('UPDATE utilizadores SET tentativas_falha = ?, bloqueado_ate = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?')
                ->execute([$tentativas, $bloqueioMin, $id]);
        } else {
            $this->pdo->prepare('UPDATE utilizadores SET tentativas_falha = ? WHERE id = ?')
                ->execute([$tentativas, $id]);
        }

        Auditoria::registar(
            $this->pdo,
            'SESSAO',
            $atingiuLimite ? 'LOGIN_BLOQUEIO' : 'LOGIN_FALHA',
            $atingiuLimite
                ? "Conta \"$username\" bloqueada por {$bloqueioMin} min após {$tentativas} tentativas falhadas."
                : "Tentativa de login falhada para \"$username\" ({$tentativas}/{$maxTentativas})."
        );
    }

    public function registarTentativaContaBloqueada(string $username): void
    {
        Auditoria::registar(
            $this->pdo,
            'SESSAO',
            'LOGIN_NEGADO_BLOQUEADO',
            "Tentativa de login em conta já bloqueada: \"$username\"."
        );
    }

    /** @return string o token de sessão gerado, guardado em sessoes_utilizador. */
    public function registarLoginSucesso(int $uid, string $username, int $expiraMin): string
    {
        $this->pdo->prepare('UPDATE utilizadores SET tentativas_falha = 0, bloqueado_ate = NULL, ultimo_acesso = NOW() WHERE id = ?')
            ->execute([$uid]);

        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO sessoes_utilizador (utilizador_id, token, ip_origem, user_agent, expira_em)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))'
        )->execute([
            $uid,
            $token,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300),
            $expiraMin,
        ]);

        // uid passado explicitamente: $_SESSION['uid'] só fica definido depois
        // deste método devolver (ver AuthController::login()).
        Auditoria::registar($this->pdo, 'SESSAO', 'LOGIN_SUCESSO', "Login bem sucedido: \"$username\".", $uid);

        return $token;
    }

    public function encerrarSessoesAbertas(int $uid, string $username): void
    {
        $this->pdo->prepare('UPDATE sessoes_utilizador SET terminado_em = NOW() WHERE utilizador_id = ? AND terminado_em IS NULL')
            ->execute([$uid]);

        Auditoria::registar($this->pdo, 'SESSAO', 'LOGOUT', "Logout: \"$username\".", $uid);
    }
}
