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

<div class="modal-bg" id="crudM">
  <div class="modal">
    <div class="modal-hd">
      <i class="ti ti-user-plus" style="font-size:21px;color:var(--blue)"></i>
      <h2 id="crudT">Novo Utilizador</h2>
      <button class="btn btn-icon" id="closeCrudBtn"><i class="ti ti-x"></i></button>
    </div>
    <div class="modal-body" id="crudB"></div>
    <div class="modal-ft" id="crudF"></div>
  </div>
</div>

<script>
  window.SGD_PERFIS = <?= json_encode($perfis) ?>;
  window.SGD_DEPARTAMENTOS = <?= json_encode($departamentos) ?>;
</script>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="<?= sgd_asset('js/utilizadores.js') ?>"></script>
</body>
</html>
