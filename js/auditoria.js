/**
 * auditoria.js — páginas "Histórico" e "Auditoria" do menu (admin only),
 * ambas servidas por auditoria.php — com filtros.
 * Duas abas, dois endpoints, duas tabelas distintas:
 *  - Histórico de Processos  -> api/auditoria/listar.php  (historico_processo)
 *  - Auditoria do Sistema    -> api/auditoria/sistema.php (auditoria_sistema)
 */
var TODOS_EVENTOS = [];
var AUD_PG = 1;
var AUD_PAGE_SIZE = 20;
var AUD_ABA = 'historico';

document.addEventListener('DOMContentLoaded', function () {
  ['fQ'].forEach(function (id) {
    var el = G(id);
    if (el) el.addEventListener('input', function () { AUD_PG = 1; carregarAuditoria(); });
  });
  ['fTipo', 'fUtilizador', 'fDataDe', 'fDataAte'].forEach(function (id) {
    var el = G(id);
    if (el) el.addEventListener('change', function () { AUD_PG = 1; carregarAuditoria(); });
  });

  var limpar = G('btnLimparFiltros');
  if (limpar) limpar.addEventListener('click', function () {
    G('fQ').value = ''; G('fTipo').value = ''; G('fUtilizador').value = '';
    G('fDataDe').value = ''; G('fDataAte').value = '';
    AUD_PG = 1;
    carregarAuditoria();
  });

  var abaHist = G('abaHistorico'), abaSis = G('abaSistema');
  if (abaHist) abaHist.addEventListener('click', function () { trocarAbaAuditoria('historico'); });
  if (abaSis)  abaSis.addEventListener('click', function () { trocarAbaAuditoria('sistema'); });

  // O menu agora tem dois itens separados — "Histórico" (auditoria.php) e
  // "Auditoria" (auditoria.php?aba=sistema) — em vez de um só "Histórico e
  // Auditoria". A aba inicial reflecte qual desses links foi seguido.
  if (new URLSearchParams(window.location.search).get('aba') === 'sistema') {
    AUD_ABA = 'sistema';
    abaHist.className = 'btn btn-sm';
    abaSis.className  = 'btn btn-sm btn-primary';
    G('fQ').placeholder = 'Mensagem, código do evento...';
  }

  preencherTiposAuditoria();
  carregarAuditoria();
});

function trocarAbaAuditoria(aba) {
  if (aba === AUD_ABA) return;
  AUD_ABA = aba;
  AUD_PG = 1;
  G('abaHistorico').className = 'btn btn-sm' + (aba === 'historico' ? ' btn-primary' : '');
  G('abaSistema').className   = 'btn btn-sm' + (aba === 'sistema'   ? ' btn-primary' : '');
  G('fQ').placeholder = aba === 'historico' ? 'Nº processo, descrição...' : 'Mensagem, código do evento...';
  preencherTiposAuditoria();
  G('fTipo').value = '';
  carregarAuditoria();
}

function preencherTiposAuditoria() {
  var tipos = AUD_ABA === 'historico' ? (window.SGD_TIPOS_HISTORICO || []) : (window.SGD_TIPOS_AUDITORIA || []);
  G('fTipo').innerHTML = '<option value="">Todos os tipos</option>'
    + tipos.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
}

function paramsFiltroAuditoria() {
  var p = new URLSearchParams();
  var q = GV('fQ').trim();    if (q) p.set('q', q);
  var tipo = GV('fTipo');     if (tipo) p.set('tipo_evento', tipo);
  var util = GV('fUtilizador'); if (util) p.set('utilizador', util);
  var de = GV('fDataDe');     if (de) p.set('data_de', de);
  var ate = GV('fDataAte');   if (ate) p.set('data_ate', ate);
  p.set('limite', 200);
  return p.toString();
}

function carregarAuditoria() {
  var endpoint = AUD_ABA === 'historico' ? 'api/auditoria/listar.php' : 'api/auditoria/sistema.php';
  apiGet(endpoint + '?' + paramsFiltroAuditoria()).then(function (res) {
    TODOS_EVENTOS = res.items;
    renderAuditoria();
  }).catch(function (e) {
    G('audTbl').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro ao carregar: ' + esc(e.message) + '</p></div>';
  });
}

function renderAuditoria() {
  return AUD_ABA === 'historico' ? renderHistoricoProcessos() : renderAuditoriaSistema();
}

function renderHistoricoProcessos() {
  var pg = paginate(TODOS_EVENTOS, AUD_PG, AUD_PAGE_SIZE);
  G('audCountLabel').textContent = 'Histórico de Processos (' + TODOS_EVENTOS.length + ')';

  if (!pg.items.length) {
    G('audTbl').innerHTML = '<div class="empty"><i class="ti ti-file-off"></i><p>Sem registos para os filtros seleccionados</p></div>';
    fadeIn(G('audTbl'));
    return;
  }

  var rows = pg.items.map(function (a) {
    return '<tr>'
      + '<td class="tdd" style="white-space:nowrap">' + esc(a.data_evento) + '</td>'
      + '<td class="tdl" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:var(--blue)">' + esc(a.numero_processo) + '</td>'
      + '<td class="tdl">' + esc(a.descricao) + '</td>'
      + '<td><span class="badge b-type">' + esc(a.tipo_evento || '—') + '</span></td>'
      + '<td class="tdl">' + esc(a.utilizador || '—') + '</td>'
      + '<td class="tdl" style="font-size:11px">' + esc(a.ip_origem || '—') + '</td>'
      + '</tr>';
  }).join('');

  var cards = pg.items.map(function (a) {
    return '<div class="pc-card" style="padding:12px 14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">'
      + '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:var(--blue)">' + esc(a.numero_processo) + '</span>'
      + '<span class="badge b-type">' + esc(a.tipo_evento || '—') + '</span></div>'
      + '<div style="font-size:13px;margin-bottom:8px">' + esc(a.descricao) + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx2)">'
      + '<span>' + esc(a.utilizador || '—') + '</span><span>' + esc(a.data_evento) + '</span></div>'
      + '</div>';
  }).join('');

  G('audTbl').innerHTML = '<div class="tbl-outer"><table class="pt" style="min-width:0">'
    + '<thead><tr>'
    + '<th class="th0">Data/Hora</th><th>Processo</th><th>Descrição</th><th>Tipo</th><th>Utilizador</th><th>IP</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<div class="pc-list">' + cards + '</div>'
    + mkPager(pg, 'irParaPaginaAuditoria');
  fadeIn(G('audTbl'));
}

function renderAuditoriaSistema() {
  var pg = paginate(TODOS_EVENTOS, AUD_PG, AUD_PAGE_SIZE);
  G('audCountLabel').textContent = 'Auditoria do Sistema (' + TODOS_EVENTOS.length + ')';

  if (!pg.items.length) {
    G('audTbl').innerHTML = '<div class="empty"><i class="ti ti-file-off"></i><p>Sem registos para os filtros seleccionados</p></div>';
    fadeIn(G('audTbl'));
    return;
  }

  var rows = pg.items.map(function (a) {
    return '<tr>'
      + '<td class="tdd" style="white-space:nowrap">' + esc(a.criado_em) + '</td>'
      + '<td class="tdl">' + esc(a.mensagem) + '</td>'
      + '<td><span class="badge b-type">' + esc(a.tipo_evento || '—') + '</span></td>'
      + '<td class="tdl" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:var(--blue)">' + esc(a.codigo_evento || '—') + '</td>'
      + '<td class="tdl">' + esc(a.criado_por || '—') + '</td>'
      + '<td class="tdl" style="font-size:11px">' + esc(a.ip_origem || '—') + '</td>'
      + '</tr>';
  }).join('');

  var cards = pg.items.map(function (a) {
    return '<div class="pc-card" style="padding:12px 14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">'
      + '<code style="font-size:11px;color:var(--blue)">' + esc(a.codigo_evento || '—') + '</code>'
      + '<span class="badge b-type">' + esc(a.tipo_evento || '—') + '</span></div>'
      + '<div style="font-size:13px;margin-bottom:8px">' + esc(a.mensagem) + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx2)">'
      + '<span>' + esc(a.criado_por || '—') + '</span><span>' + esc(a.criado_em) + '</span></div>'
      + '</div>';
  }).join('');

  G('audTbl').innerHTML = '<div class="tbl-outer"><table class="pt" style="min-width:0">'
    + '<thead><tr>'
    + '<th class="th0">Criado em</th><th>Mensagem</th><th>Tipo</th><th>Código</th><th>Criado por</th><th>IP</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<div class="pc-list">' + cards + '</div>'
    + mkPager(pg, 'irParaPaginaAuditoria');
  fadeIn(G('audTbl'));
}

function irParaPaginaAuditoria(p) { AUD_PG = p; renderAuditoria(); }
