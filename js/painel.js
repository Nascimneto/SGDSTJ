/**
 * painel.js — Painel Geral
 */
var SGD_COR_ESTADO = { entry: '#2563EB', analysis: '#7C3AED', distributed: '#D97706', concluded: '#059669', archived: '#9CA3AF' };
var MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var painelFiltro = { periodo: 'tudo', escala: 'mensal' };
var CHART_PAINEL_ESTADO = null;
var CHART_PAINEL_JUIZ   = null;

if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}

document.addEventListener('DOMContentLoaded', function () {
  carregarPainel();
});

function carregarPainel() {
  var qs  = periodoParams();
  var qsQ = qs ? '?' + qs : '';

  Promise.all([
    apiGet('api/estatisticas/resumo.php' + qsQ),
    apiGet('api/processos/listar.php?limite=8'),
    apiGet('api/estatisticas/volume.php?escala=' + painelFiltro.escala),
    apiGet('api/estatisticas/produtividade.php' + qsQ),
  ]).then(function (res) {
    renderPainel(res[0], res[1], res[2], res[3]);
  }).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro ao carregar o painel: ' + esc(e.message) + '</p></div>';
  });
}

function periodoParams() {
  var hoje = new Date();
  var ano  = hoje.getFullYear();
  var mes  = String(hoje.getMonth() + 1).padStart(2, '0');
  var dia  = String(hoje.getDate()).padStart(2, '0');
  if (painelFiltro.periodo === 'mes') return 'data_de=' + ano + '-' + mes + '-01&data_ate=' + ano + '-' + mes + '-' + dia;
  if (painelFiltro.periodo === 'ano') return 'data_de=' + ano + '-01-01&data_ate=' + ano + '-' + mes + '-' + dia;
  return '';
}

/* ─── Render principal ─── */
function renderPainel(resumo, processos, volume, prod) {
  if (CHART_PAINEL_ESTADO) { CHART_PAINEL_ESTADO.destroy(); CHART_PAINEL_ESTADO = null; }
  if (CHART_PAINEL_JUIZ)   { CHART_PAINEL_JUIZ.destroy();   CHART_PAINEL_JUIZ   = null; }

  var t         = (resumo && resumo.totais)    || {};
  var porEstado = (resumo && resumo.porEstado) || [];
  var temPeriodo = painelFiltro.periodo !== 'tudo';

  var numEntrados = temPeriodo ? (t.total || 0) : (t.total_acumulado || 0);
  var subEntrados = temPeriodo
    ? '<div class="stat-sub">Acumulado: ' + (t.total_acumulado || 0) + '</div>'
    : '<div class="stat-sub">Total acumulado</div>';

  G('content').innerHTML = [
    /* filtros de período */
    '<div style="display:flex;gap:6px;margin-bottom:14px">'
      + btnPeriodo('tudo', 'Todo o período') + btnPeriodo('ano', 'Este ano') + btnPeriodo('mes', 'Este mês')
      + '</div>',

    /* 3 cards */
    '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
      + '<div class="stat"><div class="stat-lbl"><i class="ti ti-inbox" style="color:var(--blue)"></i> Processos Entrados</div>'
      + '<div class="stat-num" style="color:var(--blue)">' + numEntrados + '</div>' + subEntrados + '</div>'
      + '<div class="stat"><div class="stat-lbl"><i class="ti ti-hourglass" style="color:var(--amber)"></i> Processos Pendentes</div>'
      + '<div class="stat-num" style="color:var(--amber)">' + (t.pendentes || 0) + '</div>'
      + '<div class="stat-sub">Em tramitação ativa</div></div>'
      + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-check" style="color:var(--green)"></i> Processos Findos</div>'
      + '<div class="stat-num" style="color:var(--green)">' + (t.findos || 0) + '</div>'
      + '<div class="stat-sub">Concluídos e arquivados</div></div>'
      + '</div>',

    /* distribuição por estado + produtividade por juiz relator, lado a lado */
    '<div class="row2" style="margin-bottom:12px">'
      + '<div class="panel" style="padding:16px">'
      + '<div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-chart-pie" style="color:var(--blue)"></i> Distribuição por Estado</div>'
      + (porEstado.length
          ? '<div style="position:relative;height:260px"><canvas id="chartPainelEstado"></canvas></div>'
          : '<p style="font-size:12px;color:var(--tx3)">Sem dados.</p>')
      + '</div>'
      + renderProdutividade(prod && prod.relatores ? prod.relatores : [])
      + '</div>',

    /* linha 2: lista recente + gráfico volume */
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">',
    renderProcessosRecentes(processos && processos.items ? processos.items : []),
    renderVolumeGrafico(volume),
    '</div>',
  ].join('');
  fadeIn(G('content'));

  desenharGraficoEstadoPainel(porEstado);
  desenharGraficoJuizPainel(prod && prod.relatores ? prod.relatores : []);

  /* listeners dos botões */
  ['tudo','ano','mes'].forEach(function (p) {
    var btn = G('btn-periodo-' + p);
    if (btn) btn.addEventListener('click', function () { painelFiltro.periodo = p; carregarPainel(); });
  });
  ['mensal','anual'].forEach(function (e) {
    var btn = G('btn-escala-' + e);
    if (btn) btn.addEventListener('click', function () { painelFiltro.escala = e; carregarPainel(); });
  });
}

/* ─── Gráfico de Pizza: Distribuição por Estado ─── */
function desenharGraficoEstadoPainel(porEstado) {
  var canvas = G('chartPainelEstado');
  if (!canvas || !window.Chart || !porEstado.length) return;

  var valores = porEstado.map(function (e) { return +e.total || 0; });
  var totalG  = valores.reduce(function (a, b) { return a + b; }, 0);

  CHART_PAINEL_ESTADO = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: porEstado.map(function (e) { return e.label; }),
      datasets: [{
        data: valores,
        backgroundColor: porEstado.map(function (e) { return SGD_COR_ESTADO[e.codigo] || '#888'; }),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'right', align: 'center', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
        datalabels: {
          display: true, color: '#fff', anchor: 'center', align: 'center', font: { size: 11, weight: '600' },
          formatter: function (v) { return totalG ? Math.round(v / totalG * 100) + '%' : ''; }
        }
      }
    }
  });
}

/* ─── Gráfico de coluna agrupada: Pendentes/Findos por Juiz Relator ─── */
function desenharGraficoJuizPainel(relatores) {
  var canvas = G('chartPainelJuiz');
  if (!canvas || !window.Chart || !relatores.length) return;

  CHART_PAINEL_JUIZ = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: relatores.map(function (r) { return r.relator; }),
      datasets: [
        { label:'Pendentes', data: relatores.map(function (r) { return +r.pendentes || 0; }), backgroundColor:'#D97706', borderRadius:3 },
        { label:'Findos',    data: relatores.map(function (r) { return +r.findos    || 0; }), backgroundColor:'#059669', borderRadius:3 }
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

/* ─── Lista de processos recentes ─── */
function renderProcessosRecentes(items) {
  var linhas = items.slice(0, 8).map(function (p) {
    var data = p.data_registo ? p.data_registo.substring(0, 10) : '—';
    return '<tr>'
      + '<td style="padding:6px 8px"><a href="processos.php" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:var(--blue);text-decoration:none;font-weight:600">'
      + esc(p.numero_processo) + '</a></td>'
      + '<td style="padding:6px 8px"><span class="badge b-' + esc(p.estado_codigo) + '">' + esc(p.estado) + '</span></td>'
      + '<td style="padding:6px 8px;font-size:11px;color:var(--tx2);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(p.partes || '') + '">' + esc(p.partes || '—') + '</td>'
      + '<td style="padding:6px 8px;font-size:11px;color:var(--tx3);white-space:nowrap">' + esc(data) + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-files" style="color:var(--blue)"></i> Processos Recentes</div>'
    + (linhas
      ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
        + '<thead><tr>'
        + thR('Nº Processo') + thR('Estado') + thR('Partes') + thR('Data')
        + '</tr></thead><tbody>' + linhas + '</tbody></table></div>'
      : '<p style="font-size:12px;color:var(--tx3)">Nenhum processo registado.</p>')
    + '<div style="margin-top:10px"><a href="processos.php" style="font-size:11px;color:var(--blue)">Ver todos os processos →</a></div>'
    + '</div>';
}

function thR(label) {
  return '<th style="text-align:left;padding:4px 8px;font-size:10px;color:var(--tx3);font-weight:600;border-bottom:1px solid var(--border)">' + label + '</th>';
}

/* ─── Gráfico volumétrico (SVG puro, sem dependências externas) ─── */
function renderVolumeGrafico(volume) {
  var dados  = (volume && volume.dados)  || [];
  var escala = (volume && volume.escala) || 'mensal';

  return '<div class="panel" style="padding:16px;display:flex;flex-direction:column">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div style="font-size:13px;font-weight:600"><i class="ti ti-chart-line" style="color:var(--blue)"></i> Registados vs Concluídos</div>'
    + '<div style="display:flex;gap:4px">' + btnEscala('mensal','Mensal') + btnEscala('anual','Anual') + '</div>'
    + '</div>'
    + svgBars(dados, escala)
    + '</div>';
}

function svgBars(dados, escala) {
  if (!dados.length) return '<p style="font-size:12px;color:var(--tx3);padding:16px 0 0">Sem dados para o período.</p>';

  var maxV = 1;
  dados.forEach(function (d) {
    if (d.registados > maxV) maxV = d.registados;
    if (d.concluidos > maxV) maxV = d.concluidos;
  });

  var W = 460, H = 148, PL = 24, PR = 6, PT = 6, PB = 26;
  var cW = W - PL - PR, cH = H - PT - PB;
  var n  = dados.length || 1;
  var gW = cW / n;
  var bW = Math.max(3, Math.min(13, Math.floor(gW * 0.38)));

  var linhas = '', barras = '';

  for (var g = 0; g <= 4; g++) {
    var gy = PT + cH - Math.round(cH * g / 4);
    var gv = Math.round(maxV * g / 4);
    linhas += '<line x1="' + PL + '" y1="' + gy + '" x2="' + (W - PR) + '" y2="' + gy + '" stroke="#F1F5F9" stroke-width="1"/>'
      + '<text x="' + (PL - 2) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="8" fill="#94A3B8">' + gv + '</text>';
  }

  dados.forEach(function (d, i) {
    var cx = PL + i * gW + gW / 2;
    var hR = d.registados > 0 ? Math.max(1, Math.round(d.registados / maxV * cH)) : 0;
    var hC = d.concluidos > 0 ? Math.max(1, Math.round(d.concluidos / maxV * cH)) : 0;
    var lbl = escala === 'anual' ? d.periodo
      : (function () { var p = d.periodo.split('-'); return MESES_PT[parseInt(p[1]) - 1] + '/' + p[0].slice(2); }());

    barras += '<rect x="' + (cx - bW - 1) + '" y="' + (PT + cH - hR) + '" width="' + bW + '" height="' + hR + '" fill="#2563EB" rx="1"/>'
      + '<rect x="' + (cx + 1) + '" y="' + (PT + cH - hC) + '" width="' + bW + '" height="' + hC + '" fill="#059669" rx="1"/>'
      + '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="8" fill="#94A3B8">' + esc(lbl) + '</text>';
  });

  return '<div style="flex:1;min-height:148px;position:relative">'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">'
    + linhas + barras + '</svg></div>'
    + '<div style="display:flex;gap:12px;margin-top:6px;font-size:10px;color:var(--tx3)">'
    + '<span><span style="display:inline-block;width:10px;height:8px;background:#2563EB;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Registados</span>'
    + '<span><span style="display:inline-block;width:10px;height:8px;background:#059669;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Concluídos</span>'
    + '</div>';
}

/* ─── Produtividade por Juiz Relator — só o gráfico (Pendentes/Findos por juiz);
   o detalhe por juiz fica no tab "Por Juiz Relator" de Estatísticas. ─── */
function renderProdutividade(relatores) {
  if (!relatores.length) return '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-users" style="color:var(--blue)"></i> Produtividade por Juiz Relator</div><p style="font-size:12px;color:var(--tx3)">Sem dados.</p></div>';

  return '<div class="panel" style="padding:16px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-users" style="color:var(--blue)"></i> Produtividade por Juiz Relator</div>'
    + '<div style="position:relative;height:260px"><canvas id="chartPainelJuiz"></canvas></div>'
    + '</div>';
}

/* ─── Botões auxiliares ─── */
function btnPeriodo(cod, label) {
  var ativo = painelFiltro.periodo === cod;
  return '<button id="btn-periodo-' + cod + '" class="btn btn-sm' + (ativo ? ' btn-primary' : '') + '">' + label + '</button>';
}

function btnEscala(cod, label) {
  var ativo = painelFiltro.escala === cod;
  return '<button id="btn-escala-' + cod + '" class="btn btn-xs' + (ativo ? ' btn-primary' : '') + '">' + label + '</button>';
}
