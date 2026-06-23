<?php
require_once __DIR__ . '/includes/guard.php';
exigirEscrita();
$paginaActiva = 'vistos';
$tituloPagina = 'Vistos';
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
    <div class="content" id="content">
      <div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div>
    </div>
  </div>
</div>
<?php include __DIR__ . '/includes/modais.php'; ?>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="<?= sgd_asset('js/vistos.js') ?>"></script>
</body>
</html>
