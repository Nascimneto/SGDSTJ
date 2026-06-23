<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../includes/senha.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

// "O Meu Perfil" só permite ao próprio trocar a senha — nome e utilizador
// só são editáveis pelo Administrador (api/utilizadores/atualizar.php).
$dados  = json_decode(file_get_contents('php://input'), true) ?? [];
$senha  = (string)($dados['senha'] ?? '');
$senha2 = (string)($dados['senha2'] ?? '');

if ($senha === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Defina uma nova senha.']);
    exit;
}
if ($senha !== $senha2) {
    http_response_code(400);
    echo json_encode(['erro' => 'Senhas não coincidem.']);
    exit;
}
$erroSenha = sgd_validar_senha($senha);
if ($erroSenha !== null) {
    http_response_code(400);
    echo json_encode(['erro' => $erroSenha]);
    exit;
}

$pdo->prepare('UPDATE utilizadores SET senha_hash = ?, obrigar_troca_senha = 0 WHERE id = ?')
    ->execute([password_hash($senha, PASSWORD_BCRYPT), $_SESSION['uid']]);

// Limpa o bloqueio lido por guard.php em cada pedido (sem isto, a sessão
// actual continuaria presa em perfil.php até novo login).
$_SESSION['obrigar_troca_senha'] = false;

echo json_encode(['ok' => true]);
