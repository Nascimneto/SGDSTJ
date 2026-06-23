<?php
/** Atalho para htmlspecialchars() em templates PHP. */
function sgd_e(?string $s): string
{
    return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8');
}

/** Iniciais a partir de um nome (ex: "Joao Ferreira" -> "JF"). */
function sgd_iniciais(?string $nome): string
{
    $partes = array_filter(explode(' ', trim($nome ?? '')));
    $partes = array_slice($partes, 0, 2);
    $iniciais = array_map(static fn($p) => mb_strtoupper(mb_substr($p, 0, 1)), $partes);
    return implode('', $iniciais);
}

/**
 * Caminho de um asset (js/css) com query string de versão baseada em
 * filemtime — evita servir ficheiros antigos do cache do browser sempre
 * que o ficheiro é editado.
 */
function sgd_asset(string $caminhoRelativo): string
{
    $absoluto = __DIR__ . '/../' . $caminhoRelativo;
    $v = is_file($absoluto) ? filemtime($absoluto) : time();
    return $caminhoRelativo . '?v=' . $v;
}
