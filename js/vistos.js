/**
 * vistos.js — Visto MP, Adjunto 1, Adjunto 2, com registo por utilizador.
 */
document.addEventListener('DOMContentLoaded', carregarVistos);

function carregarVistos() {
  apiGet('api/vistos/pendentes.php').then(renderVistos).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

function campoVisto(label, valor, registadoPor, inputId) {
  if (valor) {
    return '<div class="fg" style="margin-bottom:0"><label>' + label + '</label>'
      + '<div style="font-size:12px;color:var(--green);display:flex;align-items:center;gap:5px">'
      + '<i class="ti ti-circle-check"></i> ' + esc(i2p(valor)) + (registadoPor ? ' &middot; ' + esc(registadoPor) : '') + '</div></div>';
  }
  return '<div class="fg" style="margin-bottom:0"><label>' + label + '</label><input type="date" id="' + inputId + '"></div>';
}

function renderVistos(res) {
  var pendentes = res.pendentes;
  var rows = pendentes.map(function (d) {
    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px;box-shadow:var(--sh)">'
      + '<div><span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:600;color:var(--blue)">' + esc(d.numero_processo) + '</span>'
      + '<div style="font-size:13px;font-weight:500;margin-top:3px">' + esc(trunc(d.partes, 55)) + '</div>'
      + '<div style="font-size:11px;color:var(--tx2);margin-top:2px">' + esc(d.especie) + ' &middot; ' + esc(d.distribuicao || '—') + '</div></div>'
      + '<div class="fg3" style="margin-top:10px">'
      + campoVisto('Visto MP', d.visto_mp, d.visto_mp_por, 'vmp_' + d.id)
      + campoVisto('Juiz Adj. 1', d.visto_adjunto1, d.visto_adj1_por, 'va1_' + d.id)
      + campoVisto('Juiz Adj. 2', d.visto_adjunto2, d.visto_adj2_por, 'va2_' + d.id)
      + '</div>'
      + '<button class="btn btn-success btn-sm" style="margin-top:10px" onclick="guardarVistos(' + d.id + ')"><i class="ti ti-device-floppy"></i> Guardar Vistos</button>'
      + '</div>';
  }).join('');

  G('content').innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">'
    + '<div class="row2" style="margin-bottom:0">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-eye-check" style="color:var(--purple)"></i> Processos Pendentes de Visto</div><div class="stat-num" style="color:var(--purple)">' + pendentes.length + '</div><div class="stat-sub">Aguardam registo de vistos</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-check" style="color:var(--green)"></i> Processos Concluídos</div><div class="stat-num" style="color:var(--green)">' + res.concluidosCount + '</div><div class="stat-sub">Com todos os vistos registados</div></div>'
    + '</div>'
    + '<div class="panel"><div class="panel-hd"><i class="ti ti-eye-check" style="color:var(--purple)"></i><span class="panel-title">Vistos &mdash; Pendentes</span></div>'
    + '<div style="padding:14px"><div class="ib amber" style="margin-bottom:14px"><i class="ti ti-info-circle" style="font-size:14px;flex-shrink:0"></i> Registe os vistos do Ministerio Publico e dos Juizes Adjuntos.</div>'
    + (pendentes.length === 0 ? '<div class="empty" style="padding:24px"><i class="ti ti-mood-happy"></i><p>Sem processos pendentes</p></div>' : rows)
    + '</div></div></div>';
}

function guardarVistos(id) {
  var mp = GV('vmp_' + id), a1 = GV('va1_' + id), a2 = GV('va2_' + id);
  if (!mp && !a1 && !a2) { showToast('Preencha pelo menos um visto', 'ti-alert-circle', 'red'); return; }

  var dados = { processo_id: id };
  if (mp) dados.visto_mp = mp;
  if (a1) dados.visto_adjunto1 = a1;
  if (a2) dados.visto_adjunto2 = a2;

  apiPost('api/vistos/guardar.php', dados).then(function () {
    showToast('Vistos actualizados!', 'ti-circle-check');
    carregarVistos();
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}
