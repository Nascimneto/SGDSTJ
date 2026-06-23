<?php
/**
 * Parser simples de .env — sem dependências externas.
 */

function sgd_carregar_env(string $caminho): array
{
    static $cache = [];
    if (isset($cache[$caminho])) {
        return $cache[$caminho];
    }

    $valores = [];
    if (is_file($caminho)) {
        foreach (file($caminho, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linha) {
            $linha = trim($linha);
            if ($linha === '' || $linha[0] === '#' || !str_contains($linha, '=')) {
                continue;
            }
            [$chave, $valor] = explode('=', $linha, 2);
            $valores[trim($chave)] = trim($valor);
        }
    }

    $cache[$caminho] = $valores;
    return $valores;
}

function env(string $chave, $default = null)
{
    $valores = sgd_carregar_env(__DIR__ . '/../.env');
    return $valores[$chave] ?? $default;
}
