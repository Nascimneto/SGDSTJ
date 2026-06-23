<?php
/**
 * Substitui `DirectoryIndex login.php` do .htaccess — essa directiva
 * (categoria "Indexes" do AllowOverride) causa erro 500 em hosts
 * partilhados que a bloqueiam por segurança (ex: Hostinger, em alguns
 * planos). Apache já usa index.php como página de entrada por defeito,
 * sem precisar de permissão extra no .htaccess.
 */
header('Location: login.php');
exit;
