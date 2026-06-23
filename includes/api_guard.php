<?php
/**
 * Guard para endpoints em api/*.php. Sem sessão válida -> 401 JSON.
 * exigirPerfilApi() corta com 403 JSON se o perfil não estiver na lista.
 */
require_once __DIR__ . '/auth_funcoes.php';
sgd_iniciar_sessao();

header('Content-Type: application/json; charset=utf-8');

if (!sgd_autenticado()) {
    http_response_code(401);
    echo json_encode(['erro' => 'Sessão inválida ou expirada.']);
    exit;
}

function exigirPerfilApi(array $perfis): void
{
    if (!in_array(sgd_perfil(), $perfis, true)) {
        http_response_code(403);
        echo json_encode(['erro' => 'Sem permissão para esta acção.']);
        exit;
    }
}

/** Bloqueia o perfil Visualizador de endpoints que registam/alteram processos. */
function exigirEscritaApi(): void
{
    if (!sgd_pode_editar()) {
        http_response_code(403);
        echo json_encode(['erro' => 'O seu perfil só permite visualização.']);
        exit;
    }
}
