/**
 * processo-form.js — formulários de criação (fase 1) e edição completa,
 * detalhe e eliminação de processos.
 */

var PROCESSO_ACTUAL = null;

/* ─── Formulário fase 1 — criação ─── */
function buildFormCriar() {
  var especies = window.SGD_ESPECIES || [];
  var espOpts = especies.map(function (e) { return '<option>' + esc(e) + '</option>'; }).join('');
  return '<div class="fsec">'
    + '<div class="fsec-t"><i class="ti ti-id" style="color:var(--blue)"></i> Identificação do Processo</div>'
    + '<div class="fg2"><div class="fg"><label>N&ordm; de Registo de Processo</label><input readonly class="auto" value="Gerado automaticamente"></div>'
    + '<div class="fg"><label>Data de Registo</label><input readonly class="auto" value="' + nowPT() + '"></div></div>'
    + '<div class="fg"><label>N&ordm; de Processo</label><input id="f_num_externo" placeholder="N&ordm; do processo (ex: do tribunal de origem)..."></div>'
    + '<div class="fg2"><div class="fg"><label class="required">Espécie de Processo</label><select id="f_esp">' + espOpts + '</select></div>'
    + '<div class="fg"><label class="required">Origem</label><input id="f_orig" placeholder="Tribunal / Entidade..."></div></div>'
    + '<div class="fg"><label class="required">Intervenientes / Partes</label><input id="f_partes" placeholder="Ex: Autor vs Reu..."></div>'
    + '<div class="fg"><label>Distribuição (Juiz/Relator)</label><input id="f_dist" placeholder="Nome do magistrado..."></div>'
    + '</div>'
    + '<div class="ib blue"><i class="ti ti-info-circle" style="flex-shrink:0"></i> As datas de controlo processual (conclusão, vistos, tabela, acórdão...) ficam disponíveis depois, ao editar o processo.</div>';
}

/* ─── Formulário completo — edição ─── */
function buildFormEditar(p) {
  var especies = window.SGD_ESPECIES || [];
  var estados  = window.SGD_ESTADOS || [];
  var espOpts  = especies.map(function (e) { return '<option ' + (p.especie === e ? 'selected' : '') + '>' + esc(e) + '</option>'; }).join('');
  var stOpts   = estados.map(function (e) { return '<option value="' + esc(e.codigo) + '" ' + (p.estado_codigo === e.codigo ? 'selected' : '') + '>' + esc(e.label) + '</option>'; }).join('');
  var iv = function (campo) { return p[campo] ? p2i(p[campo]) : ''; };

  return '<div class="fsec">'
    + '<div class="fsec-t"><i class="ti ti-id" style="color:var(--blue)"></i> Identificação do Processo</div>'
    + '<div class="fg2"><div class="fg"><label>N&ordm; de Registo de Processo</label><input readonly class="auto" value="' + esc(p.numero_processo) + '"></div>'
    + '<div class="fg"><label>Data de Registo</label><input readonly class="auto" value="' + esc(p.data_registo) + '"></div></div>'
    + '<div class="fg"><label>N&ordm; de Processo</label><input id="f_num_externo" value="' + esc(p.numero_processo_externo || '') + '" placeholder="N&ordm; do processo (ex: do tribunal de origem)..."></div>'
    + '<div class="fg2"><div class="fg"><label class="required">Espécie de Processo</label><select id="f_esp">' + espOpts + '</select></div>'
    + '<div class="fg"><label class="required">Origem</label><input id="f_orig" value="' + esc(p.origem || '') + '"></div></div>'
    + '<div class="fg"><label class="required">Intervenientes / Partes</label><input id="f_partes" value="' + esc(p.partes || '') + '"></div>'
    + '<div class="fg2"><div class="fg"><label>Distribuição (Juiz/Relator)</label><input id="f_dist" value="' + esc(p.distribuicao || '') + '"></div>'
    + '<div class="fg"><label>Estado</label><select id="f_st">' + stOpts + '</select></div></div>'
    + '</div>'
    + '<div class="fsec"><div class="fsec-t"><i class="ti ti-calendar-event" style="color:var(--amber)"></i> Datas de Controlo Processual</div>'
    + '<div class="fg2"><div class="fg"><label>Notificacao / Citacao</label><input type="date" id="f_notif" value="' + iv('notificacao_citacao') + '"></div>'
    + '<div class="fg"><label>Conclusao</label><input type="date" id="f_conc" value="' + iv('conclusao') + '"></div></div>'
    + '<div class="fg3"><div class="fg"><label>Visto &mdash; Min. Publico</label><input type="date" id="f_vmp" value="' + iv('visto_mp') + '"></div>'
    + '<div class="fg"><label>Visto &mdash; Juiz Adj. 1</label><input type="date" id="f_va1" value="' + iv('visto_adjunto1') + '"></div>'
    + '<div class="fg"><label>Visto &mdash; Juiz Adj. 2</label><input type="date" id="f_va2" value="' + iv('visto_adjunto2') + '"></div></div>'
    + '<div class="fg2"><div class="fg"><label>Inscricao de Tabela</label><input type="date" id="f_tab" value="' + iv('inscricao_tabela') + '"></div>'
    + '<div class="fg"><label>Acordao</label><input type="date" id="f_acord" value="' + iv('acordao') + '"></div></div>'
    + '<div class="fg2"><div class="fg"><label>Notificacao do Acordao</label><input type="date" id="f_nacord" value="' + iv('notificacao_acordao') + '"></div>'
    + '<div class="fg"><label>Conta e Custas</label><input type="date" id="f_custas" value="' + iv('conta_custas') + '"></div></div>'
    + '<div class="fg2"><div class="fg"><label>Arquivamento</label><input type="date" id="f_arch" value="' + iv('arquivamento') + '"></div><div></div></div></div>'
    + '<div class="fsec"><div class="fsec-t"><i class="ti ti-notes" style="color:var(--green)"></i> Observações</div>'
    + '<div class="fg"><textarea id="f_obs" placeholder="Notas adicionais...">' + esc(p.observacoes || '') + '</textarea></div></div>';
}

/* ─── Abrir / fechar modal CRUD ─── */
function abrirCriar() {
  G('crudT').textContent = 'Registar Novo Processo';
  G('crudB').innerHTML = buildFormCriar();
  G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
    + '<button class="btn btn-primary" onclick="guardarCriar()"><i class="ti ti-device-floppy"></i> Registar Processo</button>';
  G('crudM').classList.add('open');
}

function abrirEditar(id) {
  apiGet('api/processos/obter.php?id=' + id).then(function (res) {
    var p = res.processo;
    G('crudT').textContent = 'Editar - ' + p.numero_processo;
    G('crudB').innerHTML = buildFormEditar(p);
    G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
      + '<button class="btn btn-primary" onclick="guardarEditar(' + id + ')"><i class="ti ti-device-floppy"></i> Guardar Alterações</button>';
    G('crudM').classList.add('open');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function closeCrud() { G('crudM').classList.remove('open'); }

function lerCamposComuns() {
  return {
    especie: GV('f_esp'),
    origem: GV('f_orig').trim(),
    partes: GV('f_partes').trim(),
    distribuicao: GV('f_dist').trim(),
    numero_processo_externo: GV('f_num_externo').trim()
  };
}

function guardarCriar() {
  var dados = lerCamposComuns();
  if (!dados.partes) { G('f_partes').classList.add('err-input'); showToast('Preencha Intervenientes/Partes', 'ti-alert-circle', 'red'); return; }
  G('f_partes').classList.remove('err-input');
  if (!dados.origem) { G('f_orig').classList.add('err-input'); showToast('Preencha a Origem', 'ti-alert-circle', 'red'); return; }
  G('f_orig').classList.remove('err-input');

  apiPost('api/processos/criar.php', dados).then(function (res) {
    closeCrud();
    if (typeof recarregarProcessos === 'function') recarregarProcessos();
    showToast(res.numero_processo + ' registado com sucesso!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function guardarEditar(id) {
  var dados = lerCamposComuns();
  if (!dados.partes) { showToast('Preencha Intervenientes/Partes', 'ti-alert-circle', 'red'); return; }
  if (!dados.origem) { showToast('Preencha a Origem', 'ti-alert-circle', 'red'); return; }

  dados.id                  = id;
  dados.estado              = GV('f_st');
  dados.observacoes         = GV('f_obs');
  dados.notificacao_citacao = GV('f_notif');
  dados.conclusao           = GV('f_conc');
  dados.visto_mp            = GV('f_vmp');
  dados.visto_adjunto1      = GV('f_va1');
  dados.visto_adjunto2      = GV('f_va2');
  dados.inscricao_tabela    = GV('f_tab');
  dados.acordao             = GV('f_acord');
  dados.notificacao_acordao = GV('f_nacord');
  dados.conta_custas        = GV('f_custas');
  dados.arquivamento        = GV('f_arch');

  apiPost('api/processos/atualizar.php', dados).then(function () {
    closeCrud();
    if (typeof recarregarProcessos === 'function') recarregarProcessos();
    showToast('Processo actualizado!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

/* ─── Detalhe ─── */
function abrirDetalhe(id) {
  apiGet('api/processos/obter.php?id=' + id).then(function (res) {
    var p = res.processo;
    PROCESSO_ACTUAL = p;

    G('detT').textContent = 'Processo ' + p.numero_processo;
    var dr = function (l, v) { return '<div class="dr"><span class="dr-l">' + l + '</span><span class="dr-v">' + v + '</span></div>'; };
    var dd = function (l, v) {
      return '<div class="dr"><span class="dr-l">' + l + '</span><span class="dr-v" style="display:flex;align-items:center;gap:5px">'
        + '<i class="ti ti-' + (v ? 'circle-check' : 'circle') + '" style="font-size:14px;color:' + (v ? 'var(--green)' : 'var(--tx3)') + '"></i>'
        + '<span style="color:' + (v ? 'var(--green)' : 'var(--tx3)') + '">' + (v ? esc(v) : 'Pendente') + '</span></span></div>';
    };
    var estados = window.SGD_ESTADOS || [];
    var stOpts  = estados.map(function (e) { return '<option value="' + esc(e.codigo) + '" ' + (p.estado_codigo === e.codigo ? 'selected' : '') + '>' + esc(e.label) + '</option>'; }).join('');

    G('detB').innerHTML = '<div style="display:flex;gap:18px;flex-wrap:wrap">'
      + '<div style="flex:1.2;min-width:220px">'
      + '<div class="dsec bl">Identificacao</div>'
      + dr('N&ordm; Registo de Processo', '<span style="font-family:\'IBM Plex Mono\',monospace;font-weight:600;color:var(--blue)">' + esc(p.numero_processo) + '</span>')
      + dr('Data de Registo', esc(p.data_registo)) + dr('Especie', '<span class="badge b-type">' + esc(p.especie) + '</span>')
      + dr('Partes', esc(p.partes)) + dr('Origem', esc(p.origem || '—')) + dr('Distribuicao', esc(p.distribuicao || '—'))
      + (p.numero_processo_externo ? dr('N&ordm; Processo', esc(p.numero_processo_externo)) : '')
      + dr('Estado', '<span class="badge ' + esc(p.estado_cor) + '">' + esc(p.estado) + '</span>')
      + '<div class="dsec am" style="margin-top:14px">Datas de Controlo</div>'
      + dd('Notificacao/Citacao', p.notificacao_citacao) + dd('Conclusao', p.conclusao)
      + dd('Visto MP', p.visto_mp) + dd('Visto Adj.1', p.visto_adjunto1) + dd('Visto Adj.2', p.visto_adjunto2)
      + dd('Ins. Tabela', p.inscricao_tabela) + dd('Acordao', p.acordao)
      + dd('Notif. Acordao', p.notificacao_acordao) + dd('Conta/Custas', p.conta_custas) + dd('Arquivamento', p.arquivamento)
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
