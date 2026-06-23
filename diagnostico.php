<?php
/**
 * Diagnóstico temporário de ligação à BD — mostra a mensagem real do PDO
 * (config/conexao.php esconde-a por segurança, devolvendo sempre "Serviço
 * indisponível"). Mesma proteção de instalar.php: só responde com
 * INSTALL_TOKEN correcto no .env. Apagar depois de resolver o problema.
 */
require_once __DIR__ . '/config/env.php';

$tokenEsperado = env('INSTALL_TOKEN', '');
$tokenRecebido = $_GET['token'] ?? '';
if ($tokenEsperado === '' || !hash_equals($tokenEsperado, $tokenRecebido)) {
    http_response_code(404);
    exit('Não encontrado.');
}

header('Content-Type: text/plain; charset=utf-8');

$host = env('DB_HOST', '127.0.0.1');
$port = env('DB_PORT', '3306');
$nome = env('DB_NAME', 'sgd_cv');
$user = env('DB_USER', 'root');
$pass = env('DB_PASS', '');

echo "A testar ligação com:\n";
echo "DB_HOST = {$host}\n";
echo "DB_PORT = {$port}\n";
echo "DB_NAME = {$nome}\n";
echo "DB_USER = {$user}\n";
echo "DB_PASS = (" . strlen($pass) . " caracteres)\n\n";

$dsn = "mysql:host={$host};port={$port};dbname={$nome};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "LIGAÇÃO OK.\n";
    $stmt = $pdo->query('SELECT COUNT(*) FROM utilizadores');
    echo "Utilizadores na BD: " . $stmt->fetchColumn() . "\n";
} catch (PDOException $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
}
