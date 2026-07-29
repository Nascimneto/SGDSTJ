/**
 * processo-form.js — formulários de criação (fase 1) e edição completa,
 * detalhe e eliminação de processos.
 */

var PROCESSO_ACTUAL = null;

/* ─── Formulário fase 1 — criação ─── */
function buildFormCriar() {
  var especies    = window.SGD_ESPECIES    || [];
  var estados     = window.SGD_ESTADOS     || [];
  var magistrados = window.SGD_MAGISTRADOS || [];
  var espOpts  = '<option value="">— Selecionar espécie —</option>'
    + especies.map(function (e) { return '<option>' + esc(e) + '</option>'; }).join('');
  var stOpts   = '<option value="">— Selecionar estado —</option>'
    + estados.map(function (e) { return '<option value="' + esc(e.codigo) + '">' + esc(e.label) + '</option>'; }).join('');
  var magOpts  = magistrados.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('');
  var distOpts = '<option value="">— Selecionar magistrado —</option>' + magOpts;
  var redistOpts = '<option value="">— Nenhuma —</option>' + magOpts;
  return '<div class="fsec">'
    + '<div class="fsec-t"><i class="ti ti-id" style="color:var(--blue)"></i> Identificação do Processo</div>'
    + '<div class="fg3-tight"><div class="fg"><label>N&ordm; de Registo</label><input readonly class="auto" value="Gerado automaticamente"></div>'
    + '<div class="fg"><label>Data de Registo</label><input readonly class="auto" value="' + nowPT() + '"></div>'
    + '<div class="fg"><label class="required">N&ordm; de Processo</label><input class="req" id="f_num_externo" placeholder="N&ordm; do processo..."></div></div>'
    + '<div class="fg2"><div class="fg"><label class="required">Data de Entrada</label><input class="req" type="date" id="f_data_entrada" value="' + hojeISO() + '"></div><div></div></div>'
    + '<div class="fg2"><div class="fg"><label class="required">Espécie de Processo</label><select class="req" id="f_esp">' + espOpts + '</select></div>'
    + '<div class="fg"><label>Origem</label><input id="f_orig" placeholder="Tribunal / Entidade..."></div></div>'
    + '<div class="fg"><label class="required">Intervenientes / Partes</label><input class="req" id="f_partes" placeholder="Ex: Autor vs Reu..."></div>'
    + '<div class="fg2"><div class="fg"><label class="required">Distribuição (Juiz/Relator)</label><select class="req" id="f_dist">' + distOpts + '</select></div>'
    + '<div class="fg"><label class="required">Data de Distribuição</label><input class="req" type="date" id="f_dist_data" value="' + hojeISO() + '"></div></div>'
    + '<div class="fg2"><div class="fg"><label>Redistribuição</label><select id="f_redist">' + redistOpts + '</select></div>'
    + '<div class="fg"><label class="required">Estado de Processo</label><select class="req" id="f_st">' + stOpts + '</select></div></div>'
    + '</div>'
    + '<div class="fsec"><div class="fsec-t"><i class="ti ti-notes" style="color:var(--green)"></i> Observações</div>'
    + '<div class="fg"><textarea id="f_obs" maxlength="1500" placeholder="Notas adicionais (máx. 1500 caracteres)..."></textarea></div></div>'
    + '<div class="ib blue"><i class="ti ti-info-circle" style="flex-shrink:0"></i> As datas de controlo processual (conclusão, vistos, tabela, acórdão...) ficam disponíveis depois, ao editar o processo.</div>';
}

/* ─── Formulário completo — edição ─── */
function buildFormEditar(p) {
  var especies    = window.SGD_ESPECIES    || [];
  var estados     = window.SGD_ESTADOS     || [];
  var magistrados = window.SGD_MAGISTRADOS || [];
  var espOpts  = especies.map(function (e) { return '<option ' + (p.especie === e ? 'selected' : '') + '>' + esc(e) + '</option>'; }).join('');
  var stOpts   = estados.map(function (e) { return '<option value="' + esc(e.codigo) + '" ' + (p.estado_codigo === e.codigo ? 'selected' : '') + '>' + esc(e.label) + '</option>'; }).join('');
  var magOpt   = function (m, actual) { return '<option ' + (actual === m ? 'selected' : '') + '>' + esc(m) + '</option>'; };
  var distOpts = '<option value="">— Selecionar magistrado —</option>' + magistrados.map(function (m) { return magOpt(m, p.distribuicao); }).join('');
  var redistOpts = '<option value="">— Nenhuma —</option>' + magistrados.map(function (m) { return magOpt(m, p.redistribuicao); }).join('');
  var iv = function (campo) { return p[campo] ? p2i(p[campo]) : ''; };

  var tabs = [
    { icon: 'ti-id', color: 'var(--blue)', label: '1. Identificação', html:
        '<div class="fg3"><div class="fg"><label>N&ordm; de Registo</label><input readonly class="auto" value="' + esc(p.numero_processo) + '"></div>'
      + '<div class="fg"><label>Data de Registo</label><input readonly class="auto" value="' + esc(p.data_registo) + '"></div>'
      + '<div class="fg"><label class="required">N&ordm; de Processo</label><input class="req" id="f_num_externo" value="' + esc(p.numero_processo_externo || '') + '" placeholder="N&ordm; do processo..."></div></div>'
      + '<div class="fg3"><div class="fg"><label class="required">Data de Entrada</label><input class="req" type="date" id="f_data_entrada" value="' + p2i(p.data_entrada) + '"></div>'
      + '<div class="fg"><label class="required">Espécie de Processo</label><select class="req" id="f_esp">' + espOpts + '</select></div>'
      + '<div class="fg"><label>Origem</label><input id="f_orig" value="' + esc(p.origem || '') + '"></div></div>'
      + '<div class="fg3"><div class="fg"><label class="required">Intervenientes / Partes</label><input class="req" id="f_partes" value="' + esc(p.partes || '') + '"></div>'
      + '<div class="fg"><label class="required">Estado de Processo</label><select class="req" id="f_st">' + stOpts + '</select></div></div>' },
    { icon: 'ti-user-check', color: 'var(--purple)', label: '2. Distribuição', html:
        '<div class="fg3"><div class="fg"><label class="required">Distribuição (Juiz/Relator)</label><select class="req" id="f_dist">' + distOpts + '</select></div>'
      + '<div class="fg"><label class="required">Data de Distribuição</label><input class="req" type="date" id="f_dist_data" value="' + (iv('distribuicao_data') || hojeISO()) + '"></div>'
      + '<div class="fg"><label>Redistribuição</label><select id="f_redist">' + redistOpts + '</select></div></div>'
      + '<div class="fg3"><div class="fg"><label>Data de Redistribuição</label><input type="date" id="f_redist_data" value="' + iv('redistribuicao_data') + '"></div></div>' },
    { icon: 'ti-bell', color: 'var(--amber)', label: '3. Notificações', html:
        '<div class="fg3"><div class="fg"><label>Notificacao / Citacao</label><input type="date" id="f_notif" value="' + iv('notificacao_citacao') + '"></div>'
      + '<div class="fg"><label>Notificacao 1</label><input type="date" id="f_notif1" value="' + iv('notificacao1') + '"></div>'
      + '<div class="fg"><label>Notificacao 2</label><input type="date" id="f_notif2" value="' + iv('notificacao2') + '"></div></div>' },
    { icon: 'ti-scale', color: 'var(--blue)', label: '4. Julgamento', html:
        '<div class="fg3"><div class="fg"><label>Conclusao</label><input type="date" id="f_conc" value="' + iv('conclusao') + '"></div>'
      + '<div class="fg"><label>Visto &mdash; Min. Publico</label><input type="date" id="f_vmp" value="' + iv('visto_mp') + '"></div>'
      + '<div class="fg"><label>Visto &mdash; Juiz Adj. 1</label><input type="date" id="f_va1" value="' + iv('visto_adjunto1') + '"></div></div>'
      + '<div class="fg3"><div class="fg"><label>Visto &mdash; Juiz Adj. 2</label><input type="date" id="f_va2" value="' + iv('visto_adjunto2') + '"></div></div>' },
    { icon: 'ti-book', color: 'var(--purple)', label: '5. Acórdãos', html:
        '<div class="fg3"><div class="fg"><label>Acordao</label><input type="date" id="f_acord" value="' + iv('acordao') + '"></div>'
      + '<div class="fg"><label>N&ordm; do Acordao</label><input id="f_acord_num" value="' + esc(p.numero_acordao || '') + '" placeholder="Ex: 123/2026..."></div>'
      + '<div class="fg"><label>2&ordm; Ac&oacute;rd&atilde;o</label><input type="date" id="f_acord2" value="' + iv('acordao2') + '"></div></div>'
      + '<div class="fg3"><div class="fg"><label>N&ordm; do 2&ordm; Acordao</label><input id="f_acord2_num" value="' + esc(p.numero_acordao2 || '') + '" placeholder="Ex: 123/2026..."></div>'
      + '<div class="fg"><label>3&ordm; Ac&oacute;rd&atilde;o</label><input type="date" id="f_acord3" value="' + iv('acordao3') + '"></div>'
      + '<div class="fg"><label>N&ordm; do 3&ordm; Acordao</label><input id="f_acord3_num" value="' + esc(p.numero_acordao3 || '') + '" placeholder="Ex: 123/2026..."></div></div>' },
    { icon: 'ti-bell-ringing', color: 'var(--amber)', label: '6. Notif. Acórdãos', html:
        '<div class="fg3"><div class="fg"><label>Notificacao do Acordao</label><input type="date" id="f_nacord" value="' + iv('notificacao_acordao') + '"></div>'
      + '<div class="fg"><label>Notificacao do 2&ordm; Acordao</label><input type="date" id="f_nacord2" value="' + iv('notificacao_acordao2') + '"></div>'
      + '<div class="fg"><label>Notificacao do 3&ordm; Acordao</label><input type="date" id="f_nacord3" value="' + iv('notificacao_acordao3') + '"></div></div>' },
    { icon: 'ti-cash', color: 'var(--green)', label: '7. Custas', html:
        '<div class="fg3"><div class="fg"><label>Conta e Custas</label><input type="date" id="f_custas" value="' + iv('conta_custas') + '"></div>'
      + '<div class="fg"><label>2&ordm; Conta e Custas</label><input type="date" id="f_custas2" value="' + iv('conta_custas2') + '"></div>'
      + '<div class="fg"><label>Notificacao de Conta e Custas</label><input type="date" id="f_ncustas" value="' + iv('notificacao_conta_custas') + '"></div></div>'
      + '<div class="fg3"><div class="fg"><label>Notificacao 2&ordm; Conta e Custas</label><input type="date" id="f_ncustas2" value="' + iv('notificacao_conta_custas2') + '"></div></div>' },
    { icon: 'ti-archive', color: 'var(--red)', label: '8. Encerramento', html:
        '<div class="fg3"><div class="fg"><label>Inscricao de Tabela</label><input type="date" id="f_tab" value="' + iv('inscricao_tabela') + '"></div>'
      + '<div class="fg"><label>Arquivamento</label><input type="date" id="f_arch" value="' + iv('arquivamento') + '"></div></div>'
      + '<div class="fg"><label>Observações</label><textarea id="f_obs" maxlength="1500" placeholder="Notas adicionais (máx. 1500 caracteres)...">' + esc(p.observacoes || '') + '</textarea></div>' }
  ];

  var nav = tabs.map(function (t, i) {
    return '<button type="button" class="ftab-btn' + (i === 0 ? ' active' : '') + '" data-ft="' + i + '" onclick="mostrarFTab(' + i + ')">'
      + '<i class="ti ' + t.icon + '" style="color:' + t.color + '"></i> ' + t.label + '</button>';
  }).join('');
  var panels = tabs.map(function (t, i) {
    return '<div class="ftab-panel' + (i === 0 ? ' active' : '') + '" data-ft="' + i + '">' + t.html + '</div>';
  }).join('');

  return '<div class="ftabs">' + nav + '</div>' + panels;
}

/* Troca de separador do formulário de Editar Processo — opera sobre #crudB
   porque só a edição (não a criação) tem etapas. */
function mostrarFTab(idx) {
  var root = G('crudB');
  if (!root) return;
  var btns   = root.querySelectorAll('.ftab-btn');
  var panels = root.querySelectorAll('.ftab-panel');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', i === idx);
    panels[i].classList.toggle('active', i === idx);
  }
}

/* ─── Codificação de cor dos campos (obrigatório / preenchido / data passada
   ou futura) — ver comentário em css/estilos.css junto às classes .req/
   .f-filled/.f-past/.f-future. Reage a input/change via delegação em #crudB,
   por isso funciona nos dois formulários (criar e editar) sem listeners por
   campo, incluindo campos ainda por existir (tabs trocadas dinamicamente). */
function sgdColorirCampo(el) {
  if (!el || el.classList.contains('auto')) return;
  var valor = (el.value || '').trim();
  el.classList.remove('f-filled', 'f-past', 'f-future');
  if (el.tagName === 'INPUT' && el.type === 'date') {
    if (valor && valor < hojeISO()) el.classList.add('f-past');
    else if (valor && valor > hojeISO()) el.classList.add('f-future');
  } else if (valor) {
    el.classList.add('f-filled');
  }
}

function sgdColorirFormulario(root) {
  if (!root) return;
  var els = root.querySelectorAll('.fg input, .fg select, .fg textarea');
  for (var i = 0; i < els.length; i++) sgdColorirCampo(els[i]);
}

['input', 'change'].forEach(function (evt) {
  document.addEventListener(evt, function (e) {
    if (e.target.closest && e.target.closest('#crudB')) sgdColorirCampo(e.target);
  });
});

/* ─── Abrir / fechar modal CRUD ─── */
function abrirCriar() {
  G('crudT').textContent = 'Registar Novo Processo';
  G('crudB').innerHTML = buildFormCriar();
  sgdColorirFormulario(G('crudB'));
  G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
    + '<button class="btn btn-primary" onclick="guardarCriar()"><i class="ti ti-device-floppy"></i> Registar Processo</button>';
  G('crudM').classList.add('open');
}

function abrirEditar(id) {
  apiGet('api/processos/obter.php?id=' + id).then(function (res) {
    var p = res.processo;
    G('crudT').textContent = 'Editar - ' + p.numero_processo;
    G('crudB').innerHTML = buildFormEditar(p);
    sgdColorirFormulario(G('crudB'));
    G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
      + '<button class="btn btn-primary" onclick="guardarEditar(' + id + ')"><i class="ti ti-device-floppy"></i> Guardar Alterações</button>';
    G('crudM').classList.add('open');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function closeCrud() { G('crudM').classList.remove('open'); }

function lerCamposComuns() {
  return {
    especie: GV('f_esp'),
    estado: GV('f_st'),
    origem: GV('f_orig').trim(),
    partes: GV('f_partes').trim(),
    distribuicao: GV('f_dist').trim(),
    distribuicao_data: GV('f_dist_data'),
    redistribuicao: GV('f_redist').trim(),
    numero_processo_externo: GV('f_num_externo').trim(),
    data_entrada: GV('f_data_entrada'),
    observacoes: GV('f_obs').trim()
  };
}

function guardarCriar() {
  var dados = lerCamposComuns();
  if (!dados.especie) { G('f_esp').classList.add('err-input'); showToast('Selecione a Espécie de Processo', 'ti-alert-circle', 'red'); return; }
  G('f_esp').classList.remove('err-input');
  if (!dados.partes) { G('f_partes').classList.add('err-input'); showToast('Preencha Intervenientes/Partes', 'ti-alert-circle', 'red'); return; }
  G('f_partes').classList.remove('err-input');
  if (!dados.numero_processo_externo) { G('f_num_externo').classList.add('err-input'); showToast('Preencha o Número de Processo', 'ti-alert-circle', 'red'); return; }
  G('f_num_externo').classList.remove('err-input');
  if (!dados.data_entrada) { G('f_data_entrada').classList.add('err-input'); showToast('Preencha a Data de Entrada', 'ti-alert-circle', 'red'); return; }
  G('f_data_entrada').classList.remove('err-input');
  if (!dados.distribuicao) { G('f_dist').classList.add('err-input'); showToast('Preencha a Distribuição (Juiz Relator)', 'ti-alert-circle', 'red'); return; }
  G('f_dist').classList.remove('err-input');
  if (!dados.distribuicao_data) { G('f_dist_data').classList.add('err-input'); showToast('Preencha a Data de Distribuição', 'ti-alert-circle', 'red'); return; }
  G('f_dist_data').classList.remove('err-input');
  if (!dados.estado) { G('f_st').classList.add('err-input'); showToast('Selecione o Estado do Processo', 'ti-alert-circle', 'red'); return; }
  G('f_st').classList.remove('err-input');

  apiPost('api/processos/criar.php', dados).then(function (res) {
    closeCrud();
    if (typeof recarregarProcessos === 'function') recarregarProcessos();
    showToast(res.numero_processo + ' registado com sucesso!', 'ti-circle-check');
  }).catch(function (e) {
    if (e.status === 409) G('f_esp').classList.add('err-input');
    showToast(e.message, 'ti-alert-circle', 'red');
  });
}

function guardarEditar(id) {
  var dados = lerCamposComuns();
  if (!dados.partes) { mostrarFTab(0); showToast('Preencha Intervenientes/Partes', 'ti-alert-circle', 'red'); return; }
  if (!dados.numero_processo_externo) { mostrarFTab(0); showToast('Preencha o Número de Processo', 'ti-alert-circle', 'red'); return; }
  if (!dados.data_entrada) { mostrarFTab(0); showToast('Preencha a Data de Entrada', 'ti-alert-circle', 'red'); return; }
  if (!dados.distribuicao) { mostrarFTab(1); G('f_dist').classList.add('err-input'); showToast('Preencha a Distribuição (Juiz Relator)', 'ti-alert-circle', 'red'); return; }
  G('f_dist').classList.remove('err-input');
  if (!dados.distribuicao_data) { mostrarFTab(1); G('f_dist_data').classList.add('err-input'); showToast('Preencha a Data de Distribuição', 'ti-alert-circle', 'red'); return; }
  G('f_dist_data').classList.remove('err-input');

  dados.id                  = id;
  dados.redistribuicao_data = GV('f_redist_data');
  dados.notificacao_citacao = GV('f_notif');
  dados.notificacao1        = GV('f_notif1');
  dados.notificacao2        = GV('f_notif2');
  dados.conclusao           = GV('f_conc');
  dados.visto_mp            = GV('f_vmp');
  dados.visto_adjunto1      = GV('f_va1');
  dados.visto_adjunto2      = GV('f_va2');
  dados.inscricao_tabela    = GV('f_tab');
  dados.acordao             = GV('f_acord');
  dados.numero_acordao      = GV('f_acord_num').trim();
  dados.acordao2            = GV('f_acord2');
  dados.numero_acordao2     = GV('f_acord2_num').trim();
  dados.acordao3            = GV('f_acord3');
  dados.numero_acordao3     = GV('f_acord3_num').trim();
  dados.notificacao_acordao  = GV('f_nacord');
  dados.notificacao_acordao2 = GV('f_nacord2');
  dados.notificacao_acordao3 = GV('f_nacord3');
  dados.conta_custas               = GV('f_custas');
  dados.conta_custas2              = GV('f_custas2');
  dados.notificacao_conta_custas   = GV('f_ncustas');
  dados.notificacao_conta_custas2  = GV('f_ncustas2');
  dados.arquivamento        = GV('f_arch');

  apiPost('api/processos/atualizar.php', dados).then(function () {
    closeCrud();
    if (typeof recarregarProcessos === 'function') recarregarProcessos();
    showToast('Processo actualizado!', 'ti-circle-check');
  }).catch(function (e) {
    if (e.status === 409) G('f_esp').classList.add('err-input');
    showToast(e.message, 'ti-alert-circle', 'red');
  });
}

/* ─── Detalhe ─── */
function abrirDetalhe(id) {
  apiGet('api/processos/obter.php?id=' + id).then(function (res) {
    var p = res.processo;
    PROCESSO_ACTUAL = p;

    G('detT').textContent = 'Processo ' + p.numero_processo;
    var dr = function (l, v) { return '<div class="dr"><span class="dr-l">' + l + '</span><span class="dr-v">' + v + '</span></div>'; };
    var dd = function (l, v, num) {
      var extra = (v && num) ? ' <span style="color:var(--tx3);font-weight:500">(n&ordm; ' + esc(num) + ')</span>' : '';
      return '<div class="dr"><span class="dr-l">' + l + '</span><span class="dr-v" style="display:flex;align-items:center;gap:5px">'
        + '<i class="ti ti-' + (v ? 'circle-check' : 'circle') + '" style="font-size:14px;color:' + (v ? 'var(--green)' : 'var(--tx3)') + '"></i>'
        + '<span style="color:' + (v ? 'var(--green)' : 'var(--tx3)') + '">' + (v ? esc(v) : 'Pendente') + '</span>' + extra + '</span></div>';
    };
    var estados = window.SGD_ESTADOS || [];
    var stOpts  = estados.map(function (e) { return '<option value="' + esc(e.codigo) + '" ' + (p.estado_codigo === e.codigo ? 'selected' : '') + '>' + esc(e.label) + '</option>'; }).join('');

    G('detB').innerHTML = '<div style="display:flex;gap:18px;flex-wrap:wrap">'
      + '<div style="flex:1.2;min-width:220px">'
      + '<div class="dsec bl">Identificacao</div>'
      + dr('N&ordm; Registo de Processo', '<span style="font-family:\'IBM Plex Mono\',monospace;font-weight:600;color:var(--blue)">' + esc(p.numero_processo) + '</span>')
      + dr('Data de Registo', esc(p.data_registo)) + dr('Data de Entrada', esc(p.data_entrada)) + dr('Especie', '<span class="badge b-type">' + esc(p.especie) + '</span>')
      + dr('Partes', esc(p.partes)) + dr('Origem', esc(p.origem || '—')) + dr('Distribuicao', esc(p.distribuicao || '—'))
      + dr('Data de Distribuicao', esc(p.distribuicao_data || '—'))
      + dr('Redistribuicao', esc(p.redistribuicao || '—'))
      + (p.numero_processo_externo ? dr('N&ordm; Processo', esc(p.numero_processo_externo)) : '')
      + dr('Estado', '<span class="badge ' + esc(p.estado_cor) + '">' + esc(p.estado) + '</span>')
      + '<div class="dsec am" style="margin-top:14px">Datas de Controlo</div>'
      + dd('Redistribuicao', p.redistribuicao_data)
      + dd('Notificacao/Citacao', p.notificacao_citacao) + dd('Notificacao 1', p.notificacao1) + dd('Notificacao 2', p.notificacao2) + dd('Conclusao', p.conclusao)
      + dd('Visto MP', p.visto_mp) + dd('Visto Adj.1', p.visto_adjunto1) + dd('Visto Adj.2', p.visto_adjunto2)
      + dd('Ins. Tabela', p.inscricao_tabela)
      + dd('Acordao', p.acordao, p.numero_acordao) + dd('2&ordm; Acordao', p.acordao2, p.numero_acordao2) + dd('3&ordm; Acordao', p.acordao3, p.numero_acordao3)
      + dd('Notif. Acordao', p.notificacao_acordao) + dd('Notif. 2&ordm; Acordao', p.notificacao_acordao2) + dd('Notif. 3&ordm; Acordao', p.notificacao_acordao3)
      + dd('Conta/Custas', p.conta_custas) + dd('2&ordm; Conta/Custas', p.conta_custas2)
      + dd('Notif. Conta/Custas', p.notificacao_conta_custas) + dd('Notif. 2&ordm; Conta/Custas', p.notificacao_conta_custas2)
      + dd('Arquivamento', p.arquivamento)
      + (p.observacoes ? '<div class="obs-box" style="margin-top:10px"><b>OBS:</b> ' + esc(p.observacoes) + '</div>' : '')
      + '</div>'
      + (podeEditar()
        ? '<div style="flex:1;min-width:200px">'
          + '<div class="fg"><label>Actualizar Estado</label>'
          + '<div style="display:flex;gap:8px"><select id="dt_st" style="flex:1;border:1.5px solid var(--border);border-radius:var(--rs);padding:8px;font-size:13px;font-family:inherit">' + stOpts + '</select>'
          + '<button class="btn btn-primary btn-sm" onclick="dtSt(' + id + ')"><i class="ti ti-check"></i></button></div></div>'
          + '</div>'
        : '')
      + '</div>';

    var delBtn = isAdm()
      ? '<button class="btn btn-danger" onclick="G(\'detM\').classList.remove(\'open\');delDoc(' + id + ',\'' + esc(p.numero_processo).replace(/'/g, "\\'") + '\')"><i class="ti ti-trash"></i> Eliminar</button>'
      : '';
    var editBtn = podeEditar()
      ? '<button class="btn" onclick="G(\'detM\').classList.remove(\'open\');abrirEditar(' + id + ')"><i class="ti ti-edit"></i> Editar</button>'
      : '';
    G('detF').innerHTML = '<button class="btn" onclick="G(\'detM\').classList.remove(\'open\')">Fechar</button>'
      + editBtn + delBtn;
    G('detM').classList.add('open');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function dtSt(id) {
  var s = GV('dt_st');
  if (!s || !PROCESSO_ACTUAL) return;
  apiPost('api/processos/atualizar.php', {
    id: id, estado: s,
    especie: PROCESSO_ACTUAL.especie, origem: PROCESSO_ACTUAL.origem,
    partes: PROCESSO_ACTUAL.partes, distribuicao: PROCESSO_ACTUAL.distribuicao,
    // Data de Distribuição passou a obrigatória no servidor — processos antigos, de
    // antes dessa regra, podem não a ter; sem este fallback, esta mudança rápida de
    // estado ficaria bloqueada por um campo que nem sequer está a ser editado aqui.
    distribuicao_data: p2i(PROCESSO_ACTUAL.distribuicao_data) || hojeISO(),
    redistribuicao: PROCESSO_ACTUAL.redistribuicao,
    observacoes: PROCESSO_ACTUAL.observacoes,
    numero_processo_externo: PROCESSO_ACTUAL.numero_processo_externo
  }).then(function () {
    G('detM').classList.remove('open');
    if (typeof recarregarProcessos === 'function') recarregarProcessos();
    showToast('Estado actualizado!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ─── Eliminar ─── */
function delDoc(id, numero) {
  cfDlg('Eliminar Processo', 'Eliminar permanentemente <b>' + esc(numero) + '</b>? Acção irreversível.', function () {
    apiPost('api/processos/eliminar.php', { id: id }).then(function () {
      if (typeof recarregarProcessos === 'function') recarregarProcessos();
      showToast(numero + ' eliminado.', 'ti-trash', 'red');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}
