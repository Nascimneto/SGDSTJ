<?php
require_once __DIR__ . '/conexao.php';

/**
 * Configura os parâmetros do cookie de sessão antes de session_start().
 * sessao_expira_min vem de `configuracoes` (parametrizável pelo admin);
 * cai para 60 minutos se a BD ainda não estiver acessível.
 */
function configurarSessao(): void
{
    $minutos = 60;
    try {
        $pdo  = obterConexao();
        $stmt = $pdo->query("SELECT valor FROM configuracoes WHERE chave = 'sessao_expira_min'");
        $valor = $stmt->fetchColumn();
        if ($valor !== false && is_numeric($valor)) {
            $minutos = (int)$valor;
        }
    } catch (Throwable $e) {
        // BD indisponível nesta fase de arranque — mantém o valor por defeito
    }

    $segundos = max(60, $minutos * 60);
    $https    = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    session_name('SGDSESSID');
    session_set_cookie_params([
        'lifetime' => $segundos,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.gc_maxlifetime', (string)$segundos);
}
