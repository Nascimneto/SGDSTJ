<?php
/**
 * Página de entrada (login). Apache já serve index.php por defeito para "/"
 * sem precisar de `DirectoryIndex` no .htaccess — essa directiva (categoria
 * "Indexes" do AllowOverride) causa erro 500 em hosts partilhados que a
 * bloqueiam por segurança (ex: Hostinger, em alguns planos), por isso o
 * ponto de entrada vive directamente aqui em vez de um login.php separado
 * com redirecionamento.
 */
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Controllers/AuthController.php';
(new AuthController())->index();
