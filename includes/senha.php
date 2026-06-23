<?php
/**
 * Política de senha do SGD, aplicada em todos os pontos onde uma senha é
 * definida por um humano (edição por admin, perfil próprio). Senhas geradas
 * pelo sistema (resetar-senha.php) não passam por aqui porque já nascem
 * aleatórias e fortes.
 */

/**
 * Senha inicial fixa, atribuída automaticamente a todo utilizador novo
 * (api/utilizadores/criar.php) — ninguém escolhe senha na criação, só na
 * troca obrigatória do primeiro acesso. Cumpre a política abaixo.
 */
const SGD_SENHA_INICIAL = 'stj@2026';

/**
 * Valida a senha contra a política mínima: 8+ caracteres, com pelo menos
 * uma letra e um número. Devolve null se válida, ou a mensagem de erro.
 */
function sgd_validar_senha(string $senha): ?string
{
    if (strlen($senha) < 8) {
        return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (!preg_match('/[A-Za-zÀ-ÿ]/', $senha) || !preg_match('/\d/', $senha)) {
        return 'A senha deve conter pelo menos uma letra e um número.';
    }
    return null;
}
