<?php
require_once __DIR__ . '/../config/sessao.php';

function sgd_iniciar_sessao(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        configurarSessao();
        session_start();
    }
}

function sgd_autenticado(): bool
{
    return !empty($_SESSION['uid']);
}

function sgd_perfil(): ?string
{
    return $_SESSION['perfil'] ?? null;
}

/** O perfil Visualizador é o único sem permissão de registar/editar processos. */
function sgd_pode_editar(): bool
{
    return sgd_perfil() !== 'Visualizador';
}

/**
 * True quando a senha actual foi definida por outra pessoa (admin na
 * criação/edição, ou reset) e o utilizador ainda não a substituiu por uma
 * própria. Lido da sessão (preenchido no login) para não consultar a BD em
 * cada pedido.
 */
function sgd_deve_trocar_senha(): bool
{
    return !empty($_SESSION['obrigar_troca_senha']);
}
