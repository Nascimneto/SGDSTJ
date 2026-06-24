<?php
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Controllers/AuthController.php';
(new AuthController())->login();
