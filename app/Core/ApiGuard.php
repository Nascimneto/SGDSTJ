<?php
/**
 * Guard para endpoints em api/*.php. Chamar ApiGuard::aplicar() antes de
 * exigirPerfil()/exigirEscrita(), e ambos antes de instanciar o Controller
 * (que abre ligação à BD no construtor) — sem sessão válida, 401 JSON.
 */
class ApiGuard
{
    public static function aplicar(): void
    {
        Auth::iniciarSessao();
        header('Content-Type: application/json; charset=utf-8');

        if (!Auth::autenticado()) {
            http_response_code(401);
            echo json_encode(['erro' => 'Sessão inválida ou expirada.']);
            exit;
        }
    }

    public static function exigirPerfil(array $perfis): void
    {
        if (!in_array(Auth::perfil(), $perfis, true)) {
            self::registarNegacao('API: perfil "' . Auth::perfil() . '" sem acesso a ' . ($_SERVER['REQUEST_URI'] ?? ''));
            http_response_code(403);
            echo json_encode(['erro' => 'Sem permissão para esta acção.']);
            exit;
        }
    }

    /** Bloqueia o perfil Visualizador de endpoints que registam/alteram processos. */
    public static function exigirEscrita(): void
    {
        if (!Auth::podeEditar()) {
            self::registarNegacao('API: perfil Visualizador sem permissão de escrita em ' . ($_SERVER['REQUEST_URI'] ?? ''));
            http_response_code(403);
            echo json_encode(['erro' => 'O seu perfil só permite visualização.']);
            exit;
        }
    }

    /**
     * Chamar de dentro do método do Controller (não antes, como aplicar()):
     * `if (!ApiGuard::exigirMetodo('POST')) return;` — devolve bool em vez de
     * exit, porque aqui já estamos depois da ligação à BD ter sido aberta e
     * o Controller pode ter outra lógica de saída a fazer.
     */
    public static function exigirMetodo(string $metodo): bool
    {
        if ($_SERVER['REQUEST_METHOD'] !== $metodo) {
            http_response_code(405);
            echo json_encode(['erro' => 'Método não permitido.']);
            return false;
        }
        return true;
    }

    private static function registarNegacao(string $mensagem): void
    {
        Auditoria::registar(Database::pdo(), 'ACESSO', 'ACESSO_NEGADO', $mensagem);
    }
}
