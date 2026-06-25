<?php
/**
 * Guard para páginas HTML. Chamar PageGuard::aplicar() no topo de cada
 * página autenticada, antes de instanciar o Controller — sem sessão válida,
 * redireciona para index.php (página de login). exigirPerfil()/exigirEscrita() ficam
 * disponíveis para o Controller chamar a seguir, se a página precisar de
 * restringir mais.
 */
class PageGuard
{
    public static function aplicar(): void
    {
        Auth::iniciarSessao();

        if (!Auth::autenticado()) {
            header('Location: index.php');
            exit;
        }

        // Senha imposta por outra pessoa (criação/edição/reset) ainda não trocada:
        // só deixa ver perfil.php (onde a troca é feita), bloqueia o resto do sistema.
        if (Auth::deveTrocarSenha() && basename($_SERVER['SCRIPT_NAME']) !== 'perfil.php') {
            header('Location: perfil.php?trocar=1');
            exit;
        }
    }

    public static function exigirPerfil(array $perfis): void
    {
        if (!in_array(Auth::perfil(), $perfis, true)) {
            self::registarNegacao('Página: perfil "' . Auth::perfil() . '" sem acesso a ' . basename($_SERVER['SCRIPT_NAME']) . '.');
            http_response_code(403);
            echo '<p style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#5C5C55">'
                . 'Acesso negado — não tem permissão para ver esta página.</p>';
            exit;
        }
    }

    /** Bloqueia o perfil Visualizador de páginas que registam/alteram processos. */
    public static function exigirEscrita(): void
    {
        if (!Auth::podeEditar()) {
            self::registarNegacao('Página: perfil Visualizador sem permissão de escrita em ' . basename($_SERVER['SCRIPT_NAME']) . '.');
            http_response_code(403);
            echo '<p style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#5C5C55">'
                . 'Acesso negado — o seu perfil só permite visualização.</p>';
            exit;
        }
    }

    private static function registarNegacao(string $mensagem): void
    {
        Auditoria::registar(Database::pdo(), 'ACESSO', 'ACESSO_NEGADO', $mensagem);
    }
}
