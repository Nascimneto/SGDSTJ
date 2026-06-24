<?php
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Core/PageGuard.php';
PageGuard::aplicar();
require_once __DIR__ . '/app/Controllers/EstatisticaController.php';
(new EstatisticaController())->index();
