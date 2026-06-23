<?php
require_once __DIR__ . '/../../includes/api_guard.php';
exigirPerfilApi(['Administrador']);
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$rows = $pdo->query(
    "SELECT u.id, u.username, u.nome_completo, u.email, u.activo, u.ultimo_acesso,
            p.codigo AS perfil, d.nome AS departamento
     FROM utilizadores u
     LEFT JOIN perfis p ON p.id = u.perfil_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     ORDER BY u.nome_completo"
)->fetchAll();

echo json_encode(['items' => $rows]);
