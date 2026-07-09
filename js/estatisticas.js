/**
 * estatisticas.js — Relatórios por: Período, Juiz Relator, Espécie, Estado, Origem.
 */
var SGD_COR_ESTADO = window.SGD_COR_ESTADO || { entry:'#2563EB', analysis:'#7C3AED', distributed:'#D97706', concluded:'#059669', archived:'#9CA3AF' };
var PALETA = ['#2563EB','#7C3AED','#D97706','#059669','#DB2777','#0891B2','#9333EA','#CA8A04','#475569'];
var MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

var ULTIMOS_DADOS    = null;
var TIPO_GRAFICO     = 'bar';
var CHART_ACTIVO     = null;
var relatorioActivo  = 'periodo';
var escalaVolume     = 'mensal';

if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}

var TABS = [
  { cod:'periodo', icon:'ti-calendar',  label:'Por Período' },
  { cod:'juiz',    icon:'ti-users',     label:'Por Juiz Relator' },
  { cod:'especie', icon:'ti-category',  label:'Por Espécie' },
  { cod:'estado',  icon:'ti-circle',    label:'Por Estado' },
  { cod:'origem',  icon:'ti-building',  label:'Por Origem' },
];

document.addEventListener('DOMContentLoaded', function () {
  carregarEstatisticas();

  ['fEstUtilizador','fEstDataDe','fEstDataAte'].forEach(function (id) {
    var el = G(id); if (el) el.addEventListener('change', carregarEstatisticas);
  });

  var limpar = G('btnLimparFiltrosEst');
  if (limpar) limpar.addEventListener('click', function () {
    G('fEstUtilizador').value = ''; G('fEstDataDe').value = ''; G('fEstDataAte').value = '';
    carregarEstatisticas();
  });

  var tipoG = G('fTipoGrafico');
  if (tipoG) tipoG.addEventListener('change', function () {
    TIPO_GRAFICO = tipoG.value;
    if (ULTIMOS_DADOS) renderTab(relatorioActivo, ULTIMOS_DADOS);
  });

  var btnPdf = G('btnExportPdf'),  btnXls = G('btnExportXlsx'),  btnPrn = G('btnImprimir');
  if (btnPdf) btnPdf.addEventListener('click', exportarPDF);
  if (btnXls) btnXls.addEventListener('click', exportarExcel);
  if (btnPrn) btnPrn.addEventListener('click', function () { window.print(); });
});

/* ─── Filtros e carregamento ─── */
function paramsFiltros() {
  var p = new URLSearchParams();
  var u = GV('fEstUtilizador');  if (u)  p.set('utilizador', u);
  var de = GV('fEstDataDe');     if (de) p.set('data_de', de);
  var at = GV('fEstDataAte');    if (at) p.set('data_ate', at);
  return p.toString();
}

function carregarEstatisticas() {
  G('estCorpo').innerHTML = '<div class="empty"><i class="ti ti-loader-2"></i><p>A carregar...</p></div>';
  var qs = paramsFiltros();
  var qp = qs ? '?' + qs : '';
  Promise.all([
    apiGet('api/estatisticas/distribuicao.php' + qp),
    apiGet('api/estatisticas/volume.php?escala=' + escalaVolume + (qs ? '&' + qs : '')),
    apiGet('api/estatisticas/produtividade.php' + qp),
  ]).then(function (res) {
    ULTIMOS_DADOS = { distribuicao: res[0], volume: res[1], produtividade: res[2] };
    renderEstatisticas(ULTIMOS_DADOS);
  }).catch(function (e) {
    G('estCorpo').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

/* ─── Layout de tabs ─── */
function renderEstatisticas(d) {
  var tabBar = '<div class="no-print" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'
    + TABS.map(function (t) {
        return '<button id="tab-' + t.cod + '" class="btn btn-sm' + (t.cod === relatorioActivo ? ' btn-primary' : '') + '">'
          + '<i class="ti ' + t.icon + '"></i> ' + t.label + '</button>';
      }).join('')
    + '</div><div id="relCorpo"></div>';

  G('estCorpo').innerHTML = tabBar;

  TABS.forEach(function (t) {
    var btn = G('tab-' + t.cod);
    if (!btn) return;
    btn.addEventListener('click', function () {
      relatorioActivo = t.cod;
      TABS.forEach(function (x) {
        var b = G('tab-' + x.cod);
        if (b) b.className = 'btn btn-sm' + (x.cod === t.cod ? ' btn-primary' : '');
      });
      renderTab(t.cod, d);
    });
  });

  renderTab(relatorioActivo, d);
}

function renderTab(tab, d) {
  if (CHART_ACTIVO) { CHART_ACTIVO.destroy(); CHART_ACTIVO = null; }
  var el = G('relCorpo');
  if (!el) return;
  if      (tab === 'periodo') { el.innerHTML = htmlTabPeriodo(d.volume);       attachEscala(); desenharGraficoPeriodo(d.volume); }
  else if (tab === 'juiz')    { el.innerHTML = htmlTabJuiz(d.produtividade);   desenharGraficoJuiz(d.produtividade); }
  else if (tab === 'especie') { el.innerHTML = htmlTabEspecie(d.distribuicao); desenharGraficoSimples('chartEspecie', d.distribuicao.porEspecie || [], 'especie'); }
  else if (tab === 'estado')  { el.innerHTML = htmlTabEstado(d.distribuicao);  desenharGraficoSimples('chartEstado',  d.distribuicao.porEstado  || [], 'estado'); }
  else if (tab === 'origem')  { el.innerHTML = htmlTabOrigem(d.distribuicao);  desenharGraficoSimples('chartOrigem',  d.distribuicao.porOrigem  || [], 'origem'); }
  fadeIn(el);
}

/* ═══ Tab: Por Período ═══ */
function htmlTabPeriodo(vol) {
  var dados  = (vol && vol.dados) || [];
  var escala = escalaVolume;
  var totalReg  = dados.reduce(function (a, d) { return a + (+d.registados  || 0); }, 0);
  var totalConc = dados.reduce(function (a, d) { return a + (+d.concluidos  || 0); }, 0);
  var saldo = totalReg - totalConc;

  var linhas = dados.slice().reverse().map(function (d) {
    var lbl = escala === 'anual' ? d.periodo
      : (function () { var p = d.periodo.split('-'); return MESES_PT[parseInt(p[1]) - 1] + '/' + p[0]; }());
    var s = (+d.registados || 0) - (+d.concluidos || 0);
    return '<tr>'
      + '<td class="tdl" style="padding:8px 12px">' + esc(lbl) + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--blue);font-weight:600">' + d.registados + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--green);font-weight:600">' + d.concluidos + '</td>'
      + '<td style="text-align:center;padding:8px 12px;font-weight:600;color:' + (s > 0 ? 'var(--amber)' : 'var(--green)') + '">' + (s > 0 ? '+' : '') + s + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
    + statCard('ti-inbox',        'var(--blue)',  'Registados',  totalReg,  'No período seleccionado')
    + statCard('ti-circle-check', 'var(--green)', 'Concluídos',  totalConc, 'No período seleccionado')
    + statCard('ti-trending-up',  saldo > 0 ? 'var(--amber)' : 'var(--green)', 'Saldo', (saldo > 0 ? '+' : '') + saldo, 'Registados menos concluídos')
    + '</div>'
    + '<div class="panel" style="padding:16px;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    + '<div style="font-size:13px;font-weight:600"><i class="ti ti-chart-bar" style="color:var(--blue)"></i> Registados vs Concluídos</div>'
    + '<div style="display:flex;gap:4px">'
    + '<button id="btn-escala-mensal" class="btn btn-xs' + (escala === 'mensal' ? ' btn-primary' : '') + '">Mensal</button>'
    + '<button id="btn-escala-anual"  class="btn btn-xs' + (escala === 'anual'  ? ' btn-primary' : '') + '">Anual</button>'
    + '</div></div>'
    + '<div style="position:relative;height:220px"><canvas id="chartPeriodo"></canvas></div>'
    + '<div style="display:flex;gap:14px;margin-top:8px;font-size:10px;color:var(--tx3)">'
    + '<span><span style="display:inline-block;width:10px;height:8px;background:#2563EB;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Registados</span>'
    + '<span><span style="display:inline-block;width:10px;height:8px;background:#059669;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Concluídos</span>'
    + '</div></div>'
    + '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-table" style="color:var(--blue)"></i>'
    + '<span class="panel-title">Detalhe por ' + (escala === 'anual' ? 'Ano' : 'Mês') + '</span></div>'
    + '<div class="tbl-outer"><table class="pt pt-stat" style="font-size:12px">'
    + '<thead><tr><th class="th0">Período</th><th style="text-align:center">Registados</th><th style="text-align:center">Concluídos</th><th style="text-align:center">Saldo</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--tx3)">Sem dados.</td></tr>') + '</tbody>'
    + '</table></div></div>';
}

function attachEscala() {
  ['mensal','anual'].forEach(function (e) {
    var btn = G('btn-escala-' + e);
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (escalaVolume === e) return;
      escalaVolume = e;
      var qs = paramsFiltros();
      apiGet('api/estatisticas/volume.php?escala=' + e + (qs ? '&' + qs : ''))
        .then(function (v) {
          ULTIMOS_DADOS.volume = v;
          if (CHART_ACTIVO) { CHART_ACTIVO.destroy(); CHART_ACTIVO = null; }
          var el = G('relCorpo');
          if (el) { el.innerHTML = htmlTabPeriodo(v); attachEscala(); desenharGraficoPeriodo(v); }
        });
    });
  });
}

function desenharGraficoPeriodo(vol) {
  var dados  = (vol && vol.dados) || [];
  var canvas = G('chartPeriodo');
  if (!canvas || !window.Chart || !dados.length) return;

  var labels = dados.map(function (d) {
    return escalaVolume === 'anual' ? d.periodo
      : (function () { var p = d.periodo.split('-'); return MESES_PT[parseInt(p[1]) - 1] + '/' + p[0].slice(2); }());
  });

  CHART_ACTIVO = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label:'Registados', data: dados.map(function (d) { return +d.registados || 0; }), backgroundColor:'#2563EB', borderRadius:3 },
        { label:'Concluídos', data: dados.map(function (d) { return +d.concluidos || 0; }), backgroundColor:'#059669', borderRadius:3 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:true, position:'bottom', labels:{ font:{ size:10 } } },
        datalabels: { display:false }
      },
      scales: { y:{ beginAtZero:true, ticks:{ precision:0 } } }
    }
  });
}

/* ═══ Tab: Por Juiz Relator ═══ */
function htmlTabJuiz(prod) {
  var rel = (prod && prod.relatores) || [];
  var totalP = rel.reduce(function (a, r) { return a + (+r.total || 0); }, 0);
  var taxaM  = rel.length ? Math.round(rel.reduce(function (a, r) { return a + (+r.taxa || 0); }, 0) / rel.length * 10) / 10 : 0;
  var altG   = Math.min(Math.max(180, rel.length * 38), 420);

  var linhas = rel.map(function (r) {
    var cor = +r.taxa >= 70 ? 'var(--green)' : +r.taxa >= 40 ? 'var(--amber)' : 'var(--red)';
    return '<tr>'
      + '<td class="tdl" style="padding:8px 12px">' + esc(r.relator) + '</td>'
      + '<td style="text-align:center;padding:8px 12px;font-weight:600">' + r.total + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--amber)">' + r.pendentes + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--green)">' + r.findos + '</td>'
      + '<td class="td-prog" style="padding:8px 12px"><div style="display:flex;align-items:center;gap:6px">'
      + '<div style="flex:1;height:4px;background:var(--bg);border-radius:4px">'
      + '<div style="width:' + Math.min(+r.taxa, 100) + '%;height:100%;background:' + cor + ';border-radius:4px"></div></div>'
      + '<span style="font-size:11px;font-weight:600;color:' + cor + ';min-width:34px;text-align:right">' + r.taxa + '%</span>'
      + '</div></td></tr>';
  }).join('');

  return '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
    + statCard('ti-users',     'var(--blue)',  'Juízes Relatores',       rel.length,   null)
    + statCard('ti-files',     'var(--amber)', 'Total de Processos',     totalP,       null)
    + statCard('ti-chart-pie', 'var(--green)', 'Taxa Média de Conclusão', taxaM + '%', null)
    + '</div>'
    + '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-chart-bar" style="color:var(--blue)"></i> Processos por Juiz Relator</div>'
    + '<div style="position:relative;height:' + altG + 'px"><canvas id="chartJuiz"></canvas></div>'
    + '</div>'
    + '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-table" style="color:var(--blue)"></i><span class="panel-title">Detalhe por Juiz</span></div>'
    + '<div class="tbl-outer"><table class="pt pt-stat" style="font-size:12px">'
    + '<thead><tr><th class="th0">Juiz Relator</th><th style="text-align:center">Total</th><th style="text-align:center">Pendentes</th><th style="text-align:center">Findos</th><th>Taxa</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--tx3)">Sem dados.</td></tr>') + '</tbody>'
    + '</table></div></div>'
    + '</div>';
}

function desenharGraficoJuiz(prod) {
  var rel    = (prod && prod.relatores) || [];
  var canvas = G('chartJuiz');
  if (!canvas || !window.Chart || !rel.length) return;

  CHART_ACTIVO = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: rel.map(function (r) { return r.relator; }),
      datasets: [{ data: rel.map(function (r) { return +r.total || 0; }), backgroundColor: PALETA[0], borderRadius: 3 }]
    },
    options: {
      indexAxis: 'y', responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:false },
        datalabels: { display:true, color:'#374151', anchor:'end', align:'end', offset:2, font:{ size:11, weight:'600' }, formatter:function(v){ return v||''; }, clamp:true }
      },
      scales: { x:{ beginAtZero:true, ticks:{ precision:0 } } },
      layout: { padding:{ right:34 } }
    }
  });
}

/* ═══ Tab: Por Espécie ═══ */
function htmlTabEspecie(dist) {
  var dados = (dist && dist.porEspecie) || [];
  var total = dados.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var items = dados.map(function (e, i) { return { label: e.especie, total: +e.total || 0, cor: PALETA[i % PALETA.length] }; });

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-category" style="color:var(--purple)"></i> Distribuição por Espécie</div>'
    + '<div style="position:relative;height:260px"><canvas id="chartEspecie"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Espécie', items, total, 'var(--purple)')
    + '</div>';
}

/* ═══ Tab: Por Estado ═══ */
function htmlTabEstado(dist) {
  var dados = (dist && dist.porEstado) || [];
  var total = dados.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var items = dados.map(function (e) { return { label: e.label, total: +e.total || 0, cor: SGD_COR_ESTADO[e.codigo] || '#888', badge: 'b-' + e.codigo }; });

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-circle" style="color:var(--blue)"></i> Distribuição por Estado</div>'
    + '<div style="position:relative;height:260px"><canvas id="chartEstado"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Estado', items, total, 'var(--blue)')
    + '</div>';
}

/* ═══ Tab: Por Origem ═══ */
function htmlTabOrigem(dist) {
  var dados = (dist && dist.porOrigem) || [];
  var total = dados.reduce(function (a, o) { return a + (+o.total || 0); }, 0);
  var items = dados.map(function (o, i) { return { label: o.origem, total: +o.total || 0, cor: PALETA[i % PALETA.length] }; });
  var altG  = Math.min(Math.max(180, dados.length * 38), 420);

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-building" style="color:var(--amber)"></i> Distribuição por Origem</div>'
    + '<div style="position:relative;height:' + altG + 'px"><canvas id="chartOrigem"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Origem', items, total, 'var(--amber)')
    + '</div>';
}

/* ─── Tabela de distribuição partilhada ─── */
function tabelaDistribuicao(titulo, items, total, cor) {
  var linhas = items.map(function (item) {
    var pct = total ? Math.round(item.total / total * 100) : 0;
    var lbl = item.badge
      ? '<span class="badge ' + item.badge + '">' + esc(item.label) + '</span>'
      : '<span style="display:inline-block;width:10px;height:10px;background:' + item.cor + ';border-radius:2px;margin-right:6px;vertical-align:middle"></span>' + esc(item.label);
    return '<tr>'
      + '<td class="tdl" style="padding:8px 12px">' + lbl + '</td>'
      + '<td style="text-align:center;padding:8px 12px;font-weight:600">' + item.total + '</td>'
      + '<td class="td-prog" style="padding:8px 12px"><div style="display:flex;align-items:center;gap:6px">'
      + '<div style="flex:1;height:4px;background:var(--bg);border-radius:4px">'
      + '<div style="width:' + pct + '%;height:100%;background:' + item.cor + ';border-radius:4px"></div></div>'
      + '<span style="font-size:11px;color:var(--tx2);min-width:30px;text-align:right">' + pct + '%</span>'
      + '</div></td></tr>';
  }).join('');

  return '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-table" style="color:' + cor + '"></i><span class="panel-title">Detalhe por ' + titulo + '</span></div>'
    + '<div class="tbl-outer"><table class="pt pt-stat" style="font-size:12px">'
    + '<thead><tr><th class="th0">Descrição</th><th style="text-align:center">Total</th><th>Proporção</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="3" style="padding:14px;text-align:center;color:var(--tx3)">Sem dados.</td></tr>') + '</tbody>'
    + '</table></div></div>';
}

/* ─── Gráfico genérico (espécie, estado, origem) ─── */
function desenharGraficoSimples(canvasId, dados, tipo) {
  var canvas = G(canvasId);
  if (!canvas || !window.Chart || !dados.length) return;

  var labels, valores, cores;
  if (tipo === 'estado') {
    labels = dados.map(function (e) { return e.label; });
    valores = dados.map(function (e) { return +e.total || 0; });
    cores   = dados.map(function (e) { return SGD_COR_ESTADO[e.codigo] || '#888'; });
  } else if (tipo === 'especie') {
    labels = dados.map(function (e) { return e.especie; });
    valores = dados.map(function (e) { return +e.total || 0; });
    cores   = dados.map(function (_, i) { return PALETA[i % PALETA.length]; });
  } else { /* origem */
    labels = dados.map(function (o) { return o.origem; });
    valores = dados.map(function (o) { return +o.total || 0; });
    cores   = dados.map(function (_, i) { return PALETA[i % PALETA.length]; });
  }

  var totalG  = valores.reduce(function (a, b) { return a + b; }, 0);
  var isPie   = TIPO_GRAFICO === 'pie';
  var isLine  = TIPO_GRAFICO === 'line';
  var isHoriz = tipo === 'origem' && !isPie; /* origens são texto longo */
  var chartType = isPie ? 'pie' : 'bar';
  var maxV = Math.max.apply(null, valores) || 1;

  CHART_ACTIVO = new window.Chart(canvas, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: isPie ? cores : (isLine ? 'rgba(37,99,235,.12)' : cores),
        borderColor: isLine ? '#2563EB' : cores,
        borderWidth: isPie ? 1 : (isLine ? 2 : 1),
        fill: isLine,
        tension: 0.3,
        borderRadius: chartType === 'bar' ? 3 : 0
      }]
    },
    options: {
      indexAxis: (!isPie && isHoriz) ? 'y' : 'x',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: isPie, position:'bottom', labels:{ font:{ size:10 } } },
        datalabels: {
          display: isPie || TIPO_GRAFICO === 'bar',
          color: isPie ? '#fff' : '#374151',
          anchor: isPie ? 'center' : 'end',
          align:  isPie ? 'center' : 'end',
          offset: isPie ? 0 : 4,
          font: { size:11, weight:'600' },
          formatter: function (v) { return totalG ? Math.round(v / totalG * 100) + '%' : ''; },
          clamp: true
        }
      },
      layout: isPie ? {} : (isHoriz ? { padding:{ right:38 } } : { padding:{ top:18 } }),
      scales: isPie ? {} : {
        x: isHoriz ? { beginAtZero:true, ticks:{ precision:0 } } : { ticks:{ precision:0 }, suggestedMax: !isLine ? Math.ceil(maxV * 1.2) : undefined },
        y: isHoriz ? {} : { beginAtZero:true, ticks:{ precision:0 }, suggestedMax: (!isLine && !isHoriz) ? Math.ceil(maxV * 1.2) : undefined }
      }
    }
  });
}

/* ─── Helper: card de estatística ─── */
function statCard(icon, cor, label, valor, sub) {
  return '<div class="stat">'
    + '<div class="stat-lbl"><i class="ti ' + icon + '" style="color:' + cor + '"></i> ' + label + '</div>'
    + '<div class="stat-num" style="color:' + cor + '">' + valor + '</div>'
    + (sub ? '<div class="stat-sub">' + sub + '</div>' : '')
    + '</div>';
}

/* ─── Exportação ─── */
function exportarPDF() {
  if (!ULTIMOS_DADOS || !window.jspdf) return;
  var doc = new window.jspdf.jsPDF();
  doc.setFontSize(13);
  doc.text('SGD — Relatório ' + labelTabActiva(), 14, 13);
  var y = 20;
  dadosExportacao().forEach(function (t) {
    doc.autoTable({ head:[t.cabecalho], body:t.linhas, startY:y });
    y = doc.lastAutoTable.finalY + 8;
  });
  doc.save('SGD_Relatorio_' + relatorioActivo + '.pdf');
}

function exportarExcel() {
  if (!ULTIMOS_DADOS || !window.XLSX) return;
  var wb = window.XLSX.utils.book_new();
  dadosExportacao().forEach(function (t) {
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([t.cabecalho].concat(t.linhas)), t.folha);
  });
  window.XLSX.writeFile(wb, 'SGD_Relatorio_' + relatorioActivo + '.xlsx');
}

function dadosExportacao() {
  var d = ULTIMOS_DADOS;
  if (relatorioActivo === 'periodo') {
    var vd = (d.volume && d.volume.dados) || [];
    return [{ folha:'Por Período', cabecalho:['Período','Registados','Concluídos','Saldo'],
      linhas: vd.map(function (r) { return [r.periodo, +r.registados, +r.concluidos, (+r.registados) - (+r.concluidos)]; }) }];
  }
  if (relatorioActivo === 'juiz') {
    var rel = (d.produtividade && d.produtividade.relatores) || [];
    return [{ folha:'Por Juiz', cabecalho:['Juiz Relator','Total','Pendentes','Findos','Taxa %'],
      linhas: rel.map(function (r) { return [r.relator, +r.total, +r.pendentes, +r.findos, +r.taxa]; }) }];
  }
  if (relatorioActivo === 'especie') {
    var esp = (d.distribuicao && d.distribuicao.porEspecie) || [];
    return [{ folha:'Por Espécie', cabecalho:['Espécie','Total'],
      linhas: esp.map(function (e) { return [e.especie, +e.total]; }) }];
  }
  if (relatorioActivo === 'estado') {
    var est = (d.distribuicao && d.distribuicao.porEstado) || [];
    return [{ folha:'Por Estado', cabecalho:['Estado','Total'],
      linhas: est.map(function (e) { return [e.label, +e.total]; }) }];
  }
  if (relatorioActivo === 'origem') {
    var ori = (d.distribuicao && d.distribuicao.porOrigem) || [];
    return [{ folha:'Por Origem', cabecalho:['Origem','Total'],
      linhas: ori.map(function (o) { return [o.origem, +o.total]; }) }];
  }
  return [];
}

function labelTabActiva() {
  var m = { periodo:'Por Período', juiz:'Por Juiz Relator', especie:'Por Espécie', estado:'Por Estado', origem:'Por Origem' };
  return m[relatorioActivo] || '';
}
