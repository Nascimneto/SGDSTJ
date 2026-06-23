<?php
require_once __DIR__ . '/env.php';

/**
 * Liga à base de dados via PDO (prepared statements, utf8mb4).
 * Nunca expõe credenciais — em caso de falha, regista no log do
 * servidor e devolve erro genérico ao cliente.
 */
function obterConexao(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = env('DB_HOST', '127.0.0.1');
    $port = env('DB_PORT', '3306');
    $nome = env('DB_NAME', 'sgd_cv');
    $user = env('DB_USER', 'root');
    $pass = env('DB_PASS', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$nome};charset=utf8mb4";

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log('SGD: falha de ligação à base de dados — ' . $e->getMessage());
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['erro' => 'Serviço indisponível. Tente novamente mais tarde.']);
        exit;
    }

    return $pdo;
}
