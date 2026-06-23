<?php
require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/config/conexao.php';

$paginaActiva = 'processos';
$tituloPagina = 'Lista de Processos';

$pdo       = obterConexao();
$especies  = $pdo->query('SELECT nome FROM especies_processo WHERE activo = 1 ORDER BY ordem')->fetchAll(PDO::FETCH_COLUMN);
$estados   = $pdo->query('SELECT codigo, label FROM estados_processo ORDER BY ordem')->fetchAll();
$pageSize  = (int)($pdo->query("SELECT valor FROM configuracoes WHERE chave = 'processos_pagina'")->fetchColumn() ?: 15);
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

      <div class="panel">
        <div class="proc-tb">
          <div class="proc-tb-l">
            <i class="ti ti-files" style="color:var(--blue);font-size:17px;flex-shrink:0"></i>
            <span class="panel-title" id="procCountLabel" style="white-space:nowrap">Processos</span>
            <div class="sw"><i class="ti ti-search"></i>
              <input id="fQ" placeholder="N&ordm;, partes, origem...">
            </div>
            <select class="btn btn-sm" id="fEstado">
              <option value="">Todos os estados</option>
              <?php foreach ($estados as $e): ?>
                <option value="<?= sgd_e($e['codigo']) ?>"><?= sgd_e($e['label']) ?></option>
              <?php endforeach; ?>
            </select>
            <select class="btn btn-sm" id="fEspecie">
              <option value="">Todas as espécies</option>
              <?php foreach ($especies as $esp): ?>
                <option value="<?= sgd_e($esp) ?>"><?= sgd_e($esp) ?></option>
              <?php endforeach; ?>
            </select>
            <input class="btn btn-sm" id="fDistribuicao" placeholder="Distribuição..." style="max-width:140px">
            <input type="date" class="btn btn-sm" id="fDataDe" title="Data de registo — de">
            <input type="date" class="btn btn-sm" id="fDataAte" title="Data de registo — até">
            <button class="btn btn-sm" id="btnLimparFiltros"><i class="ti ti-filter-off"></i></button>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-sm" id="btnExportPdf" title="Gerar PDF"><i class="ti ti-file-type-pdf"></i> PDF</button>
            <button class="btn btn-sm" id="btnExportXlsx" title="Gerar Excel"><i class="ti ti-file-type-xls"></i> Excel</button>
          </div>
        </div>
        <div id="procTbl"><div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div></div>
      </div>

    </div>
  </div>
</div>
<?php include __DIR__ . '/includes/modais.php'; ?>

<!-- ═══ MODAL CRUD (criar/editar processo) ═══ -->
<div class="modal-bg" id="crudM">
  <div class="modal">
    <div class="modal-hd">
      <i class="ti ti-file-plus" style="font-size:21px;color:var(--blue)"></i>
      <h2 id="crudT">Novo Processo</h2>
      <button class="btn btn-icon" id="closeCrudBtn"><i class="ti ti-x"></i></button>
    </div>
    <div class="modal-body" id="crudB"></div>
    <div class="modal-ft" id="crudF"></div>
  </div>
</div>

<!-- ═══ MODAL DETALHE ═══ -->
<div class="modal-bg" id="detM">
  <div class="modal">
    <div class="modal-hd">
      <i class="ti ti-file-search" style="font-size:21px;color:var(--blue)"></i>
      <h2 id="detT">Detalhes</h2>
      <button class="btn btn-icon" id="closeDetBtn"><i class="ti ti-x"></i></button>
    </div>
    <div class="modal-body" id="detB"></div>
    <div class="modal-ft" id="detF"></div>
  </div>
</div>

<script>
  window.SGD_ESPECIES  = <?= json_encode($especies) ?>;
  window.SGD_ESTADOS   = <?= json_encode($estados) ?>;
  window.SGD_PAGE_SIZE  = <?= json_encode($pageSize) ?>;
</script>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js" integrity="sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.min.js" integrity="sha384-b8MpgG2ZzWN6OPAtiB1JiBmDr9MpTt3NKK6KQf61hC/L7X4wJrvoTeVmMFPgp3nL" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" crossorigin="anonymous"></script>
<script src="<?= sgd_asset('js/processo-form.js') ?>"></script>
<script src="<?= sgd_asset('js/processos.js') ?>"></script>
</body>
</html>
