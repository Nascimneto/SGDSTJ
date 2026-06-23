<?php
require_once __DIR__ . '/includes/guard.php';
exigirPerfil(['Administrador']);
require_once __DIR__ . '/config/conexao.php';

$paginaActiva = 'auditoria';
// Título reflecte o item de menu seguido (Histórico vs Auditoria — ver
// includes/sidebar.php) e a aba inicial é decidida em js/auditoria.js.
$tituloPagina = ($_GET['aba'] ?? 'historico') === 'sistema' ? 'Auditoria' : 'Histórico';

$pdo          = obterConexao();
$utilizadores = $pdo->query('SELECT nome_completo FROM utilizadores ORDER BY nome_completo')->fetchAll(PDO::FETCH_COLUMN);
// Tipos de evento do histórico de processos (historico_processo) e da
// auditoria do sistema (auditoria_sistema) são listas distintas — ver
// includes/log.php e database.sql para a separação entre as duas tabelas.
$tiposHistorico = ['REGISTO', 'EDICAO', 'ESTADO', 'DATA'];
$tiposAuditoria = ['UTILIZADOR', 'CONFIGURACAO'];
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

      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-sm btn-primary" id="abaHistorico"><i class="ti ti-files"></i> Histórico de Processos</button>
        <button class="btn btn-sm" id="abaSistema"><i class="ti ti-shield-lock"></i> Auditoria do Sistema</button>
      </div>

      <div class="panel">
        <div class="proc-tb">
          <div class="proc-tb-l">
            <i class="ti ti-history" style="color:var(--purple);font-size:17px;flex-shrink:0"></i>
            <span class="panel-title" id="audCountLabel" style="white-space:nowrap">Histórico</span>
            <div class="sw"><i class="ti ti-search"></i>
              <input id="fQ" placeholder="Pesquisar...">
            </div>
            <select class="btn btn-sm" id="fTipo">
              <option value="">Todos os tipos</option>
            </select>
            <select class="btn btn-sm" id="fUtilizador">
              <option value="">Todos os utilizadores</option>
              <?php foreach ($utilizadores as $u): ?>
                <option value="<?= sgd_e($u) ?>"><?= sgd_e($u) ?></option>
              <?php endforeach; ?>
            </select>
            <input type="date" class="btn btn-sm" id="fDataDe" title="Data — de">
            <input type="date" class="btn btn-sm" id="fDataAte" title="Data — até">
            <button class="btn btn-sm" id="btnLimparFiltros"><i class="ti ti-filter-off"></i></button>
          </div>
        </div>
        <div id="audTbl"><div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div></div>
      </div>

    </div>
  </div>
</div>
<?php include __DIR__ . '/includes/modais.php'; ?>
<script>
  // Lido por auditoria.js para preencher #fTipo de acordo com a aba activa.
  window.SGD_TIPOS_HISTORICO = <?= json_encode($tiposHistorico) ?>;
  window.SGD_TIPOS_AUDITORIA = <?= json_encode($tiposAuditoria) ?>;
</script>
<script src="<?= sgd_asset('js/comum.js') ?>"></script>
<script src="<?= sgd_asset('js/api.js') ?>"></script>
<script src="<?= sgd_asset('js/auditoria.js') ?>"></script>
</body>
</html>
