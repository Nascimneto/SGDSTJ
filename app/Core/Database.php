<?php
/**
 * Liga à base de dados via PDO (prepared statements, utf8mb4).
 * Nunca expõe credenciais — em caso de falha, regista no log do
 * servidor e devolve erro genérico ao cliente.
 */
class Database
{
    private static ?PDO $instancia = null;

    public static function pdo(): PDO
    {
        if (self::$instancia !== null) {
            return self::$instancia;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $nome = Env::get('DB_NAME', 'sgd_cv');
        $user = Env::get('DB_USER', 'root');
        $pass = Env::get('DB_PASS', '');

        $dsn = "mysql:host={$host};port={$port};dbname={$nome};charset=utf8mb4";

        try {
            self::$instancia = new PDO($dsn, $user, $pass, [
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

        return self::$instancia;
    }
}
