<?php
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Core/ApiGuard.php';
ApiGuard::aplicar();
require_once __DIR__ . '/../../app/Controllers/ProcessoController.php';
(new ProcessoController())->obter();
