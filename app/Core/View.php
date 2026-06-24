<?php
class View
{
    public static function render(string $template, array $dados = []): void
    {
        extract($dados);
        require __DIR__ . '/../Views/' . $template . '.php';
    }
}
