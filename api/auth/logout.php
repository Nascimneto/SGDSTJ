<?php
require_once __DIR__ . '/../../includes/auth_funcoes.php';
require_once __DIR__ . '/../../config/conexao.php';

sgd_iniciar_sessao();
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['uid'])) {
    try {
        $pdo = obterConexao();
        $pdo->prepare('UPDATE sessoes_utilizador SET terminado_em = NOW() WHERE utilizador_id = ? AND terminado_em IS NULL')
            ->execute([$_SESSION['uid']]);
    } catch (Throwable $e) {
        // não bloquear o logout por falha no registo de auditoria
    }
}

$_SESSION = [];
session_destroy();

$params = session_get_cookie_params();
setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);

echo json_encode(['ok' => true]);
