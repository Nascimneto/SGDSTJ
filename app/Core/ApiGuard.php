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
            http_response_code(403);
            echo json_encode(['erro' => 'Sem permissão para esta acção.']);
            exit;
        }
    }

    /** Bloqueia o perfil Visualizador de endpoints que registam/alteram processos. */
    public static function exigirEscrita(): void
    {
        if (!Auth::podeEditar()) {
            http_response_code(403);
            echo json_encode(['erro' => 'O seu perfil só permite visualização.']);
            exit;
        }
    }
}
