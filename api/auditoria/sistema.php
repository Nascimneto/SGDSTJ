<?php
/**
 * Auditoria do sistema (auditoria_sistema) — acções administrativas fora
 * do âmbito de um processo. Distinta de api/auditoria/listar.php, que lista
 * o histórico por processo (historico_processo).
 */
require_once __DIR__ . '/../../app/bootstrap.php';
require_once __DIR__ . '/../../app/Core/ApiGuard.php';
ApiGuard::aplicar();
ApiGuard::exigirPerfil(['Administrador']);
require_once __DIR__ . '/../../app/Controllers/AuditoriaController.php';
(new AuditoriaController())->sistema();
