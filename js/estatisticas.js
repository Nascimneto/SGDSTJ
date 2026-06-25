/**
 * estatisticas.js — distribuição por estado/espécie/utilizador (em gráfico,
 * Chart.js, com tipo seleccionável), filtros por utilizador e intervalo de
 * datas, funil processual, quadro resumo, exportação PDF/Excel/Impressão.
 */
var SGD_COR_ESTADO = window.SGD_COR_ESTADO || { entry: '#2563EB', analysis: '#7C3AED', distributed: '#D97706', concluded: '#059669', archived: '#9CA3AF' };
var PALETA = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#DB2777', '#0891B2', '#9333EA', '#CA8A04', '#475569'];
var ULTIMOS_DADOS = null;
var TIPO_GRAFICO = 'bar';
var CHARTS = { estado: null, especie: null, utilizador: null };

// Plugin de rótulos (mostra o número em cada fatia no gráfico de pizza) —
// carregado via <script> em estatisticas.php, só precisa de ser registado uma vez.
if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}

document.addEventListener('DOMContentLoaded', function () {
  carregarEstatisticas();

  var exportPdf  = G('btnExportPdf');
  var exportXlsx = G('btnExportXlsx');
  var imprimir   = G('btnImprimir');
  if (exportPdf)  exportPdf.addEventListener('click', exportarEstatisticasPDF);
  if (exportXlsx) exportXlsx.addEventListener('click', exportarEstatisticasExcel);
  if (imprimir)   imprimir.addEventListener('click', function () { window.print(); });

  ['fEstUtilizador', 'fEstDataDe', 'fEstDataAte'].forEach(function (id) {
    var el = G(id);
    if (el) el.addEventListener('change', carregarEstatisticas);
  });

  var limpar = G('btnLimparFiltrosEst');
  if (limpar) limpar.addEventListener('click', function () {
    G('fEstUtilizador').value = ''; G('fEstDataDe').value = ''; G('fEstDataAte').value = '';
    carregarEstatisticas();
  });

  var tipoGrafico = G('fTipoGrafico');
  if (tipoGrafico) tipoGrafico.addEventListener('change', function () {
    TIPO_GRAFICO = tipoGrafico.value;
    if (ULTIMOS_DADOS) renderGraficos(ULTIMOS_DADOS.distribuicao);
  });
});

function paramsFiltroEstatisticas() {
  var p = new URLSearchParams();
  var u = GV('fEstUtilizador');  if (u) p.set('utilizador', u);
  var de = GV('fEstDataDe');     if (de) p.set('data_de', de);
  var ate = GV('fEstDataAte');   if (ate) p.set('data_ate', ate);
  return p.toString();
}

function carregarEstatisticas() {
  var qs = paramsFiltroEstatisticas();
  Promise.all([
    apiGet('api/estatisticas/resumo.php?' + qs),
    apiGet('api/estatisticas/distribuicao.php?' + qs),
    apiGet('api/estatisticas/funil.php?' + qs),
    apiGet('api/conclusao/pendentes.php'),
    apiGet('api/vistos/pendentes.php')
  ]).then(function (res) {
    ULTIMOS_DADOS = { resumo: res[0], distribuicao: res[1], funil: res[2].funil, conclusao: res[3], vistos: res[4] };
    renderEstatisticas(ULTIMOS_DADOS);
  }).catch(function (e) {
    G('estCorpo').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

function renderEstatisticas(d) {
  var funilHtml = d.funil.map(function (f) {
    return '<div class="tl-item"><div class="tl-d">' + (f.conversao !== null ? f.conversao + '%' : '&mdash;') + '</div>'
      + '<div class="tl-t">' + esc(f.label) + ' &mdash; <b>' + f.total + '</b></div></div>';
  }).join('');

  var resumoRows = d.distribuicao.porEspecie.map(function (e) {
    return '<tr><td class="tdl" style="padding:8px 12px">' + esc(e.especie) + '</td><td style="text-align:center;padding:8px 12px">' + e.total + '</td></tr>';
  }).join('');
  // Vista em "tabela compacta" para ecrãs estreitos — sem isto, o quadro
  // desaparecia a partir de 767px (.tbl-outer fica display:none nesse
  // breakpoint, ver css/estilos.css), tal como aconteceu em Histórico/Auditoria.
  // Um único cabeçalho (cor igual à da tabela real, var(--sid)) em cima de
  // todas as linhas — não um rótulo repetido por linha.
  var resumoCards = '<div class="pc-card" style="padding:0;overflow:hidden">'
    + '<div style="display:flex;background:var(--sid);padding:8px 14px;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">'
    + '<span style="flex:1">Espécie</span><span style="flex:0 0 50px;text-align:right">Total</span></div>'
    + d.distribuicao.porEspecie.map(function (e, i) {
        var zebra = i % 2 ? 'background:#FAFAF6;' : '';
        return '<div style="display:flex;padding:9px 14px;border-bottom:1px solid var(--border);' + zebra + '">'
          + '<span style="flex:1;font-size:13px">' + esc(e.especie) + '</span>'
          + '<span style="flex:0 0 50px;text-align:right;font-weight:600;font-size:13px">' + e.total + '</span></div>';
      }).join('')
    + '</div>';

  G('estCorpo').innerHTML = '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-files" style="color:var(--blue)"></i> Total</div><div class="stat-num" style="color:var(--blue)">' + d.resumo.totais.total + '</div><div class="stat-sub">Registados</div></div>'
    + statDuplo('ti-check', 'var(--green)', 'Conclusão', d.conclusao.pendentes.length, d.conclusao.concluidosCount)
    + statDuplo('ti-stamp', 'var(--purple)', 'Visto', d.vistos.pendentes.length, d.vistos.concluidosCount)
    + '</div>'
    + '<div class="row2">'
    + '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-chart-bar" style="color:var(--blue)"></i> Distribuição por Estado</div><div class="chart-wrap"><canvas id="chartEstado"></canvas></div></div>'
    + '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-category" style="color:var(--purple)"></i> Distribuição por Espécie</div><div class="chart-wrap"><canvas id="chartEspecie"></canvas></div></div>'
    + '</div>'
    + '<div class="row2">'
    + '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-users" style="color:var(--green)"></i> Distribuição por Utilizador</div><div class="chart-wrap"><canvas id="chartUtilizador"></canvas></div></div>'
    + '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-filter" style="color:var(--amber)"></i> Funil Processual</div><div class="tl">' + funilHtml + '</div></div>'
    + '</div>'
    + '<div class="panel" style="padding:0;margin-top:9px"><div class="panel-hd"><i class="ti ti-table" style="color:var(--green)"></i><span class="panel-title">Quadro Resumo por Espécie</span></div>'
    + '<div class="tbl-outer"><table class="pt" style="min-width:0;font-size:12px"><thead><tr><th class="th0">Espécie</th><th>Total</th></tr></thead><tbody>' + resumoRows + '</tbody></table></div>'
    + '<div class="pc-list" style="padding:10px 14px">' + resumoCards + '</div></div>';

  renderGraficos(d.distribuicao);
}

/** Constrói (ou recria) os três gráficos no tipo actualmente seleccionado (#fTipoGrafico). */
function renderGraficos(distribuicao) {
  desenharGrafico('estado', G('chartEstado'),
    distribuicao.porEstado.map(function (e) { return e.label; }),
    distribuicao.porEstado.map(function (e) { return e.total; }),
    distribuicao.porEstado.map(function (e) { return SGD_COR_ESTADO[e.codigo] || '#888'; })
  );
  desenharGrafico('especie', G('chartEspecie'),
    distribuicao.porEspecie.map(function (e) { return e.especie; }),
    distribuicao.porEspecie.map(function (e) { return e.total; }),
    distribuicao.porEspecie.map(function (e, i) { return PALETA[i % PALETA.length]; })
  );
  desenharGrafico('utilizador', G('chartUtilizador'),
    distribuicao.porUtilizador.map(function (u) { return u.utilizador; }),
    distribuicao.porUtilizador.map(function (u) { return u.total; }),
    distribuicao.porUtilizador.map(function (u, i) { return PALETA[i % PALETA.length]; })
  );
}

function desenharGrafico(chave, canvas, labels, valores, cores) {
  if (!canvas || !window.Chart) return;
  if (CHARTS[chave]) { CHARTS[chave].destroy(); }

  // Total do próprio gráfico (não da página) — a percentagem de cada fatia/barra
  // é sempre relativa ao que está visível nesse gráfico, já filtrado.
  var total = valores.reduce(function (a, b) { return a + b; }, 0);
  var mostrarRotulos = TIPO_GRAFICO === 'pie' || TIPO_GRAFICO === 'bar';

  CHARTS[chave] = new window.Chart(canvas, {
    type: TIPO_GRAFICO,
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: TIPO_GRAFICO === 'line' ? 'rgba(37,99,235,.12)' : cores,
        borderColor: TIPO_GRAFICO === 'line' ? '#2563EB' : cores,
        borderWidth: TIPO_GRAFICO === 'line' ? 2 : 1,
        fill: TIPO_GRAFICO === 'line',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: TIPO_GRAFICO === 'pie', position: 'bottom', labels: { font: { size: 10 } } },
        // Só a percentagem (sem o número) em cada fatia (pizza) ou barra; na
        // linha não — muitos pontos próximos tornam-se ilegíveis.
        datalabels: {
          display: mostrarRotulos,
          color: TIPO_GRAFICO === 'pie' ? '#fff' : '#374151',
          anchor: TIPO_GRAFICO === 'bar' ? 'end' : 'center',
          align: TIPO_GRAFICO === 'bar' ? 'end' : 'center',
          offset: TIPO_GRAFICO === 'bar' ? 4 : 0,
          font: { size: 11, weight: '600' },
          formatter: function (valor) {
            if (!valor) return '';
            return (total ? Math.round(valor / total * 100) : 0) + '%';
          },
          // clamp: mantém o rótulo dentro da área do gráfico (não cortado
          // pelo canvas) quando a barra chega perto do topo.
          clamp: true
        }
      },
      // Margem extra acima das barras para o rótulo não colar no rebordo do canvas.
      layout: TIPO_GRAFICO === 'bar' ? { padding: { top: 18 } } : {},
      scales: TIPO_GRAFICO === 'pie' ? {} : {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          // Tecto acima do valor máximo (não só o padding do layout) — dá
          // espaço real ao rótulo da barra mais alta, que senão fica colado
          // ou cortado no topo do gráfico.
          suggestedMax: TIPO_GRAFICO === 'bar' ? Math.ceil(Math.max.apply(null, valores) * 1.2) || 1 : undefined
        }
      }
    }
  });
}

function exportarEstatisticasPDF() {
  if (!ULTIMOS_DADOS) return;
  var doc = new window.jspdf.jsPDF();
  doc.setFontSize(13);
  doc.text('SGD — Estatísticas', 14, 12);
  doc.autoTable({
    head: [['Estado', 'Total']],
    body: ULTIMOS_DADOS.distribuicao.porEstado.map(function (e) { return [e.label, e.total]; }),
    startY: 18
  });
  doc.autoTable({
    head: [['Espécie', 'Total']],
    body: ULTIMOS_DADOS.distribuicao.porEspecie.map(function (e) { return [e.especie, e.total]; }),
    startY: doc.lastAutoTable.finalY + 8
  });
  doc.autoTable({
    head: [['Utilizador', 'Total']],
    body: ULTIMOS_DADOS.distribuicao.porUtilizador.map(function (u) { return [u.utilizador, u.total]; }),
    startY: doc.lastAutoTable.finalY + 8
  });
  doc.save('SGD_Estatisticas.pdf');
}

function exportarEstatisticasExcel() {
  if (!ULTIMOS_DADOS) return;
  var wb = window.XLSX.utils.book_new();
  var wsEstado = window.XLSX.utils.aoa_to_sheet(
    [['Estado', 'Total']].concat(ULTIMOS_DADOS.distribuicao.porEstado.map(function (e) { return [e.label, e.total]; }))
  );
  var wsEspecie = window.XLSX.utils.aoa_to_sheet(
    [['Especie', 'Total']].concat(ULTIMOS_DADOS.distribuicao.porEspecie.map(function (e) { return [e.especie, e.total]; }))
  );
  var wsUtilizador = window.XLSX.utils.aoa_to_sheet(
    [['Utilizador', 'Total']].concat(ULTIMOS_DADOS.distribuicao.porUtilizador.map(function (u) { return [u.utilizador, u.total]; }))
  );
  window.XLSX.utils.book_append_sheet(wb, wsEstado, 'Por Estado');
  window.XLSX.utils.book_append_sheet(wb, wsEspecie, 'Por Especie');
  window.XLSX.utils.book_append_sheet(wb, wsUtilizador, 'Por Utilizador');
  window.XLSX.writeFile(wb, 'SGD_Estatisticas.xlsx');
}
