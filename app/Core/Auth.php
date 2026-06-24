<?php
class Auth
{
    public static function iniciarSessao(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            Session::configurar();
            session_start();
        }
    }

    public static function autenticado(): bool
    {
        return !empty($_SESSION['uid']);
    }

    public static function perfil(): ?string
    {
        return $_SESSION['perfil'] ?? null;
    }

    /** O perfil Visualizador é o único sem permissão de registar/editar processos. */
    public static function podeEditar(): bool
    {
        return self::perfil() !== 'Visualizador';
    }

    /**
     * True quando a senha actual foi definida por outra pessoa (admin na
     * criação/edição, ou reset) e o utilizador ainda não a substituiu por uma
     * própria. Lido da sessão (preenchido no login) para não consultar a BD em
     * cada pedido.
     */
    public static function deveTrocarSenha(): bool
    {
        return !empty($_SESSION['obrigar_troca_senha']);
    }
}

/**
 * includes/head.php, sidebar.php e topbar.php (partials partilhados por
 * todas as Views, nunca migrados para classes) chamam estas funções
 * globais — mantidas aqui com o nome antigo para esses partials não
 * precisarem de saber se a página foi servida pelo fluxo antigo ou novo.
 */
function sgd_perfil(): ?string
{
    return Auth::perfil();
}

function sgd_pode_editar(): bool
{
    return Auth::podeEditar();
}

function sgd_deve_trocar_senha(): bool
{
    return Auth::deveTrocarSenha();
}
