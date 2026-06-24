<?php
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Core/PageGuard.php';
PageGuard::aplicar();
PageGuard::exigirPerfil(['Administrador']);
require_once __DIR__ . '/app/Controllers/ConfiguracaoController.php';
(new ConfiguracaoController())->index();
