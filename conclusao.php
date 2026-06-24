<?php
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Core/PageGuard.php';
PageGuard::aplicar();
PageGuard::exigirEscrita();
require_once __DIR__ . '/app/Controllers/ConclusaoController.php';
(new ConclusaoController())->index();
