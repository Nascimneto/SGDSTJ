<?php
/**
 * Parser simples de .env — sem dependências externas.
 */
class Env
{
    private static array $valores = [];
    private static bool $carregado = false;

    public static function carregar(): void
    {
        if (self::$carregado) {
            return;
        }

        $caminho = __DIR__ . '/../../.env';
        if (is_file($caminho)) {
            foreach (file($caminho, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linha) {
                $linha = trim($linha);
                if ($linha === '' || $linha[0] === '#' || !str_contains($linha, '=')) {
                    continue;
                }
                [$chave, $valor] = explode('=', $linha, 2);
                self::$valores[trim($chave)] = trim($valor);
            }
        }

        self::$carregado = true;
    }

    public static function get(string $chave, $default = null)
    {
        return self::$valores[$chave] ?? $default;
    }
}
