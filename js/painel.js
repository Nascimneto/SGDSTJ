/**
 * painel.js — Painel Geral (ex pgDash(), adaptado para consumir a API)
 */
var SGD_COR_ESTADO = { entry: '#2563EB', analysis: '#7C3AED', distributed: '#D97706', concluded: '#059669', archived: '#9CA3AF' };

document.addEventListener('DOMContentLoaded', function () {
  carregarPainel();
});

function carregarPainel() {
  Promise.all([
    apiGet('api/estatisticas/resumo.php'),
    apiGet('api/conclusao/pendentes.php'),
    apiGet('api/vistos/pendentes.php')
  ]).then(function (res) {
    renderPainel(res[0], res[1], res[2]);
  }).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro ao carregar o painel: ' + esc(e.message) + '</p></div>';
  });
}

function renderPainel(resumo, conclusao, vistos) {
  var t  = resumo.totais.total;
  var pt = resumo.totais.em_tabela;

  var maxEstado = 1;
  resumo.porEstado.forEach(function (e) { if (e.total > maxEstado) maxEstado = e.total; });

  var charts = resumo.porEstado.map(function (e) {
    var pct = Math.round(e.total / maxEstado * 100);
    return '<div class="chart-row"><span class="chart-lbl">' + esc(e.label) + '</span>'
      + '<div class="chart-bg"><div class="chart-fill" style="width:' + pct + '%;background:' + (SGD_COR_ESTADO[e.codigo] || '#888') + '"></div></div>'
      + '<span class="chart-val">' + e.total + '</span></div>';
  }).join('');

  G('content').innerHTML = '<div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-files" style="color:var(--blue)"></i> Total</div><div class="stat-num" style="color:var(--blue)">' + t + '</div><div class="stat-sub">Registados</div></div>'
    + statDuplo('ti-check', 'var(--green)', 'Conclusão', conclusao.pendentes.length, conclusao.concluidosCount)
    + statDuplo('ti-stamp', 'var(--purple)', 'Visto', vistos.pendentes.length, vistos.concluidosCount)
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-calendar" style="color:var(--amber)"></i> Em Tabela</div><div class="stat-num" style="color:var(--amber)">' + pt + '</div><div class="stat-sub">Aguarda acordao</div></div>'
    + '</div>'
    + '<div class="panel" style="padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-chart-bar" style="color:var(--blue)"></i> Por Estado</div>' + charts + '</div>';
}
