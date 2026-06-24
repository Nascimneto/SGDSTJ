<?php
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Core/PageGuard.php';
PageGuard::aplicar();
PageGuard::exigirPerfil(['Administrador']);
require_once __DIR__ . '/app/Controllers/UtilizadorController.php';
(new UtilizadorController())->index();
