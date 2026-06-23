<?php
require_once __DIR__ . '/includes/guard.php';
$paginaActiva = 'perfil';
$tituloPagina = 'O Meu Perfil';
?>
<!DOCTYPE html>
<html lang="pt">
<head>
<?php include __DIR__ . '/includes/head.php'; ?>
</head>
<body data-pagina="<?= sgd_e($paginaActiva) ?>">
<div id="app">
  <?php include __DIR__ . '/includes/sidebar.php'; ?>
  <div class="main">
    <?php include __DIR__ . '/includes/topbar.php'; ?>
    <div class="content" id="content"></div>
  </div>
</div>
<?php include __DIR__ . '/includes/modais.php'; ?>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="<?= sgd_asset('js/perfil.js') ?>"></script>
</body>
</html>
