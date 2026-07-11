/**
 * configuracoes.js — Dados Institucionais · Espécies · Estados · Perfis · Departamentos · Sistema
 */
var CFG_TAB  = 'institucional';
var CFG_GERAL = {};

var CFG_TABS = [
  { cod:'institucional', icon:'ti-building',           label:'Dados Institucionais' },
  { cod:'especies',      icon:'ti-folder',             label:'Espécies Processuais' },
  { cod:'estados',       icon:'ti-circle',             label:'Estados do Processo' },
  { cod:'perfis',        icon:'ti-users',              label:'Perfis de Utilizador' },
  { cod:'departamentos', icon:'ti-building-community', label:'Departamentos' },
  { cod:'sistema',       icon:'ti-shield-check',       label:'Sistema' },
];

document.addEventListener('DOMContentLoaded', function () {
  apiGet('api/configuracoes/obter.php').then(function (res) {
    CFG_GERAL = res.configuracoes || {};
    renderTabBar();
    carregarTab(CFG_TAB);
  }).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
});

/* ─── Tab bar ─── */
function renderTabBar() {
  var html = '<div class="no-print" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'
    + CFG_TABS.map(function (t) {
        return '<button id="cfgtab-' + t.cod + '" class="btn btn-sm' + (t.cod === CFG_TAB ? ' btn-primary' : '') + '">'
          + '<i class="ti ' + t.icon + '"></i> ' + t.label + '</button>';
      }).join('')
    + '</div><div id="cfgCorpo"></div>';
  G('content').innerHTML = html;

  CFG_TABS.forEach(function (t) {
    var btn = G('cfgtab-' + t.cod);
    if (!btn) return;
    btn.addEventListener('click', function () {
      CFG_TAB = t.cod;
      CFG_TABS.forEach(function (x) {
        var b = G('cfgtab-' + x.cod);
        if (b) b.className = 'btn btn-sm' + (x.cod === t.cod ? ' btn-primary' : '');
      });
      carregarTab(t.cod);
    });
  });
}

function carregarTab(tab) {
  var el = G('cfgCorpo');
  if (!el) return;
  el.innerHTML = '<div class="empty" style="padding:24px"><i class="ti ti-loader-2"></i></div>';

  if (tab === 'institucional') { renderInstitucional(); fadeIn(el); return; }
  if (tab === 'sistema')       { renderSistema(); fadeIn(el); return; }

  var api = { especies:      'api/configuracoes/especies-listar.php',
              estados:       'api/configuracoes/estados-listar.php',
              perfis:        'api/configuracoes/perfis-listar.php',
              departamentos: 'api/configuracoes/departamentos-listar.php' }[tab];

  apiGet(api).then(function (res) {
    if (tab === 'especies')      renderEspecies(res.especies || []);
    if (tab === 'estados')       renderEstados(res.estados   || []);
    if (tab === 'perfis')        renderPerfis(res.perfis     || []);
    if (tab === 'departamentos') renderDepartamentos(res.departamentos || []);
    fadeIn(el);
  }).catch(function (e) {
    G('cfgCorpo').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

/* ═══ Tab: Dados Institucionais ═══ */
function renderInstitucional() {
  var c = CFG_GERAL;
  G('cfgCorpo').innerHTML = '<div class="row2" style="flex-wrap:wrap;align-items:flex-start">'
    + '<div class="panel" style="padding:18px;flex:1;min-width:260px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:16px"><i class="ti ti-building" style="color:var(--blue)"></i> Identificação do Tribunal</div>'
    + '<div class="fg"><label>Nome do Tribunal</label><input id="cf_nome" value="' + esc(c.tribunal_nome || '') + '"></div>'
    + '<div class="fg"><label>Endereço</label><input id="cf_endereco" value="' + esc(c.tribunal_endereco || '') + '"></div>'
    + '<div class="fg"><label>Email Institucional</label><input id="cf_email" type="email" value="' + esc(c.tribunal_email || '') + '"></div>'
    + '<button class="btn btn-primary" onclick="guardarInstitucional()"><i class="ti ti-device-floppy"></i> Guardar</button>'
    + '</div>'
    + '<div class="panel" style="padding:18px;flex:1;min-width:260px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:16px"><i class="ti ti-list-numbers" style="color:var(--purple)"></i> Numeração de Processos</div>'
    + '<div class="fg"><label>Prefixo de Numeração</label><input id="cf_prefixo" value="' + esc(c.prefixo_numeracao || '') + '" style="max-width:120px" placeholder="ex: STJ"></div>'
    + '<div class="fg"><label>Processos por Página</label><input type="number" id="cf_pagina" value="' + esc(c.processos_pagina || '15') + '" min="5" max="100" style="max-width:90px"></div>'
    + '<div class="fg"><label>Conclusão por Página</label><input type="number" id="cf_pagina_conclusao" value="' + esc(c.conclusao_pagina || '15') + '" min="5" max="100" style="max-width:90px"></div>'
    + '<div class="fg"><label>Vistos por Página</label><input type="number" id="cf_pagina_vistos" value="' + esc(c.vistos_pagina || '15') + '" min="5" max="100" style="max-width:90px"></div>'
    + '<button class="btn btn-primary" onclick="guardarNumeracao()"><i class="ti ti-device-floppy"></i> Guardar</button>'
    + '</div></div>';
}

function guardarInstitucional() {
  apiPost('api/configuracoes/atualizar.php', {
    tribunal_nome: GV('cf_nome'), tribunal_endereco: GV('cf_endereco'), tribunal_email: GV('cf_email')
  }).then(function () {
    CFG_GERAL.tribunal_nome = GV('cf_nome');
    CFG_GERAL.tribunal_endereco = GV('cf_endereco');
    CFG_GERAL.tribunal_email = GV('cf_email');
    showToast('Dados institucionais guardados!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function guardarNumeracao() {
  apiPost('api/configuracoes/atualizar.php', {
    prefixo_numeracao: GV('cf_prefixo'), processos_pagina: GV('cf_pagina'),
    conclusao_pagina: GV('cf_pagina_conclusao'), vistos_pagina: GV('cf_pagina_vistos')
  }).then(function () {
    CFG_GERAL.prefixo_numeracao = GV('cf_prefixo');
    CFG_GERAL.processos_pagina = GV('cf_pagina');
    CFG_GERAL.conclusao_pagina = GV('cf_pagina_conclusao');
    CFG_GERAL.vistos_pagina = GV('cf_pagina_vistos');
    showToast('Numeração guardada!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ═══ Tab: Espécies Processuais ═══ */
function renderEspecies(especies) {
  var ativas   = especies.filter(function (e) { return +e.activo; }).length;
  var inativas = especies.length - ativas;

  var linhas = especies.map(function (e) {
    var activo = +e.activo;
    return '<tr id="esp-row-' + e.id + '" data-id="' + e.id + '" data-nome="' + esc(e.nome) + '">'
      + '<td style="padding:8px 12px">'
      + '<span class="esp-view">' + esc(e.nome) + '</span>'
      + '<input class="esp-edit" style="display:none;width:200px" value="' + esc(e.nome) + '">'
      + '</td>'
      + '<td style="padding:8px 12px;text-align:center">'
      + (activo
          ? '<span style="color:var(--green);font-size:12px;font-weight:500"><i class="ti ti-circle-check"></i> Activa</span>'
          : '<span style="color:var(--tx3);font-size:12px"><i class="ti ti-circle-x"></i> Inactiva</span>')
      + '</td>'
      + '<td style="padding:8px 12px;white-space:nowrap;display:flex;gap:4px">'
      + '<button class="btn btn-xs esp-btn-edit"   title="Editar nome" onclick="espEditar(' + e.id + ')"><i class="ti ti-pencil"></i></button>'
      + '<button class="btn btn-xs btn-primary esp-btn-save" style="display:none" title="Guardar" onclick="espGuardar(' + e.id + ')"><i class="ti ti-device-floppy"></i></button>'
      + '<button class="btn btn-xs esp-btn-cancel" style="display:none" title="Cancelar" onclick="espCancelar(' + e.id + ')"><i class="ti ti-x"></i></button>'
      + '<button class="btn btn-xs' + (activo ? '' : ' btn-success') + '" title="' + (activo ? 'Desactivar' : 'Activar') + '" onclick="espToggle(' + e.id + ')">'
      + '<i class="ti ' + (activo ? 'ti-eye-off' : 'ti-eye') + '"></i></button>'
      + '<button class="btn btn-xs btn-danger" title="Eliminar" onclick="espEliminar(' + e.id + ')"><i class="ti ti-trash"></i></button>'
      + '</td></tr>';
  }).join('');

  G('cfgCorpo').innerHTML = '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-folder" style="color:var(--blue)"></i> Total</div><div class="stat-num" style="color:var(--blue)">' + especies.length + '</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-check" style="color:var(--green)"></i> Activas</div><div class="stat-num" style="color:var(--green)">' + ativas + '</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-x" style="color:var(--tx3)"></i> Inactivas</div><div class="stat-num" style="color:var(--tx3)">' + inativas + '</div></div>'
    + '</div>'
    + '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-folder" style="color:var(--purple)"></i><span class="panel-title">Espécies Processuais</span>'
    + '<button class="btn btn-sm btn-primary no-print" style="margin-left:auto" onclick="espMostrarForm()"><i class="ti ti-plus"></i> Nova Espécie</button></div>'
    + '<div id="esp-nova-form" style="display:none;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bluel)">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<input id="esp-nova-nome" placeholder="Nome da nova espécie" style="flex:1;min-width:180px;max-width:280px">'
    + '<button class="btn btn-sm btn-primary" onclick="espCriar()"><i class="ti ti-plus"></i> Criar</button>'
    + '<button class="btn btn-sm" onclick="espOcultarForm()">Cancelar</button>'
    + '</div></div>'
    + '<div class="tbl-outer"><table class="cfg-t">'
    + '<thead><tr><th class="th0">Nome da Espécie</th><th style="text-align:center;width:100px">Estado</th><th style="width:150px">Acções</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="3" style="padding:14px;text-align:center;color:var(--tx3)">Sem espécies registadas.</td></tr>') + '</tbody>'
    + '</table></div></div>';
}

function espMostrarForm() {
  var f = G('esp-nova-form');
  if (f) { f.style.display = ''; G('esp-nova-nome').focus(); }
}
function espOcultarForm() {
  var f = G('esp-nova-form');
  if (f) { f.style.display = 'none'; G('esp-nova-nome').value = ''; }
}

function espCriar() {
  var nome = (G('esp-nova-nome').value || '').trim();
  if (!nome) { showToast('Escreva o nome da espécie', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/especies-criar.php', { nome: nome })
    .then(function () {
      showToast('Espécie criada!', 'ti-circle-check');
      carregarTab('especies');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function espEditar(id) {
  var row = G('esp-row-' + id);
  if (!row) return;
  row.querySelector('.esp-view').style.display = 'none';
  row.querySelector('.esp-edit').style.display = '';
  row.querySelector('.esp-btn-edit').style.display = 'none';
  row.querySelector('.esp-btn-save').style.display = '';
  row.querySelector('.esp-btn-cancel').style.display = '';
  row.querySelector('.esp-edit').focus();
}

function espCancelar(id) {
  var row = G('esp-row-' + id);
  if (!row) return;
  row.querySelector('.esp-edit').value = row.dataset.nome;
  row.querySelector('.esp-view').style.display = '';
  row.querySelector('.esp-edit').style.display = 'none';
  row.querySelector('.esp-btn-edit').style.display = '';
  row.querySelector('.esp-btn-save').style.display = 'none';
  row.querySelector('.esp-btn-cancel').style.display = 'none';
}

function espGuardar(id) {
  var row = G('esp-row-' + id);
  if (!row) return;
  var nome = (row.querySelector('.esp-edit').value || '').trim();
  if (!nome) { showToast('Nome não pode ser vazio', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/especies-atualizar.php', { id: id, nome: nome })
    .then(function () {
      row.querySelector('.esp-view').textContent = nome;
      row.dataset.nome = nome;
      espCancelar(id);
      showToast('Espécie actualizada!', 'ti-circle-check');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function espToggle(id) {
  apiPost('api/configuracoes/especies-toggle.php', { id: id })
    .then(function () { carregarTab('especies'); })
    .catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function espEliminar(id) {
  cfDlg('Eliminar Espécie', 'Esta acção é irreversível. Só é possível eliminar espécies sem processos associados.', function () {
    apiPost('api/configuracoes/especies-eliminar.php', { id: id })
      .then(function () {
        showToast('Espécie eliminada!', 'ti-circle-check');
        carregarTab('especies');
      }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}

/* ═══ Tab: Estados do Processo ═══ */
/* Estados de origem (entry/concluded/archived) têm regras de negócio
 * próprias no resto da aplicação — só os estados criados manualmente pelo
 * botão "Novo Estado" podem ser eliminados. */
var EST_ORIGEM = ['entry', 'analysis', 'distributed', 'concluded', 'archived'];

function renderEstados(estados) {
  var linhas = estados.map(function (e) {
    var podeEliminar = EST_ORIGEM.indexOf(e.codigo) === -1;
    return '<tr id="est-row-' + e.id + '" data-id="' + e.id + '" data-label="' + esc(e.label) + '">'
      + '<td style="padding:8px 12px;font-family:var(--mono,monospace);font-size:11px;color:var(--tx3);font-weight:600">' + esc(e.codigo) + '</td>'
      + '<td style="padding:8px 12px"><span class="badge b-' + esc(e.codigo) + '">' + esc(e.label) + '</span></td>'
      + '<td style="padding:8px 12px">'
      + '<span class="est-view">' + esc(e.label) + '</span>'
      + '<input class="est-edit" style="display:none;width:200px" value="' + esc(e.label) + '">'
      + '</td>'
      + '<td style="padding:8px 12px;white-space:nowrap;display:flex;gap:4px">'
      + '<button class="btn btn-xs est-btn-edit" title="Editar etiqueta" onclick="estEditar(' + e.id + ')"><i class="ti ti-pencil"></i></button>'
      + '<button class="btn btn-xs btn-primary est-btn-save" style="display:none" onclick="estGuardar(' + e.id + ')"><i class="ti ti-device-floppy"></i></button>'
      + '<button class="btn btn-xs est-btn-cancel" style="display:none" onclick="estCancelar(' + e.id + ')"><i class="ti ti-x"></i></button>'
      + (podeEliminar ? '<button class="btn btn-xs btn-danger" title="Eliminar" onclick="estEliminar(' + e.id + ')"><i class="ti ti-trash"></i></button>' : '')
      + '</td></tr>';
  }).join('');

  G('cfgCorpo').innerHTML = '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-circle" style="color:var(--blue)"></i><span class="panel-title">Estados do Processo</span>'
    + '<button class="btn btn-sm btn-primary no-print" style="margin-left:auto" onclick="estMostrarForm()"><i class="ti ti-plus"></i> Novo Estado</button></div>'
    + '<div id="est-nova-form" style="display:none;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bluel)">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<input id="est-nova-label" placeholder="Etiqueta do novo estado (ex: Em Revisão)" style="flex:1;min-width:180px;max-width:280px">'
    + '<button class="btn btn-sm btn-primary" onclick="estCriar()"><i class="ti ti-plus"></i> Criar</button>'
    + '<button class="btn btn-sm" onclick="estOcultarForm()">Cancelar</button>'
    + '</div></div>'
    + '<div class="tbl-outer"><table class="cfg-t">'
    + '<thead><tr><th style="width:120px">Código</th><th style="width:120px">Badge actual</th><th class="th0">Etiqueta</th><th style="width:130px">Acções</th></tr></thead>'
    + '<tbody>' + linhas + '</tbody>'
    + '</table></div></div>'
    + '<div class="ib amber" style="margin-top:10px"><i class="ti ti-info-circle" style="font-size:14px;flex-shrink:0"></i>'
    + 'Os estados definem o fluxo processual. Pode alterar a etiqueta de apresentação de qualquer estado e adicionar novos estados intermédios; '
    + 'os estados de origem (Entrada, Concluído, Arquivado, etc.) não podem ser eliminados.</div>';
}

function estMostrarForm() {
  var f = G('est-nova-form');
  if (f) { f.style.display = ''; G('est-nova-label').focus(); }
}
function estOcultarForm() {
  var f = G('est-nova-form');
  if (f) { f.style.display = 'none'; G('est-nova-label').value = ''; }
}

function estCriar() {
  var label = (G('est-nova-label').value || '').trim();
  if (!label) { showToast('Escreva a etiqueta do novo estado', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/estados-criar.php', { label: label })
    .then(function () {
      showToast('Estado criado!', 'ti-circle-check');
      carregarTab('estados');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function estEliminar(id) {
  cfDlg('Eliminar Estado', 'Esta acção é irreversível. Só é possível eliminar estados sem processos associados.', function () {
    apiPost('api/configuracoes/estados-eliminar.php', { id: id })
      .then(function () {
        showToast('Estado eliminado!', 'ti-circle-check');
        carregarTab('estados');
      }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}

function estEditar(id) {
  var row = G('est-row-' + id);
  if (!row) return;
  row.querySelector('.est-view').style.display = 'none';
  row.querySelector('.est-edit').style.display = '';
  row.querySelector('.est-btn-edit').style.display = 'none';
  row.querySelector('.est-btn-save').style.display = '';
  row.querySelector('.est-btn-cancel').style.display = '';
  row.querySelector('.est-edit').focus();
}

function estCancelar(id) {
  var row = G('est-row-' + id);
  if (!row) return;
  row.querySelector('.est-edit').value = row.dataset.label;
  row.querySelector('.est-view').style.display = '';
  row.querySelector('.est-edit').style.display = 'none';
  row.querySelector('.est-btn-edit').style.display = '';
  row.querySelector('.est-btn-save').style.display = 'none';
  row.querySelector('.est-btn-cancel').style.display = 'none';
}

function estGuardar(id) {
  var row = G('est-row-' + id);
  if (!row) return;
  var label = (row.querySelector('.est-edit').value || '').trim();
  if (!label) { showToast('A etiqueta não pode ser vazia', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/estados-atualizar.php', { id: id, label: label })
    .then(function () {
      row.querySelector('.est-view').textContent = label;
      row.querySelector('.est-edit').value = label;
      row.dataset.label = label;
      estCancelar(id);
      showToast('Estado actualizado!', 'ti-circle-check');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ═══ Tab: Perfis de Utilizador ═══ */
function renderPerfis(perfis) {
  var linhas = perfis.map(function (p) {
    var badges = [];
    if (+p.pode_criar_utilizadores) badges.push('<span style="font-size:10px;background:var(--bluel);color:var(--blue);padding:2px 7px;border-radius:10px;font-weight:600">Criar utilizadores</span>');
    if (+p.pode_eliminar_processos) badges.push('<span style="font-size:10px;background:var(--redl);color:var(--red);padding:2px 7px;border-radius:10px;font-weight:600">Eliminar processos</span>');
    if (+p.pode_gerir_sistema)      badges.push('<span style="font-size:10px;background:var(--amberl);color:var(--amber);padding:2px 7px;border-radius:10px;font-weight:600">Gerir sistema</span>');

    return '<tr id="perf-row-' + p.id + '" data-id="' + p.id + '" data-desc="' + esc(p.descricao) + '">'
      + '<td style="padding:10px 12px;font-weight:700;font-size:13px">' + esc(p.codigo) + '</td>'
      + '<td style="padding:10px 12px">'
      + '<span class="perf-view" style="font-size:12px;color:var(--tx2)">' + esc(p.descricao) + '</span>'
      + '<input class="perf-edit" style="display:none;width:280px;font-size:12px" value="' + esc(p.descricao) + '">'
      + '</td>'
      + '<td style="padding:10px 12px"><div style="display:flex;gap:4px;flex-wrap:wrap">' + (badges.join(' ') || '<span style="font-size:11px;color:var(--tx3)">—</span>') + '</div></td>'
      + '<td style="padding:10px 12px;white-space:nowrap;display:flex;gap:4px">'
      + '<button class="btn btn-xs perf-btn-edit" title="Editar descrição" onclick="perfEditar(' + p.id + ')"><i class="ti ti-pencil"></i></button>'
      + '<button class="btn btn-xs btn-primary perf-btn-save" style="display:none" onclick="perfGuardar(' + p.id + ')"><i class="ti ti-device-floppy"></i></button>'
      + '<button class="btn btn-xs perf-btn-cancel" style="display:none" onclick="perfCancelar(' + p.id + ')"><i class="ti ti-x"></i></button>'
      + '</td></tr>';
  }).join('');

  G('cfgCorpo').innerHTML = '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-users" style="color:var(--blue)"></i><span class="panel-title">Perfis de Utilizador</span>'
    + '<span style="margin-left:auto;font-size:11px;color:var(--tx3)">O código é fixo — só a descrição é editável.</span></div>'
    + '<div class="tbl-outer"><table class="cfg-t">'
    + '<thead><tr><th style="width:130px">Código</th><th class="th0">Descrição</th><th>Permissões especiais</th><th style="width:90px">Acções</th></tr></thead>'
    + '<tbody>' + linhas + '</tbody>'
    + '</table></div></div>';
}

function perfEditar(id) {
  var row = G('perf-row-' + id);
  if (!row) return;
  row.querySelector('.perf-view').style.display = 'none';
  row.querySelector('.perf-edit').style.display = '';
  row.querySelector('.perf-btn-edit').style.display = 'none';
  row.querySelector('.perf-btn-save').style.display = '';
  row.querySelector('.perf-btn-cancel').style.display = '';
  row.querySelector('.perf-edit').focus();
}

function perfCancelar(id) {
  var row = G('perf-row-' + id);
  if (!row) return;
  row.querySelector('.perf-edit').value = row.dataset.desc;
  row.querySelector('.perf-view').style.display = '';
  row.querySelector('.perf-edit').style.display = 'none';
  row.querySelector('.perf-btn-edit').style.display = '';
  row.querySelector('.perf-btn-save').style.display = 'none';
  row.querySelector('.perf-btn-cancel').style.display = 'none';
}

function perfGuardar(id) {
  var row = G('perf-row-' + id);
  if (!row) return;
  var desc = (row.querySelector('.perf-edit').value || '').trim();
  apiPost('api/configuracoes/perfis-atualizar.php', { id: id, descricao: desc })
    .then(function () {
      row.querySelector('.perf-view').textContent = desc;
      row.dataset.desc = desc;
      perfCancelar(id);
      showToast('Perfil actualizado!', 'ti-circle-check');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ═══ Tab: Departamentos ═══ */
function renderDepartamentos(depts) {
  var ativos   = depts.filter(function (d) { return +d.activo; }).length;
  var inativos = depts.length - ativos;

  var linhas = depts.map(function (d) {
    var activo = +d.activo;
    return '<tr id="dep-row-' + d.id + '" data-id="' + d.id + '" data-nome="' + esc(d.nome) + '" data-sigla="' + esc(d.sigla || '') + '">'
      + '<td style="padding:8px 12px">'
      + '<span class="dep-view-nome">' + esc(d.nome) + '</span>'
      + '<input class="dep-edit-nome" style="display:none;width:180px" value="' + esc(d.nome) + '">'
      + '</td>'
      + '<td style="padding:8px 12px">'
      + '<span class="dep-view-sigla" style="font-family:var(--mono,monospace);font-size:11px;color:var(--tx3);font-weight:700">' + esc(d.sigla || '—') + '</span>'
      + '<input class="dep-edit-sigla" style="display:none;width:70px;text-transform:uppercase" maxlength="10" value="' + esc(d.sigla || '') + '">'
      + '</td>'
      + '<td style="padding:8px 12px;text-align:center">'
      + (activo
          ? '<span style="color:var(--green);font-size:12px;font-weight:500"><i class="ti ti-circle-check"></i> Activo</span>'
          : '<span style="color:var(--tx3);font-size:12px"><i class="ti ti-circle-x"></i> Inactivo</span>')
      + '</td>'
      + '<td style="padding:8px 12px;text-align:center;font-size:12px;color:var(--tx2)">' + (+d.total_utilizadores || '—') + '</td>'
      + '<td style="padding:8px 12px;white-space:nowrap;display:flex;gap:4px">'
      + '<button class="btn btn-xs dep-btn-edit"   title="Editar" onclick="depEditar(' + d.id + ')"><i class="ti ti-pencil"></i></button>'
      + '<button class="btn btn-xs btn-primary dep-btn-save" style="display:none" onclick="depGuardar(' + d.id + ')"><i class="ti ti-device-floppy"></i></button>'
      + '<button class="btn btn-xs dep-btn-cancel" style="display:none" onclick="depCancelar(' + d.id + ')"><i class="ti ti-x"></i></button>'
      + '<button class="btn btn-xs' + (activo ? '' : ' btn-success') + '" title="' + (activo ? 'Desactivar' : 'Activar') + '" onclick="depToggle(' + d.id + ')">'
      + '<i class="ti ' + (activo ? 'ti-eye-off' : 'ti-eye') + '"></i></button>'
      + '<button class="btn btn-xs btn-danger" title="Eliminar" onclick="depEliminar(' + d.id + ')"><i class="ti ti-trash"></i></button>'
      + '</td></tr>';
  }).join('');

  G('cfgCorpo').innerHTML = '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-building-community" style="color:var(--blue)"></i> Total</div><div class="stat-num" style="color:var(--blue)">' + depts.length + '</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-check" style="color:var(--green)"></i> Activos</div><div class="stat-num" style="color:var(--green)">' + ativos + '</div></div>'
    + '<div class="stat"><div class="stat-lbl"><i class="ti ti-circle-x" style="color:var(--tx3)"></i> Inactivos</div><div class="stat-num" style="color:var(--tx3)">' + inativos + '</div></div>'
    + '</div>'
    + '<div class="panel" style="padding:0">'
    + '<div class="panel-hd"><i class="ti ti-building-community" style="color:var(--purple)"></i><span class="panel-title">Departamentos / Secções</span>'
    + '<button class="btn btn-sm btn-primary no-print" style="margin-left:auto" onclick="depMostrarForm()"><i class="ti ti-plus"></i> Novo Departamento</button></div>'
    + '<div id="dep-nova-form" style="display:none;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bluel)">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<input id="dep-nova-nome" placeholder="Nome do departamento" style="flex:1;min-width:180px;max-width:260px">'
    + '<input id="dep-nova-sigla" placeholder="Sigla (ex: SEC)" maxlength="10" style="width:90px;text-transform:uppercase">'
    + '<button class="btn btn-sm btn-primary" onclick="depCriar()"><i class="ti ti-plus"></i> Criar</button>'
    + '<button class="btn btn-sm" onclick="depOcultarForm()">Cancelar</button>'
    + '</div></div>'
    + '<div class="tbl-outer"><table class="cfg-t">'
    + '<thead><tr><th class="th0">Nome</th><th style="width:80px">Sigla</th><th style="text-align:center;width:90px">Estado</th><th style="text-align:center;width:90px">Utilizadores</th><th style="width:150px">Acções</th></tr></thead>'
    + '<tbody>' + (linhas || '<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--tx3)">Sem departamentos registados.</td></tr>') + '</tbody>'
    + '</table></div></div>';
}

function depMostrarForm() {
  var f = G('dep-nova-form');
  if (f) { f.style.display = ''; G('dep-nova-nome').focus(); }
}
function depOcultarForm() {
  var f = G('dep-nova-form');
  if (f) { f.style.display = 'none'; G('dep-nova-nome').value = ''; G('dep-nova-sigla').value = ''; }
}

function depCriar() {
  var nome  = (G('dep-nova-nome').value || '').trim();
  var sigla = (G('dep-nova-sigla').value || '').trim().toUpperCase();
  if (!nome) { showToast('Escreva o nome do departamento', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/departamentos-criar.php', { nome: nome, sigla: sigla })
    .then(function () {
      showToast('Departamento criado!', 'ti-circle-check');
      carregarTab('departamentos');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function depEditar(id) {
  var row = G('dep-row-' + id);
  if (!row) return;
  row.querySelector('.dep-view-nome').style.display = 'none';
  row.querySelector('.dep-edit-nome').style.display = '';
  row.querySelector('.dep-view-sigla').style.display = 'none';
  row.querySelector('.dep-edit-sigla').style.display = '';
  row.querySelector('.dep-btn-edit').style.display = 'none';
  row.querySelector('.dep-btn-save').style.display = '';
  row.querySelector('.dep-btn-cancel').style.display = '';
  row.querySelector('.dep-edit-nome').focus();
}

function depCancelar(id) {
  var row = G('dep-row-' + id);
  if (!row) return;
  row.querySelector('.dep-edit-nome').value  = row.dataset.nome;
  row.querySelector('.dep-edit-sigla').value = row.dataset.sigla;
  row.querySelector('.dep-view-nome').style.display  = '';
  row.querySelector('.dep-edit-nome').style.display  = 'none';
  row.querySelector('.dep-view-sigla').style.display = '';
  row.querySelector('.dep-edit-sigla').style.display = 'none';
  row.querySelector('.dep-btn-edit').style.display   = '';
  row.querySelector('.dep-btn-save').style.display   = 'none';
  row.querySelector('.dep-btn-cancel').style.display = 'none';
}

function depGuardar(id) {
  var row = G('dep-row-' + id);
  if (!row) return;
  var nome  = (row.querySelector('.dep-edit-nome').value  || '').trim();
  var sigla = (row.querySelector('.dep-edit-sigla').value || '').trim().toUpperCase();
  if (!nome) { showToast('Nome não pode ser vazio', 'ti-alert-circle', 'red'); return; }
  apiPost('api/configuracoes/departamentos-atualizar.php', { id: id, nome: nome, sigla: sigla })
    .then(function () {
      row.querySelector('.dep-view-nome').textContent  = nome;
      row.querySelector('.dep-view-sigla').textContent = sigla || '—';
      row.dataset.nome  = nome;
      row.dataset.sigla = sigla;
      depCancelar(id);
      showToast('Departamento actualizado!', 'ti-circle-check');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function depToggle(id) {
  apiPost('api/configuracoes/departamentos-toggle.php', { id: id })
    .then(function () { carregarTab('departamentos'); })
    .catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function depEliminar(id) {
  cfDlg('Eliminar Departamento', 'Esta acção é irreversível. Só é possível eliminar departamentos sem utilizadores associados.', function () {
    apiPost('api/configuracoes/departamentos-eliminar.php', { id: id })
      .then(function () {
        showToast('Departamento eliminado!', 'ti-circle-check');
        carregarTab('departamentos');
      }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}

/* ═══ Tab: Sistema ═══ */
function renderSistema() {
  var c = CFG_GERAL;
  G('cfgCorpo').innerHTML = '<div class="row2" style="flex-wrap:wrap;align-items:flex-start">'
    + '<div class="panel" style="padding:18px;flex:1;min-width:260px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:14px"><i class="ti ti-shield-check" style="color:var(--green)"></i> Segurança</div>'
    + '<div class="fg"><label>Sessão expira (min)</label><input type="number" id="cf_sessao" value="' + esc(c.sessao_expira_min || '60') + '" min="5" max="480" style="max-width:90px"></div>'
    + '<div class="fg"><label>Tentativas de login</label><input type="number" id="cf_tentativas" value="' + esc(c.max_tentativas_login || '5') + '" min="1" max="20" style="max-width:90px"></div>'
    + '<div class="fg"><label>Bloqueio após falhas (min)</label><input type="number" id="cf_bloqueio" value="' + esc(c.bloqueio_min || '15') + '" min="1" max="120" style="max-width:90px"></div>'
    + '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:14px"><input type="checkbox" id="cf_auditoria" ' + (c.registo_auditoria === '1' ? 'checked' : '') + ' style="width:15px;height:15px"> Registo de auditoria activo</label>'
    + '<button class="btn btn-primary" onclick="guardarSistema()"><i class="ti ti-device-floppy"></i> Guardar</button>'
    + '</div>'
    + '<div class="panel" style="padding:18px;flex:1;min-width:260px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-database" style="color:var(--amber)"></i> Exportação de Dados</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
    + '<button class="btn" onclick="exportarProcessosCSV()"><i class="ti ti-download"></i> Exportar todos os Processos (CSV)</button>'
    + '</div></div>'
    + '</div>';
}

function guardarSistema() {
  var dados = {
    sessao_expira_min:   GV('cf_sessao'),
    max_tentativas_login: GV('cf_tentativas'),
    bloqueio_min:        GV('cf_bloqueio'),
    registo_auditoria:   G('cf_auditoria').checked ? '1' : '0'
  };
  apiPost('api/configuracoes/atualizar.php', dados).then(function () {
    Object.assign(CFG_GERAL, dados);
    showToast('Configurações de segurança guardadas!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ─── Exportar CSV ─── */
function csvEsc(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function exportarProcessosCSV() {
  apiGet('api/processos/listar.php').then(function (res) {
    var H = ['N Registo', 'N Processo', 'Data Entrada', 'Espécie', 'Partes', 'Distribuição', 'Origem',
      'Data Redistribuição', 'Conclusão', 'Notif/Citação', 'Notif. 1', 'Notif. 2', 'Visto MP', 'Visto Adj1', 'Visto Adj2',
      'Ins. Tabela', 'Acórdão', '2º Acórdão', '3º Acórdão', 'Notif. Acórdão', 'Conta Custas', '2º Conta Custas', 'Arquivamento', 'Estado'];
    var R = res.items.map(function (d) {
      return [d.numero_processo, d.numero_processo_externo || '', d.data_entrada, d.especie, d.partes,
        d.distribuicao, d.origem, d.redistribuicao_data, d.conclusao, d.notificacao_citacao, d.notificacao1, d.notificacao2, d.visto_mp, d.visto_adjunto1, d.visto_adjunto2,
        d.inscricao_tabela, d.acordao, d.acordao2, d.acordao3, d.notificacao_acordao, d.conta_custas, d.conta_custas2, d.arquivamento, d.estado].map(csvEsc);
    });
    var csv = [H.map(csvEsc)].concat(R).map(function (r) { return r.join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = 'SGD_Processos.csv';
    a.click();
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}
