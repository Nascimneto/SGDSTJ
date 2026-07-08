<?php
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Core/ApiGuard.php';
ApiGuard::aplicar();
ApiGuard::exigirPerfil(['Administrador']);
require_once __DIR__ . '/../../app/Controllers/ConfiguracaoController.php';
(new ConfiguracaoController())->departamentosEliminar();
