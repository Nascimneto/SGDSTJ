<?php
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Core/ApiGuard.php';
ApiGuard::aplicar();
require_once __DIR__ . '/../../app/Controllers/PerfilController.php';
(new PerfilController())->atualizar();
