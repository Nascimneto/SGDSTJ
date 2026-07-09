/**
 * conclusao.js — registo e gestão de datas de conclusão, pendências.
 */
document.addEventListener('DOMContentLoaded', carregarConclusao);

function carregarConclusao() {
  apiGet('api/conclusao/pendentes.php').then(renderConclusao).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

function renderConclusao(res) {
  var pendentes = res.pendentes;
  var rows = pendentes.map(function (d) {
    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px;box-shadow:var(--sh)">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">'
      + '<div><span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:600;color:var(--blue)">' + esc(d.numero_processo) + '</span>'
      + '<div style="font-size:13px;font-weight:500;margin-top:3px">' + esc(trunc(d.partes, 55)) + '</div>'
      + '<div style="font-size:11px;color:var(--tx2);margin-top:2px">' + esc(d.especie) + ' &middot; ' + esc(d.distribuicao || '—') + '</div></div>'
      + '<span class="badge b-analysis">' + esc(d.estado) + '</span></div>'
      + '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:10px">'
      + '<div class="fg" style="flex:1;min-width:150px;margin-bottom:0"><label>Conclusao</label><input type="date" id="wf_' + d.id + '"></div>'
      + '<button class="btn btn-success btn-sm" onclick="guardarConclusao(' + d.id + ')"><i class="ti ti-device-floppy"></i> Guardar</button>'
      + '</div></div>';
  }).join('');

  G('content').innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">'
    + '<div class="row2" style="margin-bottom:0">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-hourglass" style="color:var(--amber)"></i> Total Pendente</div><div class="stat-num" style="color:var(--amber)">' + pendentes.length + '</div><div class="stat-sub">Aguardam registo de conclusão</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-check" style="color:var(--green)"></i> Total Findos</div><div class="stat-num" style="color:var(--green)">' + res.concluidosCount + '</div><div class="stat-sub">Com data de conclusão registada</div></div>'
    + '</div>'
    + '<div class="panel"><div class="panel-hd"><i class="ti ti-check" style="color:var(--green)"></i><span class="panel-title">Conclusão &mdash; Pendentes</span></div>'
    + '<div style="padding:14px"><div class="ib amber" style="margin-bottom:14px"><i class="ti ti-info-circle" style="font-size:14px;flex-shrink:0"></i> Registe a data em que o processo foi concluido.</div>'
    + (pendentes.length === 0 ? '<div class="empty" style="padding:24px"><i class="ti ti-mood-happy"></i><p>Sem processos pendentes</p></div>' : rows)
    + '</div></div></div>';
  fadeIn(G('content'));
}

function guardarConclusao(id) {
  var data = GV('wf_' + id);
  if (!data) { showToast('Selecione uma data', 'ti-alert-circle', 'red'); return; }
  apiPost('api/conclusao/guardar.php', { processo_id: id, conclusao: data }).then(function () {
    showToast('Conclusão registada!', 'ti-circle-check');
    carregarConclusao();
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}
