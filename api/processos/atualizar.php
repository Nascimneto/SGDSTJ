<?php
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Core/ApiGuard.php';
ApiGuard::aplicar();
ApiGuard::exigirEscrita();
require_once __DIR__ . '/../../app/Controllers/ProcessoController.php';
(new ProcessoController())->atualizar();
