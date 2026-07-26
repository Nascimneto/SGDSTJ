<!DOCTYPE html>
<html lang="pt">
<head>
<?php include __DIR__ . '/../../../includes/head.php'; ?>
</head>
<body data-pagina="<?= sgd_e($paginaActiva) ?>">
<div id="app">
  <?php include __DIR__ . '/../../../includes/sidebar.php'; ?>
  <div class="main">
    <?php include __DIR__ . '/../../../includes/topbar.php'; ?>
    <div class="content" id="content">
      <div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div>
    </div>
  </div>
</div>
<?php include __DIR__ . '/../../../includes/modais.php'; ?>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js" integrity="sha384-NrKB+u6Ts6AtkIhwPixiKTzgSKNblyhlk0Sohlgar9UHUBzai/sgnNNWWd291xqt" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js" integrity="sha384-y49Zu59jZHJL/PLKgZPv3k2WI9c0Yp3pWB76V8OBVCb0QBKS8l4Ff3YslzHVX76Y" crossorigin="anonymous"></script>
<script src="<?= sgd_asset('js/painel.js') ?>"></script>
</body>
</html>
