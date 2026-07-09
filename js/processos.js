/**
 * processos.js — Lista de Processos: tabela, filtros avançados,
 * paginação e exportação PDF/Excel.
 */

var TODOS_PROCESSOS = [];
var PROC_PG = 1;
var PROC_PAGE_SIZE = window.SGD_PAGE_SIZE || 15;
// ?ver=<numero> abre o detalhe desse processo uma única vez, ao carregar a
// página — guardado aqui (não relido da URL) para não voltar a abrir a cada
// filtro/recarregarProcessos() depois.
var PARAM_VER_INICIAL = new URLSearchParams(window.location.search).get('ver');

document.addEventListener('DOMContentLoaded', function () {
  ['fQ'].forEach(function (id) {
    var el = G(id);
    if (el) el.addEventListener('input', function () { PROC_PG = 1; recarregarProcessos(); });
  });
  ['fEstado', 'fEspecie', 'fDataDe', 'fDataAte'].forEach(function (id) {
    var el = G(id);
    if (el) el.addEventListener('change', function () { PROC_PG = 1; recarregarProcessos(); });
  });

  var limpar = G('btnLimparFiltros');
  if (limpar) limpar.addEventListener('click', function () {
    G('fQ').value = ''; G('fEstado').value = ''; G('fEspecie').value = '';
    G('fDataDe').value = ''; G('fDataAte').value = '';
    PROC_PG = 1;
    recarregarProcessos();
  });

  var closeCrudBtn = G('closeCrudBtn');
  if (closeCrudBtn) closeCrudBtn.addEventListener('click', closeCrud);
  var closeDetBtn = G('closeDetBtn');
  if (closeDetBtn) closeDetBtn.addEventListener('click', function () { G('detM').classList.remove('open'); });

  var exportPdf  = G('btnExportPdf');
  var exportXlsx = G('btnExportXlsx');
  if (exportPdf)  exportPdf.addEventListener('click', exportarPDF);
  if (exportXlsx) exportXlsx.addEventListener('click', exportarExcel);

  recarregarProcessos();

  var params = new URLSearchParams(window.location.search);
  if (params.get('novo') === '1') abrirCriar();
  // Consome "novo"/"ver" da URL depois de os usar — sem isto, dar refresh no
  // browser (ou voltar atrás) reabre sempre o formulário/detalhe, vazio,
  // porque o parâmetro continua lá.
  if (params.get('novo') === '1' || params.get('ver')) {
    history.replaceState(null, '', window.location.pathname);
  }
});

function paramsFiltro() {
  var p = new URLSearchParams();
  var q = GV('fQ').trim();             if (q)    p.set('q', q);
  var estado = GV('fEstado');          if (estado)   p.set('estado', estado);
  var especie = GV('fEspecie');        if (especie)  p.set('especie', especie);
  var de = GV('fDataDe');              if (de)   p.set('data_de', de);
  var ate = GV('fDataAte');            if (ate)  p.set('data_ate', ate);
  return p.toString();
}

function recarregarProcessos() {
  apiGet('api/processos/listar.php?' + paramsFiltro()).then(function (res) {
    TODOS_PROCESSOS = res.items;
    renderTabela();

    if (PARAM_VER_INICIAL) {
      var match = TODOS_PROCESSOS.filter(function (p) { return p.numero_processo === PARAM_VER_INICIAL; })[0];
      if (match) abrirDetalhe(match.id);
      PARAM_VER_INICIAL = null;
    }
  }).catch(function (e) {
    G('procTbl').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro ao carregar: ' + esc(e.message) + '</p></div>';
  });
}

function renderTabela() {
  var pg = paginate(TODOS_PROCESSOS, PROC_PG, PROC_PAGE_SIZE);
  G('procCountLabel').textContent = 'Processos (' + TODOS_PROCESSOS.length + ')';
  G('procTbl').innerHTML = tblHTML(pg.items) + mobileCards(pg.items)
    + (pg.total === 0 ? '<div class="empty"><i class="ti ti-file-off"></i><p>Nenhum processo encontrado</p></div>' : '')
    + mkPager(pg, 'irParaPaginaProc');
  fadeIn(G('procTbl'));
  syncCards();
}

function irParaPaginaProc(p) { PROC_PG = p; renderTabela(); }

/* ─── Tabela desktop ─── */
function tblHTML(data) {
  if (!data.length) return '';
  var colgroup = '<colgroup>'
    + '<col class="c-num"><col class="c-numext"><col class="c-date"><col class="c-esp"><col class="c-partes">'
    + '<col class="c-dist"><col class="c-orig">'
    + '<col class="c-est"><col class="c-act">'
    + '</colgroup>';
  var head = '<div class="tbl-outer"><table class="pt">' + colgroup + '<thead><tr>'
    + '<th class="th0" style="min-width:110px">N&ordm; de Registo de Processo</th>'
    + '<th>N&ordm; de Processo</th>'
    + '<th>Data Entrada</th>'
    + '<th>Esp&eacute;cie</th>'
    + '<th style="min-width:120px">Intervenientes / Partes</th>'
    + '<th style="min-width:85px">Distribui&ccedil;&atilde;o</th>'
    + '<th>Origem</th>'
    + '<th>Estado</th>'
    + '<th>Ac&ccedil;&otilde;es</th>'
    + '</tr></thead><tbody>';
  var rows = data.map(function (d) {
    var delBtn = isAdm()
      ? '<button class="btn btn-icon btn-xs" title="Eliminar" style="color:var(--red)" onclick="delDoc(' + d.id + ',\'' + esc(d.numero_processo) + '\')"><i class="ti ti-trash"></i></button>'
      : '';
    var editBtn = podeEditar()
      ? '<button class="btn btn-icon btn-xs" title="Editar" onclick="abrirEditar(' + d.id + ')"><i class="ti ti-edit"></i></button>'
      : '';
    return '<tr>'
      + '<td class="td0 tdl">' + esc(d.numero_processo) + '</td>'
      + '<td class="tdl">' + esc(d.numero_processo_externo || '—') + '</td>'
      + '<td class="tdl tdd">' + esc(d.data_entrada) + '</td>'
      + '<td class="tdl"><span class="badge b-type">' + esc(d.especie) + '</span></td>'
      + '<td class="tdl" style="max-width:160px">' + esc(trunc(d.partes, 38)) + '</td>'
      + '<td class="tdl">' + esc(trunc(d.distribuicao || '—', 18)) + '</td>'
      + '<td class="tdl">' + esc(trunc(d.origem || '—', 16)) + '</td>'
      + '<td class="tdl"><span class="badge ' + esc(d.estado_cor) + '">' + esc(d.estado) + '</span></td>'
      + '<td class="td-act"><div style="display:flex;gap:2px;justify-content:center">'
      + '<button class="btn btn-icon btn-xs" title="Ver" onclick="abrirDetalhe(' + d.id + ')"><i class="ti ti-eye"></i></button>'
      + editBtn + delBtn + '</div></td></tr>';
  }).join('');
  return head + rows + '</tbody></table></div>';
}

/* ─── Cards mobile ─── */
function mobileCards(data) {
  if (!data.length) return '';
  var cards = data.map(function (d) {
    var delBtn = isAdm()
      ? '<button class="btn btn-sm" style="color:var(--red);margin-left:auto" onclick="delDoc(' + d.id + ',\'' + esc(d.numero_processo) + '\')"><i class="ti ti-trash"></i></button>'
      : '';
    var editBtn = podeEditar()
      ? '<button class="btn btn-sm" onclick="abrirEditar(' + d.id + ')"><i class="ti ti-edit"></i> Editar</button>'
      : '';
    var fields = [
      ['Conclusao', d.conclusao], ['Notif./Citacao', d.notificacao_citacao], ['Notif. 1', d.notificacao1], ['Notif. 2', d.notificacao2],
      ['Visto MP', d.visto_mp], ['Visto Adj.1', d.visto_adjunto1], ['Visto Adj.2', d.visto_adjunto2],
      ['Ins. Tabela', d.inscricao_tabela], ['Acordao', d.acordao],
      ['Notif. Acordao', d.notificacao_acordao], ['Conta/Custas', d.conta_custas], ['Arquivamento', d.arquivamento]
    ];
    var grid = fields.map(function (f) {
      return '<div class="pc-f"><span class="pc-fl">' + f[0] + '</span>'
        + '<span class="pc-fv ' + (f[1] ? 'ok' : 'no') + '">'
        + '<i class="ti ti-' + (f[1] ? 'circle-check' : 'circle') + '" style="font-size:12px;margin-right:2px"></i>'
        + esc(f[1] || 'Pendente') + '</span></div>';
    }).join('');
    return '<div class="pc-card">'
      + '<div class="pc-head" onclick="toggleCard(\'pcc_' + d.id + '\')"><div>'
      + '<span class="pc-id">' + esc(d.numero_processo) + '</span>'
      + '<div style="font-size:13px;font-weight:500">' + esc(trunc(d.partes, 55)) + '</div></div>'
      + '<span class="badge ' + esc(d.estado_cor) + '" style="flex-shrink:0">' + esc(d.estado) + '</span></div>'
      + '<div class="pc-meta"><span class="badge b-type">' + esc(d.especie) + '</span>'
      + '<span style="font-size:11px;color:var(--tx2)">' + esc(d.origem) + '</span>'
      + '<span style="font-size:11px;color:var(--tx2)">' + esc(d.data_entrada) + '</span></div>'
      + '<div class="pc-body" id="pcc_' + d.id + '">'
      + '<div style="font-size:11px;font-weight:700;color:var(--tx2);text-transform:uppercase;margin-bottom:8px">Distribuicao: ' + esc(d.distribuicao || '—') + '</div>'
      + '<div class="pc-grid">' + grid + '</div>'
      + (d.observacoes ? '<div class="obs-box" style="font-size:12px"><b>OBS:</b> ' + esc(d.observacoes) + '</div>' : '')
      + '</div><div class="pc-act">'
      + '<button class="btn btn-sm" onclick="abrirDetalhe(' + d.id + ')"><i class="ti ti-eye"></i> Ver</button>'
      + editBtn + delBtn
      + '<button class="btn btn-xs" onclick="toggleCard(\'pcc_' + d.id + '\')" style="color:var(--blue);margin-left:' + ((isAdm() || podeEditar()) ? '0' : 'auto') + '">Detalhes &#8964;</button>'
      + '</div></div>';
  }).join('');
  return '<div class="pc-list">' + cards + '</div>';
}

function toggleCard(id) { var b = G(id); if (b) b.classList.toggle('open'); }

/* ─── Exportação PDF / Excel (jsPDF + autotable, SheetJS) ─── */
function colunasExport() {
  return ['N Registo Processo', 'N Processo', 'Data Entrada', 'Especie', 'Partes', 'Distribuicao', 'Origem',
    'Conclusao', 'Notif/Citacao', 'Notif 1', 'Notif 2', 'Visto MP', 'Visto Adj1', 'Visto Adj2',
    'Ins Tabela', 'Acordao', '2 Acordao', '3 Acordao', 'Notif Acordao', 'Conta Custas', '2 Conta Custas', 'Arquivamento', 'Estado'];
}

function linhasExport() {
  return TODOS_PROCESSOS.map(function (d) {
    return [d.numero_processo, d.numero_processo_externo || '', d.data_entrada, d.especie, d.partes, d.distribuicao || '', d.origem,
      d.conclusao || '', d.notificacao_citacao || '', d.notificacao1 || '', d.notificacao2 || '', d.visto_mp || '', d.visto_adjunto1 || '', d.visto_adjunto2 || '',
      d.inscricao_tabela || '', d.acordao || '', d.acordao2 || '', d.acordao3 || '', d.notificacao_acordao || '', d.conta_custas || '', d.conta_custas2 || '', d.arquivamento || '', d.estado];
  });
}

function exportarPDF() {
  if (!TODOS_PROCESSOS.length) { showToast('Sem processos para exportar', 'ti-alert-circle', 'red'); return; }
  var doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(13);
  doc.text('SGD — Lista de Processos', 14, 12);
  doc.autoTable({ head: [colunasExport()], body: linhasExport(), startY: 18, styles: { fontSize: 6 } });
  doc.save('SGD_Processos.pdf');
}

function exportarExcel() {
  if (!TODOS_PROCESSOS.length) { showToast('Sem processos para exportar', 'ti-alert-circle', 'red'); return; }
  var ws = window.XLSX.utils.aoa_to_sheet([colunasExport()].concat(linhasExport()));
  var wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, 'Processos');
  window.XLSX.writeFile(wb, 'SGD_Processos.xlsx');
}
