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
var CHART_DETALHE_A = null;
var CHART_DETALHE_B = null;

if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}

/* ─── jsPDF e XLSX só servem os botões de exportação (raramente usados em cada
   visita) — carregadas a pedido em vez de sempre no arranque da página, para não
   pesar no desempenho (sobretudo em ligações/CPUs móveis mais lentas). ─── */
var LIBS_CARREGADAS = {};
function carregarScript(url, integrity) {
  if (LIBS_CARREGADAS[url]) return LIBS_CARREGADAS[url];
  LIBS_CARREGADAS[url] = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = url;
    s.integrity = integrity;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = function () { delete LIBS_CARREGADAS[url]; reject(new Error('Falha ao carregar biblioteca.')); };
    document.head.appendChild(s);
  });
  return LIBS_CARREGADAS[url];
}
function carregarLibPdf() {
  return window.jspdf ? Promise.resolve() : carregarScript(
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'
  );
}
function carregarLibXlsx() {
  return window.XLSX ? Promise.resolve() : carregarScript(
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw'
  );
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
    var el = G(id); if (el) el.addEventListener('change', function () { atualizarBotaoLimparFiltros(); carregarEstatisticas(); });
  });

  var limpar = G('btnLimparFiltrosEst');
  if (limpar) limpar.addEventListener('click', function () {
    G('fEstUtilizador').value = ''; G('fEstDataDe').value = ''; G('fEstDataAte').value = '';
    atualizarBotaoLimparFiltros();
    carregarEstatisticas();
  });
  atualizarBotaoLimparFiltros();

  var tipoG = G('fTipoGrafico');
  if (tipoG) tipoG.addEventListener('change', function () {
    TIPO_GRAFICO = tipoG.value;
    if (ULTIMOS_DADOS) renderTab(relatorioActivo, ULTIMOS_DADOS);
  });

  var btnPdf = G('btnExportPdf'),  btnXls = G('btnExportXlsx'),  btnPrn = G('btnImprimir');
  if (btnPdf) btnPdf.addEventListener('click', exportarPDF);
  if (btnXls) btnXls.addEventListener('click', exportarExcel);
  if (btnPrn) btnPrn.addEventListener('click', function () { window.print(); });

  var fecharED = G('estDetalheClose');
  if (fecharED) fecharED.addEventListener('click', function () { G('estDetalheBg').classList.remove('open'); });

  var btnPdfED = G('estDetalheExportPdf');
  if (btnPdfED) btnPdfED.addEventListener('click', exportarPdfDetalhe);
});

/* ─── Filtros e carregamento ─── */
function paramsFiltros() {
  var p = new URLSearchParams();
  var u = GV('fEstUtilizador');  if (u)  p.set('utilizador', u);
  var de = GV('fEstDataDe');     if (de) p.set('data_de', de);
  var at = GV('fEstDataAte');    if (at) p.set('data_ate', at);
  return p.toString();
}

/* Destaca "Limpar Filtros" (cor + texto) enquanto Utilizador/Data De/Data Até tiverem
   algum valor escolhido — sem isso o botão é só um ícone e passava despercebido. */
function atualizarBotaoLimparFiltros() {
  var btn = G('btnLimparFiltrosEst');
  if (!btn) return;
  var activo = !!(GV('fEstUtilizador') || GV('fEstDataDe') || GV('fEstDataAte'));
  btn.className = 'btn btn-sm' + (activo ? ' btn-danger' : '');
  btn.innerHTML = '<i class="ti ti-filter-off"></i>' + (activo ? ' Limpar Filtros' : '');
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
  attachLinhasDetalhe();
  fadeIn(el);
}

/* ═══ Tab: Por Período ═══ */
function htmlTabPeriodo(vol) {
  var dados  = (vol && vol.dados) || [];
  var escala = escalaVolume;
  // Totais reais do filtro activo (Utilizador/Data), sem limite de tempo — ao contrário
  // do gráfico/tabela abaixo, que só cobrem os últimos 13 meses (mensal) ou 5 anos
  // (anual) por desenho (ver EstatisticaModel::volume()). Evita que estes cartões
  // mostrem um número menor do que o real quando há processos concluídos há mais
  // tempo do que essa janela.
  var tf = totaisFiltrados();
  var totalReg = tf.total, totalConc = tf.findos, saldo = tf.pendentes;

  var linhas = dados.slice().reverse().map(function (d) {
    var lbl = escala === 'anual' ? d.periodo
      : (function () { var p = d.periodo.split('-'); return MESES_PT[parseInt(p[1]) - 1] + '/' + p[0]; }());
    var s = (+d.registados || 0) - (+d.concluidos || 0);
    return '<tr data-eixo="periodo" data-valor="' + esc(d.periodo) + '" data-titulo="Período — ' + esc(lbl) + '" title="Ver detalhe deste período">'
      + '<td class="tdl" style="padding:8px 12px">' + esc(lbl) + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--blue);font-weight:600">' + d.registados + '</td>'
      + '<td style="text-align:center;padding:8px 12px;color:var(--green);font-weight:600">' + d.concluidos + '</td>'
      + '<td style="text-align:center;padding:8px 12px;font-weight:600;color:' + (s > 0 ? 'var(--amber)' : 'var(--green)') + '">' + (s > 0 ? '+' : '') + s + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
    + statCard('ti-inbox',        'var(--blue)',  'Registados',  totalReg,  'Segundo o filtro activo')
    + statCard('ti-circle-check', 'var(--green)', 'Concluídos',  totalConc, 'Segundo o filtro activo')
    + statCard('ti-trending-up',  saldo > 0 ? 'var(--amber)' : 'var(--green)', 'Saldo', (saldo > 0 ? '+' : '') + saldo, 'Registados menos concluídos')
    + '</div>'
    + '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    + '<div style="font-size:13px;font-weight:600"><i class="ti ti-chart-bar" style="color:var(--blue)"></i> Registados vs Concluídos '
    + '<span style="font-weight:400;font-size:11px;color:var(--tx3)">(últimos ' + (escala === 'anual' ? '5 anos' : '13 meses') + ')</span></div>'
    + '<div style="display:flex;gap:4px">'
    + '<button id="btn-escala-mensal" class="btn btn-xs' + (escala === 'mensal' ? ' btn-primary' : '') + '">Mensal</button>'
    + '<button id="btn-escala-anual"  class="btn btn-xs' + (escala === 'anual'  ? ' btn-primary' : '') + '">Anual</button>'
    + '</div></div>'
    + '<div style="position:relative;height:400px"><canvas id="chartPeriodo"></canvas></div>'
    + '</div>'
    + '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-table" style="color:var(--blue)"></i>'
    + '<span class="panel-title">Detalhe por ' + (escala === 'anual' ? 'Ano' : 'Mês') + '</span></div>'
    + '<div class="tbl-outer"><table class="pt pt-stat" style="font-size:12px">'
    + '<thead><tr><th class="th0">Período</th><th style="text-align:center">Registados</th><th style="text-align:center">Concluídos</th><th style="text-align:center">Saldo</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--tx3)">Sem dados.</td></tr>') + '</tbody>'
    + '</table></div></div>'
    + '</div>';
}

/* ─── Liga o clique nas linhas de qualquer tabela de detalhe ao drill-down —
   as linhas vêm marcadas com data-eixo/data-valor/data-titulo (ver tabelaDistribuicao(),
   htmlTabJuiz() e htmlTabPeriodo()). ─── */
function attachLinhasDetalhe() {
  document.querySelectorAll('#relCorpo tr[data-eixo]').forEach(function (tr) {
    tr.addEventListener('click', function () {
      abrirDetalheEixo(this.getAttribute('data-eixo'), this.getAttribute('data-valor'), this.getAttribute('data-titulo'));
    });
  });
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
          if (el) { el.innerHTML = htmlTabPeriodo(v); attachEscala(); desenharGraficoPeriodo(v); attachLinhasDetalhe(); }
        });
    });
  });
}

function desenharGraficoPeriodo(vol) {
  var dados  = (vol && vol.dados) || [];
  var canvas = G('chartPeriodo');
  if (!canvas || !window.Chart || !dados.length) return;

  var isPie  = TIPO_GRAFICO === 'pie';
  var isLine = TIPO_GRAFICO === 'line';

  if (isPie) {
    var totalReg  = dados.reduce(function (a, d) { return a + (+d.registados || 0); }, 0);
    var totalConc = dados.reduce(function (a, d) { return a + (+d.concluidos || 0); }, 0);
    var totalPie  = totalReg + totalConc;
    CHART_ACTIVO = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Registados', 'Concluídos'],
        datasets: [{ data:[totalReg, totalConc], backgroundColor:['#2563EB','#059669'], borderWidth:1 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend: { display:true, position:'right', align:'center', labels:{ font:{ size:12 }, boxWidth:14, padding:10 } },
          datalabels: { display:true, color:'#fff', anchor:'center', align:'center', font:{ size:11, weight:'600' },
            formatter: function (v) { return totalPie ? Math.round(v / totalPie * 100) + '%' : ''; } }
        }
      }
    });
    return;
  }

  var labels = dados.map(function (d) {
    return escalaVolume === 'anual' ? d.periodo
      : (function () { var p = d.periodo.split('-'); return MESES_PT[parseInt(p[1]) - 1] + '/' + p[0].slice(2); }());
  });

  CHART_ACTIVO = new window.Chart(canvas, {
    type: isLine ? 'line' : 'bar',
    data: {
      labels: labels,
      datasets: [
        { label:'Registados', data: dados.map(function (d) { return +d.registados || 0; }),
          backgroundColor: isLine ? 'rgba(37,99,235,.12)' : '#2563EB', borderColor:'#2563EB', fill:isLine, tension:.3, borderRadius:3 },
        { label:'Concluídos', data: dados.map(function (d) { return +d.concluidos || 0; }),
          backgroundColor: isLine ? 'rgba(5,150,105,.12)' : '#059669', borderColor:'#059669', fill:isLine, tension:.3, borderRadius:3 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:true, position:'bottom', labels:{ font:{ size:10 } } },
        datalabels: { display:false }
      },
      scales: { y:{ beginAtZero:true, ticks:{ precision:0 } } },
      onHover: function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      onClick: function (evt, elements) {
        if (!elements.length) return;
        var d = dados[elements[0].index];
        abrirDetalheEixo('periodo', d.periodo, 'Período — ' + labels[elements[0].index]);
      }
    }
  });
}

/* ═══ Tab: Por Juiz Relator ═══ */
function htmlTabJuiz(prod) {
  var rel = (prod && prod.relatores) || [];
  var totalP = rel.reduce(function (a, r) { return a + (+r.total || 0); }, 0);
  var taxaM  = rel.length ? Math.round(rel.reduce(function (a, r) { return a + (+r.taxa || 0); }, 0) / rel.length * 10) / 10 : 0;
  var altG   = 400;

  var linhas = rel.map(function (r) {
    var cor = +r.taxa >= 70 ? 'var(--green)' : +r.taxa >= 40 ? 'var(--amber)' : 'var(--red)';
    return '<tr data-eixo="relator" data-valor="' + esc(r.relator) + '" data-titulo="Juiz Relator — ' + esc(r.relator) + '" title="Ver detalhe deste juiz">'
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

  var labels = rel.map(function (r) { return r.relator; });
  var aoClicar = { onHover: function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
    onClick: function (evt, elements) {
      if (!elements.length) return;
      var relator = rel[elements[0].index].relator;
      abrirDetalheEixo('relator', relator, 'Juiz Relator — ' + relator);
    } };

  /* Barras: coluna agrupada Pendentes/Findos por juiz (tal como Registados/Concluídos
     em "Por Período") — mais informativo do que uma única barra de Total. */
  if (TIPO_GRAFICO === 'bar') {
    CHART_ACTIVO = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label:'Pendentes', data: rel.map(function (r) { return +r.pendentes || 0; }), backgroundColor:'#D97706', borderRadius:3 },
          { label:'Findos',    data: rel.map(function (r) { return +r.findos    || 0; }), backgroundColor:'#059669', borderRadius:3 }
        ]
      },
      options: Object.assign({
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend: { display:true, position:'bottom', labels:{ font:{ size:10 } } },
          datalabels: { display:false }
        },
        scales: { y:{ beginAtZero:true, ticks:{ precision:0 } } }
      }, aoClicar)
    });
    return;
  }

  var isPie   = TIPO_GRAFICO === 'pie';
  var isLine  = !isPie;
  var valores = rel.map(function (r) { return +r.total || 0; });
  var cores   = rel.map(function (_, i) { return PALETA[i % PALETA.length]; });
  var totalG  = valores.reduce(function (a, b) { return a + b; }, 0);

  CHART_ACTIVO = new window.Chart(canvas, {
    type: isPie ? 'pie' : 'line',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: isPie ? cores : 'rgba(37,99,235,.12)',
        borderColor: isPie ? cores : '#2563EB',
        borderWidth: isPie ? 1 : 2,
        fill: isLine, tension:.3
      }]
    },
    options: Object.assign({
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:isPie, position:'right', align:'center', labels:{ font:{ size:12 }, boxWidth:14, padding:10 } },
        datalabels: {
          display:true, color: isPie ? '#fff' : '#374151',
          anchor: isPie ? 'center' : 'end', align: isPie ? 'center' : 'end', offset: isPie ? 0 : 4,
          font:{ size:11, weight:'600' },
          formatter: function (v) { return isPie ? (totalG ? Math.round(v / totalG * 100) + '%' : '') : (v || ''); },
          clamp:true
        }
      },
      scales: isPie ? {} : { x:{ ticks:{ precision:0 } }, y:{ beginAtZero:true, ticks:{ precision:0 } } }
    }, aoClicar)
  });
}

/* ─── Drill-down genérico: clicou-se num valor (barra/fatia/ponto do gráfico, ou linha
   da tabela) em qualquer um dos 5 tabs — abre o modal com estatísticas rápidas (já
   disponíveis no cliente) e, do servidor, até 2 gráficos de Pizza com as dimensões
   relacionadas (ver EstatisticaModel::detalheEixo() para a escolha de dimensões por eixo). */
var DIM_INFO = {
  porEstado:  { titulo: 'Por Estado',       rotulo: function (e) { return e.label;   }, cor: function (e, i) { return SGD_COR_ESTADO[e.codigo] || '#888'; } },
  porEspecie: { titulo: 'Por Espécie',      rotulo: function (e) { return e.especie; }, cor: function (e, i) { return PALETA[i % PALETA.length]; } },
  porRelator: { titulo: 'Por Juiz Relator', rotulo: function (e) { return e.relator; }, cor: function (e, i) { return PALETA[i % PALETA.length]; } }
};

var DETALHE_ACTUAL = null;

function abrirDetalheEixo(eixo, valor, titulo) {
  DETALHE_ACTUAL = { eixo: eixo, valor: valor, titulo: titulo };
  G('estDetalheTitulo').textContent = titulo;
  G('estDetalheStats').innerHTML = statsHtmlEixo(eixo, valor);
  G('estDetalheBg').classList.add('open');

  var qs    = paramsFiltros();
  var extra = eixo === 'periodo' ? '&escala=' + escalaVolume : '';
  apiGet('api/estatisticas/detalhe.php?eixo=' + eixo + '&valor=' + encodeURIComponent(valor) + extra + (qs ? '&' + qs : ''))
    .then(function (d) {
      if (CHART_DETALHE_A) { CHART_DETALHE_A.destroy(); CHART_DETALHE_A = null; }
      if (CHART_DETALHE_B) { CHART_DETALHE_B.destroy(); CHART_DETALHE_B = null; }
      var chaves = ['porEstado', 'porEspecie', 'porRelator'].filter(function (k) { return d[k]; });
      CHART_DETALHE_A = preencherSlotDetalhe('A', chaves[0], d[chaves[0]]);
      CHART_DETALHE_B = preencherSlotDetalhe('B', chaves[1], d[chaves[1]]);
    })
    .catch(function (e) { showToast('Erro ao carregar detalhe: ' + e.message, 'ti-alert-triangle', 'red'); });
}

/** Estatísticas do cabeçalho do modal — sempre a partir de dados já carregados no
 *  cliente (sem pedido extra), tal como as tabelas de cada tab já mostram. */
function statsHtmlEixo(eixo, valor) {
  var d = ULTIMOS_DADOS;
  if (!d) return '';

  if (eixo === 'relator') {
    var linha = ((d.produtividade || {}).relatores || []).find(function (r) { return r.relator === valor; });
    if (!linha) return '';
    var cor = +linha.taxa >= 70 ? 'var(--green)' : +linha.taxa >= 40 ? 'var(--amber)' : 'var(--red)';
    return '<div class="stat-grid">'
      + statCard('ti-files',        'var(--blue)',  'Total',     linha.total,      null)
      + statCard('ti-hourglass',    'var(--amber)', 'Pendentes', linha.pendentes,  null)
      + statCard('ti-circle-check', 'var(--green)', 'Findos',    linha.findos,     null)
      + statCard('ti-chart-pie',    cor,            'Taxa',      linha.taxa + '%', null)
      + '</div>';
  }

  if (eixo === 'periodo') {
    var linhaP = ((d.volume || {}).dados || []).find(function (p) { return p.periodo === valor; });
    if (!linhaP) return '';
    var saldo = (+linhaP.registados || 0) - (+linhaP.concluidos || 0);
    return '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">'
      + statCard('ti-inbox',        'var(--blue)',  'Registados', linhaP.registados, null)
      + statCard('ti-circle-check', 'var(--green)', 'Concluídos', linhaP.concluidos, null)
      + statCard('ti-trending-up',  saldo > 0 ? 'var(--amber)' : 'var(--green)', 'Saldo', (saldo > 0 ? '+' : '') + saldo, null)
      + '</div>';
  }

  var mapaLista = { especie: 'porEspecie', estado: 'porEstado', origem: 'porOrigem' };
  var lista = ((d.distribuicao || {})[mapaLista[eixo]]) || [];
  var item = lista.find(function (e) {
    return eixo === 'estado' ? e.codigo === valor : eixo === 'especie' ? e.especie === valor : e.origem === valor;
  });
  if (!item) return '';
  var totalGeral = lista.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var pct = totalGeral ? Math.round(item.total / totalGeral * 100) : 0;
  return '<div class="stat-grid" style="grid-template-columns:repeat(2,1fr)">'
    + statCard('ti-files',       'var(--blue)',   'Total',              item.total, null)
    + statCard('ti-chart-pie',   'var(--purple)', 'Proporção do total', pct + '%',  null)
    + '</div>';
}

function preencherSlotDetalhe(slot, chave, dados) {
  var info = DIM_INFO[chave];
  var elLabel = G('estDetalheLabel' + slot);
  if (elLabel) elLabel.textContent = info ? info.titulo : '';
  if (!info) { return desenharPizzaDetalhe('chartDetalhe' + slot, [], [], []); }

  var itens   = (dados || []).filter(function (e) { return +e.total > 0; });
  var labels  = itens.map(info.rotulo);
  var valores = itens.map(function (e) { return +e.total || 0; });
  var cores   = itens.map(function (e, i) { return info.cor(e, i); });
  return desenharPizzaDetalhe('chartDetalhe' + slot, labels, valores, cores);
}

function desenharPizzaDetalhe(canvasId, labels, valores, cores) {
  var canvas = G(canvasId);
  if (!canvas || !window.Chart) return null;
  if (!valores.length) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return null;
  }
  var total = valores.reduce(function (a, b) { return a + b; }, 0);
  return new window.Chart(canvas, {
    type: 'pie',
    data: { labels: labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'right', align: 'center', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
        datalabels: {
          display: true, color: '#fff', anchor: 'center', align: 'center', font: { size: 11, weight: '600' },
          formatter: function (v) { return total ? Math.round(v / total * 100) + '%' : ''; }
        }
      }
    }
  });
}

/* ═══ Tab: Por Espécie ═══ */
function htmlTabEspecie(dist) {
  var dados = (dist && dist.porEspecie) || [];
  var total = dados.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var items = dados.map(function (e, i) { return { label: e.especie, total: +e.total || 0, cor: PALETA[i % PALETA.length], valor: e.especie }; });

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-category" style="color:var(--purple)"></i> Distribuição por Espécie</div>'
    + '<div style="position:relative;height:400px"><canvas id="chartEspecie"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Espécie', items, total, 'var(--purple)', 'especie')
    + '</div>';
}

/* ═══ Tab: Por Estado ═══ */
function htmlTabEstado(dist) {
  var dados = (dist && dist.porEstado) || [];
  var total = dados.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var items = dados.map(function (e) { return { label: e.label, total: +e.total || 0, cor: SGD_COR_ESTADO[e.codigo] || '#888', badge: 'b-' + e.codigo, valor: e.codigo }; });

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-circle" style="color:var(--blue)"></i> Distribuição por Estado</div>'
    + '<div style="position:relative;height:400px"><canvas id="chartEstado"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Estado', items, total, 'var(--blue)', 'estado')
    + '</div>';
}

/* ═══ Tab: Por Origem ═══ */
function htmlTabOrigem(dist) {
  var dados = (dist && dist.porOrigem) || [];
  var total = dados.reduce(function (a, o) { return a + (+o.total || 0); }, 0);
  var items = dados.map(function (o, i) { return { label: o.origem, total: +o.total || 0, cor: PALETA[i % PALETA.length], valor: o.origem }; });
  var altG  = 400;

  return '<div class="row2" style="margin-bottom:12px">'
    + '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-building" style="color:var(--amber)"></i> Distribuição por Origem</div>'
    + '<div style="position:relative;height:' + altG + 'px"><canvas id="chartOrigem"></canvas></div>'
    + '</div>'
    + tabelaDistribuicao('Origem', items, total, 'var(--amber)', 'origem')
    + '</div>';
}

/* ─── Tabela de distribuição partilhada ─── */
function tabelaDistribuicao(titulo, items, total, cor, eixo) {
  var linhas = items.map(function (item) {
    var pct = total ? Math.round(item.total / total * 100) : 0;
    var lbl = item.badge
      ? '<span class="badge ' + item.badge + '">' + esc(item.label) + '</span>'
      : '<span style="display:inline-block;width:10px;height:10px;background:' + item.cor + ';border-radius:2px;margin-right:6px;vertical-align:middle"></span>' + esc(item.label);
    return '<tr data-eixo="' + eixo + '" data-valor="' + esc(item.valor) + '" data-titulo="' + esc(titulo + ' — ' + item.label) + '" title="Ver detalhe">'
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

var TITULO_EIXO = { especie:'Espécie', estado:'Estado', origem:'Origem' };

/** Devolve o valor usado para filtrar no backend (EstatisticaModel::detalheEixo()) —
 *  para Estado é o codigo (entry/analysis/...), não o rótulo apresentado. */
function valorEixoItem(tipo, item) {
  return tipo === 'estado' ? item.codigo : tipo === 'especie' ? item.especie : item.origem;
}

/* ─── Gráfico genérico (espécie, estado, origem) ─── */
function desenharGraficoSimples(canvasId, dados, tipo) {
  var canvas = G(canvasId);
  if (!canvas || !window.Chart || !dados.length) return;

  var aoClicar = { onHover: function (evt, elements) { evt.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
    onClick: function (evt, elements) {
      if (!elements.length) return;
      var item = dados[elements[0].index];
      abrirDetalheEixo(tipo, valorEixoItem(tipo, item), TITULO_EIXO[tipo] + ' — ' + valorEixoItem(tipo, item));
    } };

  /* Origem, Barras: coluna agrupada Pendentes/Findos (tal como Juiz Relator) — mais
     informativo do que uma única barra horizontal de Total. */
  if (tipo === 'origem' && TIPO_GRAFICO === 'bar') {
    CHART_ACTIVO = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: dados.map(function (o) { return o.origem; }),
        datasets: [
          { label:'Pendentes', data: dados.map(function (o) { return +o.pendentes || 0; }), backgroundColor:'#D97706', borderRadius:3 },
          { label:'Findos',    data: dados.map(function (o) { return +o.findos    || 0; }), backgroundColor:'#059669', borderRadius:3 }
        ]
      },
      options: Object.assign({
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend: { display:true, position:'bottom', labels:{ font:{ size:10 } } },
          datalabels: { display:false }
        },
        scales: { y:{ beginAtZero:true, ticks:{ precision:0 } } }
      }, aoClicar)
    });
    return;
  }

  var labels, valores, cores;
  if (tipo === 'estado') {
    labels = dados.map(function (e) { return e.label; });
    valores = dados.map(function (e) { return +e.total || 0; });
    cores   = dados.map(function (e) { return SGD_COR_ESTADO[e.codigo] || '#888'; });
  } else if (tipo === 'especie') {
    labels = dados.map(function (e) { return e.especie; });
    valores = dados.map(function (e) { return +e.total || 0; });
    cores   = dados.map(function (_, i) { return PALETA[i % PALETA.length]; });
  } else { /* origem: pizza/linha */
    labels = dados.map(function (o) { return o.origem; });
    valores = dados.map(function (o) { return +o.total || 0; });
    cores   = dados.map(function (_, i) { return PALETA[i % PALETA.length]; });
  }

  var totalG  = valores.reduce(function (a, b) { return a + b; }, 0);
  var isPie   = TIPO_GRAFICO === 'pie';
  var isLine  = TIPO_GRAFICO === 'line';
  var chartType = isPie ? 'pie' : (isLine ? 'line' : 'bar');
  var isHoriz = tipo === 'origem' && chartType === 'bar'; /* origens são texto longo, só em barras */
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
    options: Object.assign({
      indexAxis: (!isPie && isHoriz) ? 'y' : 'x',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: isPie, position:'right', align:'center', labels:{ font:{ size:12 }, boxWidth:14, padding:10 } },
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
    }, aoClicar)
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

/* ─── Número por extenso (PT) — só para o parágrafo institucional do PDF de detalhe;
   cobre 0–999999, mais do que suficiente para contagens de processos. ─── */
function numeroPorExtenso(n) {
  n = Math.round(+n) || 0;
  if (n === 0) return 'zero';

  var UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  var DEZ_A_DEZANOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  var DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  var CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function ate999(v) {
    if (v === 0) return '';
    if (v === 100) return 'cem';
    var c = Math.floor(v / 100), r = v % 100, partes = [];
    if (c) partes.push(CENTENAS[c]);
    if (r) {
      if (r < 10) partes.push(UNIDADES[r]);
      else if (r < 20) partes.push(DEZ_A_DEZANOVE[r - 10]);
      else {
        var d = Math.floor(r / 10), u = r % 10;
        partes.push(DEZENAS[d] + (u ? ' e ' + UNIDADES[u] : ''));
      }
    }
    return partes.join(' e ');
  }

  if (n < 1000) return ate999(n);

  var milhar = Math.floor(n / 1000), resto = n % 1000;
  var textoMilhar = (milhar === 1 ? 'mil' : ate999(milhar) + ' mil');
  return resto ? textoMilhar + ' e ' + ate999(resto) : textoMilhar;
}

/* ─── Carrega uma imagem same-origin e devolve {dataUrl, w, h} — usado para meter o
   logótipo da instituição no PDF (jsPDF precisa de dataURL, não de um <img>/URL). ─── */
function carregarImagemDataURL(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve({ dataUrl: c.toDataURL('image/jpeg'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Totais (total/pendentes/findos) a partir dos dados JÁ carregados no cliente
 *  (`ULTIMOS_DADOS.distribuicao.porEstado`) — estes já respeitam os filtros de
 *  Utilizador/Data activos na página, ao contrário de `resumo.php` (que devolve
 *  sempre o total institucional global, por desenho — ver EstatisticaModel::resumo()). */
function totaisFiltrados() {
  var porEstado = ((ULTIMOS_DADOS && ULTIMOS_DADOS.distribuicao) || {}).porEstado || [];
  var total  = porEstado.reduce(function (a, e) { return a + (+e.total || 0); }, 0);
  var findos = porEstado.reduce(function (a, e) {
    return a + ((e.codigo === 'concluded' || e.codigo === 'archived') ? (+e.total || 0) : 0);
  }, 0);
  return { total: total, findos: findos, pendentes: total - findos };
}

/* ─── Cabeçalho institucional partilhado por TODOS os PDFs de Estatísticas (o do tab
   activo e o do modal de detalhe): logótipo centrado, traço a negrito, título/parágrafo
   com os totais do filtro/selecção activa. Devolve o "y" onde o conteúdo específico de
   cada PDF deve começar a desenhar-se. ─── */
function desenharCabecalhoInstitucionalPdf(doc, logo) {
  var pageW = doc.internal.pageSize.getWidth();
  var margem = 14;
  var y = 14;

  // Tamanho fixo, maior que antes e mais alto do que largo — a imagem de origem
  // (assets/img/logostj.jpg) é mais larga do que alta (510×280), por isso NÃO se usa a
  // proporção original aqui (ficaria sempre mais larga), o tamanho é intencionalmente fixo.
  var logoW = 30, logoH = 42;
  doc.addImage(logo.dataUrl, 'JPEG', (pageW - logoW) / 2, y, logoW, logoH);
  y += logoH + 6;

  // Traço a negrito (sólido, mais espesso) logo a seguir ao logótipo — separa o logótipo
  // do bloco de título/parágrafo institucional.
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(margem, y, pageW - margem, y);
  doc.setLineWidth(0.2);
  y += 8;

  var t = totaisFiltrados();
  var pctFindos = t.total ? Math.round(t.findos / t.total * 100) : 0;
  var pctPendentes = t.total ? Math.round(t.pendentes / t.total * 100) : 0;

  // "Supremo Tribunal de Justiça (STJ)" e os 3 números por extenso entre parênteses
  // ficam a negrito, a meio da frase — ver escreverParagrafoComNegrito().
  var paragrafoPartes = [
    { texto: 'Durante o ano judicial de 2025/2026, deu-se entrada na secretaria do ' },
    { texto: 'Supremo Tribunal de Justiça (STJ)', negrito: true },
    { texto: ' em um total de ' + t.total + ' (' },
    { texto: numeroPorExtenso(t.total), negrito: true },
    { texto: ') processos. ' + t.findos + ' (' },
    { texto: numeroPorExtenso(t.findos), negrito: true },
    { texto: ') foram concluídos, o que equivale a ' + pctFindos + '% dos processos entrados/registados, e ' + t.pendentes + ' (' },
    { texto: numeroPorExtenso(t.pendentes), negrito: true },
    { texto: ') ainda estão em tramitação, o equivalente a ' + pctPendentes + '% dos processos entrados.' },
  ];

  doc.setFont('times', 'bold'); doc.setFontSize(14);
  doc.text('RELATÓRIO GESTÃO DE PROCESSOS', pageW / 2, y, { align: 'center' }); y += 7;

  // 2ª linha: "ENTIDADE" e "ANO JUDICIAL:" a negrito, "2025/2026" e o resto normal —
  // desenhada segmento a segmento (jsPDF não mistura pesos num só doc.text()) para poder
  // manter a linha inteira centrada apesar dos pesos diferentes.
  doc.setFontSize(14);
  var segs = [
    { texto: 'ENTIDADE', negrito: true },
    { texto: ' - SUPREMO TRIBUNAL DE JUSTIÇA - ', negrito: false },
    { texto: 'ANO JUDICIAL: ', negrito: true },
    { texto: '2025/2026', negrito: false },
  ];
  var largTotal = segs.reduce(function (soma, s) {
    doc.setFont('times', s.negrito ? 'bold' : 'normal');
    return soma + doc.getTextWidth(s.texto);
  }, 0);
  var xSeg = (pageW - largTotal) / 2;
  segs.forEach(function (s) {
    doc.setFont('times', s.negrito ? 'bold' : 'normal');
    doc.text(s.texto, xSeg, y);
    xSeg += doc.getTextWidth(s.texto);
  });
  y += 12;

  doc.setFont('times', 'normal'); doc.setFontSize(12);
  y = escreverParagrafoComNegrito(doc, paragrafoPartes, margem, y, pageW - margem * 2, ALTURA_LINHA_CORPO, 20) + 6;

  return y;
}

/** Carrega o logótipo (comum a qualquer PDF de Estatísticas) e chama callback(logo) —
 *  usada tanto pelo PDF do tab activo como pelo do modal. */
function comCabecalhoInstitucionalPdf(callback) {
  Promise.all([carregarLibPdf(), carregarImagemDataURL('assets/img/logostj.jpg')])
    .then(function (res) { callback(res[1]); })
    .catch(function (e) { showToast('Erro ao gerar PDF: ' + (e.message || e), 'ti-alert-triangle', 'red'); });
}

/* ─── PDF do modal de detalhe (drill-down) — cabeçalho institucional seguido dos dados
   do valor clicado (estatísticas + os 2 gráficos de Pizza tal como estão desenhados
   no modal). ─── */
function exportarPdfDetalhe() {
  if (!DETALHE_ACTUAL) return;
  comCabecalhoInstitucionalPdf(gerarPdfDetalhe);
}

function gerarPdfDetalhe(logo) {
  var doc = new window.jspdf.jsPDF();
  var pageW = doc.internal.pageSize.getWidth();
  var margem = 14;
  var y = desenharCabecalhoInstitucionalPdf(doc, logo);

  doc.setFont('times', 'bold'); doc.setFontSize(12);
  doc.text(DETALHE_ACTUAL.titulo, margem, y); y += 8;

  doc.setFont('times', 'normal'); doc.setFontSize(12);
  var statsTxt = G('estDetalheStats').querySelectorAll('.stat').length
    ? Array.prototype.map.call(G('estDetalheStats').querySelectorAll('.stat'), function (el) {
        return el.querySelector('.stat-lbl').textContent.trim() + ': ' + el.querySelector('.stat-num').textContent.trim();
      }).join('   |   ')
    : '';
  if (statsTxt) { y = escreverParagrafoJustificado(doc, statsTxt, margem, y, pageW - margem * 2, ALTURA_LINHA_CORPO, 20) + 2; }

  var chartW = (pageW - margem * 2 - 6) / 2;
  [{ chart: CHART_DETALHE_A, label: 'estDetalheLabelA' }, { chart: CHART_DETALHE_B, label: 'estDetalheLabelB' }]
    .forEach(function (slot, i) {
      if (!slot.chart) return;
      var x = margem + i * (chartW + 6);
      doc.setFontSize(10);
      doc.text(G(slot.label).textContent, x, y);
      doc.addImage(slot.chart.canvas.toDataURL('image/png'), 'PNG', x, y + 3, chartW, chartW * 0.72);
    });

  doc.save('SGD_Detalhe_' + DETALHE_ACTUAL.eixo + '.pdf');
}

/* ─── Exportação — PDF do tab activo (Período/Juiz/Espécie/Estado/Origem, conforme a
   selecção actual), com o mesmo cabeçalho institucional do modal de detalhe. ─── */
function exportarPDF() {
  if (!ULTIMOS_DADOS) return;
  comCabecalhoInstitucionalPdf(gerarPdfRelatorio);
}

/** Linha "Resumo geral" do PDF principal — totais e taxa de conclusão do filtro/selecção
 *  activa, mais uma frase de disparidade entre relatores calculada a partir das taxas
 *  reais actualmente carregadas (só entra se a diferença entre a maior e a menor for
 *  grande; caso contrário fica de fora em vez de forçar uma observação sem sentido). */
function resumoGeralLinhas() {
  var t = totaisFiltrados();
  var pctPend = t.total ? Math.round(t.pendentes / t.total * 100) : 0;
  var pctFind = t.total ? Math.round(t.findos / t.total * 100) : 0;

  var relatores = ((ULTIMOS_DADOS.produtividade || {}).relatores || []).filter(function (r) { return +r.total > 0; });
  var disparidade = '';
  if (relatores.length > 1) {
    var taxas = relatores.map(function (r) { return +r.taxa; });
    var min = Math.min.apply(null, taxas), max = Math.max.apply(null, taxas);
    if (max - min >= 30) {
      disparidade = ', mas há uma disparidade grande entre relatores — as taxas de conclusão variam entre '
        + min + '% e ' + max + '%, consoante o relator';
    }
  }

  return [
    'Total de processos: ' + t.total + ', dos quais ' + t.pendentes + ' pendentes (' + pctPend + '%) e ' + t.findos + ' findos (' + pctFind + '%).',
    'A taxa média de conclusão (findos/total) é de ' + pctFind + '%' + disparidade + '.'
  ];
}

// Corpo do relatório (Times New Roman, 12pt) segue a proporção clássica de espaçamento
// entre linhas 1,5: 12pt * 1.5 / scaleFactor(pt→mm, ≈2.8346) ≈ 6.35mm, arredondado.
var ALTURA_LINHA_CORPO = 6.5;

/** Escreve um parágrafo justificado (Times, 12pt) — jsPDF trata o "word-wrap" e a
 *  justificação internamente ao receber a string completa + {maxWidth, align:'justify'}
 *  (a última linha do parágrafo nunca é esticada, só as anteriores; um parágrafo com uma
 *  única linha fica sempre alinhado à esquerda, nunca esticado a preencher a largura
 *  toda). splitTextToSize() só serve para saber quantas linhas vão sair, já que text()
 *  não devolve essa contagem, e assim decidir se cabe na página antes de desenhar
 *  (quebra de página só acontece ANTES do parágrafo, não a meio dele). */
function escreverParagrafoJustificado(doc, texto, x, y, largura, alturaLinha, margemInferior) {
  var alturaPagina = doc.internal.pageSize.getHeight();
  var nLinhas = doc.splitTextToSize(texto, largura).length;
  if (y + nLinhas * alturaLinha > alturaPagina - margemInferior) { doc.addPage(); y = 14; }
  doc.text(texto, x, y, { maxWidth: largura, align: 'justify' });
  return y + nLinhas * alturaLinha;
}

/** Escreve um parágrafo com trechos negrito/normal misturados (ex.: destacar "Supremo
 *  Tribunal de Justiça (STJ)" ou um número por extenso a meio da frase), com
 *  justificação real linha a linha — jsPDF não mistura pesos dentro do mesmo doc.text(),
 *  por isso este helper faz o "word-wrap" e a justificação à mão: mede cada palavra com
 *  a fonte certa (negrito/normal), empacota em linhas até `largura`, e distribui o
 *  espaço sobrante entre as palavras de cada linha (excepto a última, que fica alinhada
 *  à esquerda, tal como escreverParagrafoJustificado() faz via jsPDF para texto de um só
 *  peso). `partes` = [{ texto:'antes ' }, { texto:'destaque', negrito:true }, ...],
 *  concatenadas por ordem. Devolve o novo "y". */
function escreverParagrafoComNegrito(doc, partes, x, y, largura, alturaLinha, margemInferior) {
  doc.setFont('times', 'normal'); doc.setFontSize(12);
  var espacoLargura = doc.getTextWidth(' ');

  var palavras = [];
  partes.forEach(function (parte) {
    parte.texto.split(/\s+/).filter(function (w) { return w.length; }).forEach(function (w) {
      palavras.push({ texto: w, negrito: !!parte.negrito });
    });
  });

  function largP(p) {
    doc.setFont('times', p.negrito ? 'bold' : 'normal');
    return doc.getTextWidth(p.texto);
  }

  var linhas = [], linhaActual = [], largAcumulada = 0;
  palavras.forEach(function (p) {
    var w = largP(p);
    var largComEspaco = largAcumulada + (linhaActual.length ? espacoLargura : 0) + w;
    if (linhaActual.length && largComEspaco > largura) {
      linhas.push(linhaActual);
      linhaActual = [p]; largAcumulada = w;
    } else {
      linhaActual.push(p); largAcumulada = largComEspaco;
    }
  });
  if (linhaActual.length) linhas.push(linhaActual);

  var alturaPagina = doc.internal.pageSize.getHeight();
  if (y + linhas.length * alturaLinha > alturaPagina - margemInferior) { doc.addPage(); y = 14; }

  linhas.forEach(function (linha, i) {
    var largTotalPalavras = linha.reduce(function (s, p) { return s + largP(p); }, 0);
    var nEspacos = linha.length - 1;
    var ultima = i === linhas.length - 1;
    var espacoUsado = (ultima || !nEspacos) ? espacoLargura : (largura - largTotalPalavras) / nEspacos;

    var xAtual = x;
    linha.forEach(function (p, j) {
      doc.setFont('times', p.negrito ? 'bold' : 'normal');
      doc.text(p.texto, xAtual, y);
      xAtual += largP(p) + (j < linha.length - 1 ? espacoUsado : 0);
    });
    y += alturaLinha;
  });

  return y;
}

/** Tabela "Por Relator (ordenado por % de conclusão)" — sempre presente no relatório
 *  principal, com os mesmos dados reais de produtividade do tab "Por Juiz Relator"
 *  (ULTIMOS_DADOS.produtividade.relatores), ordenados por taxa de conclusão decrescente.
 *  Desenhada manualmente, célula a célula — Estatísticas já não carrega jspdf-autotable
 *  (ver README, 2026-07-26: removido por não ter uso nessa altura). Devolve o novo "y". */
function desenharTabelaPorRelator(doc, y, margem, pageW) {
  var relatores = ((ULTIMOS_DADOS.produtividade || {}).relatores || [])
    .filter(function (r) { return +r.total > 0; })
    .slice()
    .sort(function (a, b) { return (+b.taxa) - (+a.taxa); });
  if (!relatores.length) return y;

  var alturaPagina = doc.internal.pageSize.getHeight();
  var xRelator = margem, xTotal = 130, xPend = 152, xFind = 174, xPct = pageW - margem;

  // Tabela sem linhas (nem separadora nem de grelha) — só espaçamento e alinhamento de
  // colunas; cabeçalho a negrito é o que distingue visualmente da linha de dados.
  function cabecalho() {
    doc.setFont('times', 'bold'); doc.setFontSize(12);
    doc.text('Relator', xRelator, y);
    doc.text('Total',     xTotal, y, { align: 'right' });
    doc.text('Pendentes', xPend,  y, { align: 'right' });
    doc.text('Findos',    xFind,  y, { align: 'right' });
    doc.text('%',         xPct,   y, { align: 'right' });
    y += ALTURA_LINHA_CORPO;
  }

  doc.setFont('times', 'bold'); doc.setFontSize(12);
  doc.text('Por Relator (ordenado por % de conclusão)', margem, y); y += 8;
  cabecalho();

  doc.setFont('times', 'normal'); doc.setFontSize(12);
  relatores.forEach(function (r) {
    if (y > alturaPagina - 20) {
      doc.addPage(); y = 14;
      cabecalho();
      doc.setFont('times', 'normal'); doc.setFontSize(12);
    }
    doc.text(String(r.relator), xRelator, y);
    doc.text(String(+r.total),     xTotal, y, { align: 'right' });
    doc.text(String(+r.pendentes), xPend,  y, { align: 'right' });
    doc.text(String(+r.findos),    xFind,  y, { align: 'right' });
    doc.text(r.taxa + '%',         xPct,   y, { align: 'right' });
    y += ALTURA_LINHA_CORPO;
  });

  return y;
}

function gerarPdfRelatorio(logo) {
  var doc = new window.jspdf.jsPDF();
  var pageW = doc.internal.pageSize.getWidth();
  var margem = 14;
  var y = desenharCabecalhoInstitucionalPdf(doc, logo);

  // Resumo geral primeiro — antes do detalhe do tab activo, para o relatório abrir com a
  // visão geral (pedido explicitamente, ao contrário da ordem anterior).
  doc.setFont('times', 'bold'); doc.setFontSize(12);
  doc.text('Resumo geral', margem, y); y += 7;
  doc.setFont('times', 'normal'); doc.setFontSize(12);
  resumoGeralLinhas().forEach(function (linha) {
    y = escreverParagrafoJustificado(doc, linha, margem + 4, y, pageW - margem * 2 - 4, ALTURA_LINHA_CORPO, 20) + 1;
  });
  y += 4;

  // Tabela "Por Relator" — sempre presente, independente do tab activo. É a última secção
  // do relatório: o antigo bloco "Relatório — [Tab activo]" (dados do tab em frases de
  // texto) deixou de ser necessário, agora que Resumo Geral + Por Relator já cobrem o que
  // interessa mostrar, sempre com dados reais do sistema.
  if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 14; }
  desenharTabelaPorRelator(doc, y, margem, pageW);

  doc.save('SGD_Relatorio_' + relatorioActivo + '.pdf');
}

function exportarExcel() {
  if (!ULTIMOS_DADOS) return;
  carregarLibXlsx().then(function () {
    var wb = window.XLSX.utils.book_new();
    dadosExportacao().forEach(function (t) {
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([t.cabecalho].concat(t.linhas)), t.folha);
    });
    window.XLSX.writeFile(wb, 'SGD_Relatorio_' + relatorioActivo + '.xlsx');
  }).catch(function (e) { showToast('Erro ao gerar Excel: ' + (e.message || e), 'ti-alert-triangle', 'red'); });
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
