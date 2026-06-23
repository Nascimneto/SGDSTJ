<?php
/**
 * Guard para páginas HTML. Sem sessão válida -> redirect para login.php.
 * exigirPerfil() corta com 403 se o perfil da sessão não estiver na lista.
 */
require_once __DIR__ . '/auth_funcoes.php';
require_once __DIR__ . '/helpers.php';
sgd_iniciar_sessao();

if (!sgd_autenticado()) {
    header('Location: login.php');
    exit;
}

// Senha imposta por outra pessoa (criação/edição/reset) ainda não trocada:
// só deixa ver perfil.php (onde a troca é feita), bloqueia o resto do sistema.
if (sgd_deve_trocar_senha() && basename($_SERVER['SCRIPT_NAME']) !== 'perfil.php') {
    header('Location: perfil.php?trocar=1');
    exit;
}

function exigirPerfil(array $perfis): void
{
    if (!in_array(sgd_perfil(), $perfis, true)) {
        http_response_code(403);
        echo '<p style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#5C5C55">'
            . 'Acesso negado — não tem permissão para ver esta página.</p>';
        exit;
    }
}

/** Bloqueia o perfil Visualizador de páginas que registam/alteram processos. */
function exigirEscrita(): void
{
    if (!sgd_pode_editar()) {
        http_response_code(403);
        echo '<p style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#5C5C55">'
            . 'Acesso negado — o seu perfil só permite visualização.</p>';
        exit;
    }
}
