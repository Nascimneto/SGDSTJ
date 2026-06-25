<?php
/**
 * Instalador de produção: cria apenas o utilizador admin inicial (sem dados
 * de demonstração — ao contrário de scripts/seed.php, que é só para
 * desenvolvimento local e corre apenas via CLI).
 *
 * Pensado para hosting partilhado sem acesso SSH: ao contrário de scripts/*,
 * este ficheiro fica na raiz (scripts/ está bloqueado pelo .htaccess) e só
 * responde se INSTALL_TOKEN estiver definido no .env e for passado em
 * ?token=. Apaga este ficheiro (ou remove INSTALL_TOKEN do .env) imediatamente
 * depois de confirmar a criação do admin.
 */
require_once __DIR__ . '/app/bootstrap.php';

$tokenEsperado = Env::get('INSTALL_TOKEN', '');

if (PHP_SAPI !== 'cli') {
    $tokenRecebido = $_GET['token'] ?? '';
    if ($tokenEsperado === '' || !hash_equals($tokenEsperado, $tokenRecebido)) {
        http_response_code(404);
        exit('Não encontrado.');
    }
    header('Content-Type: text/plain; charset=utf-8');
}

$pdo = Database::pdo();

$stmt = $pdo->prepare('SELECT id FROM utilizadores WHERE username = ?');
$stmt->execute(['admin']);
if ($stmt->fetchColumn()) {
    echo "O utilizador 'admin' já existe — nada a fazer.\n";
    echo "Por segurança, apaga este ficheiro (instalar.php) e remove INSTALL_TOKEN do .env.\n";
    exit;
}

$perfilId = $pdo->query("SELECT id FROM perfis WHERE codigo = 'Administrador'")->fetchColumn();
$deptId   = $pdo->query("SELECT id FROM departamentos WHERE sigla = 'SEC'")->fetchColumn();

if (!$perfilId || !$deptId) {
    http_response_code(500);
    exit("Schema incompleto: importa database.sql antes de correr este instalador.\n");
}

$hash = password_hash(Senha::INICIAL, PASSWORD_BCRYPT);

$pdo->prepare(
    'INSERT INTO utilizadores (username, senha_hash, nome_completo, email, perfil_id, departamento_id, activo, obrigar_troca_senha)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)'
)->execute(['admin', $hash, 'Administrador', 'admin@supremo.cv', $perfilId, $deptId]);

echo "Utilizador 'admin' criado (senha inicial: " . Senha::INICIAL . " — troca obrigatória no primeiro login).\n";
echo "IMPORTANTE: apaga este ficheiro (instalar.php) e remove INSTALL_TOKEN do .env agora.\n";
