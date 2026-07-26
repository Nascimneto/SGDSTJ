<!DOCTYPE html>
<html lang="pt">
<head>
<?php include __DIR__ . '/../../../includes/head.php'; ?>
</head>
<body data-pagina="<?= sgd_e($paginaActiva) ?>">
<div id="app">
  <?php include __DIR__ . '/../../../includes/sidebar.php'; ?>
  <div class="main">
    <div class="topbar">
      <button class="topbar-menu" id="menuBtn"><i class="ti ti-menu-2"></i></button>
      <span id="ttitle" style="font-size:15px;font-weight:600"><?= sgd_e($tituloPagina) ?></span>
      <div class="topbar-right">
        <button class="btn btn-sm" id="btnImprimir" title="Imprimir página"><i class="ti ti-printer"></i> Imprimir</button>
        <button class="btn btn-sm btn-danger" id="btnExportPdf" title="Gerar PDF"><i class="ti ti-file-type-pdf"></i> PDF</button>
        <button class="btn btn-sm btn-success" id="btnExportXlsx" title="Gerar Excel"><i class="ti ti-file-type-xls"></i> Excel</button>
      </div>
    </div>
    <div class="content" id="content">

      <!-- no-print: barra de filtros não faz sentido numa folha impressa -->
      <div class="panel no-print" style="padding:10px 14px;margin-bottom:12px">
        <div class="proc-tb" style="border:none;padding:0">
          <div class="proc-tb-l">
            <i class="ti ti-filter" style="color:var(--amber);font-size:16px;flex-shrink:0"></i>
            <select class="btn btn-sm" id="fEstUtilizador">
              <option value="">Todos os utilizadores</option>
              <?php foreach ($utilizadores as $u): ?>
                <option value="<?= (int)$u['id'] ?>"><?= sgd_e($u['nome_completo']) ?></option>
              <?php endforeach; ?>
            </select>
            <input type="date" class="btn btn-sm" id="fEstDataDe" title="Data de registo — de">
            <input type="date" class="btn btn-sm" id="fEstDataAte" title="Data de registo — até">
            <button class="btn btn-sm" id="btnLimparFiltrosEst"><i class="ti ti-filter-off"></i></button>
            <select class="btn btn-sm" id="fTipoGrafico" style="margin-left:auto">
              <option value="bar">Gráfico de Barras</option>
              <option value="pie">Gráfico de Pizza</option>
              <option value="line">Gráfico de Linha</option>
            </select>
          </div>
        </div>
      </div>

      <div id="estCorpo"><div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div></div>

    </div>
  </div>
</div>
<?php include __DIR__ . '/../../../includes/modais.php'; ?>

<!-- Drill-down: clicar num valor (barra/fatia/ponto do gráfico, ou linha da tabela) em
     qualquer um dos 5 tabs abre este modal com a distribuição por duas dimensões
     relacionadas, só dos processos daquele valor — ver abrirDetalheEixo() em estatisticas.js. -->
<div class="modal-bg" id="estDetalheBg">
  <div class="modal" style="max-width:640px">
    <div class="modal-hd">
      <i class="ti ti-chart-pie" style="font-size:21px;color:var(--blue)"></i>
      <h2 id="estDetalheTitulo">Detalhe</h2>
      <button class="btn btn-sm btn-danger" id="estDetalheExportPdf" title="Exportar este detalhe em PDF"><i class="ti ti-file-type-pdf"></i> PDF</button>
      <button class="btn btn-icon" id="estDetalheClose"><i class="ti ti-x"></i></button>
    </div>
    <div class="modal-body">
      <div id="estDetalheStats"></div>
      <div class="row2">
        <div>
          <div id="estDetalheLabelA" style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:8px"></div>
          <div style="position:relative;height:280px"><canvas id="chartDetalheA"></canvas></div>
        </div>
        <div>
          <div id="estDetalheLabelB" style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:8px"></div>
          <div style="position:relative;height:280px"><canvas id="chartDetalheB"></canvas></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js" integrity="sha384-NrKB+u6Ts6AtkIhwPixiKTzgSKNblyhlk0Sohlgar9UHUBzai/sgnNNWWd291xqt" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js" integrity="sha384-y49Zu59jZHJL/PLKgZPv3k2WI9c0Yp3pWB76V8OBVCb0QBKS8l4Ff3YslzHVX76Y" crossorigin="anonymous"></script>
<!-- jsPDF/xlsx (exportação) são carregadas a pedido por carregarLibPdf()/carregarLibXlsx()
     em js/estatisticas.js — só quando os botões PDF/Excel são clicados, não no arranque
     da página (jspdf-autotable deixou de ser necessário: o PDF já não desenha tabelas). -->
<script src="<?= sgd_asset('js/estatisticas.js') ?>"></script>
</body>
</html>
