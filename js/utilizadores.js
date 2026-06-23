/**
 * utilizadores.js — CRUD completo, perfis, activar/desactivar, resetar senha (hash, não MD5).
 */
var ULTIMOS_USERS = [];

document.addEventListener('DOMContentLoaded', function () {
  var closeCrudBtn = G('closeCrudBtn');
  if (closeCrudBtn) closeCrudBtn.addEventListener('click', closeCrud);
  carregarUtilizadores();
});

function carregarUtilizadores() {
  apiGet('api/utilizadores/listar.php').then(function (res) {
    ULTIMOS_USERS = res.items;
    renderUtilizadores();
  }).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

function renderUtilizadores() {
  var thS = 'text-align:left;padding:10px 16px;font-size:10.5px;font-weight:700;color:var(--tx2);border-bottom:2px solid var(--border);background:var(--bg);text-transform:uppercase;letter-spacing:.5px';
  var tdS = 'padding:11px 16px;border-bottom:1px solid var(--border)';

  var tableRows = ULTIMOS_USERS.map(function (u) {
    var ac = !!u.activo;
    var togStyle = ac ? 'color:var(--red)' : 'color:var(--green)';
    var togIcon  = ac ? 'user-off' : 'user-check';
    var togTitle = ac ? 'Desactivar' : 'Activar';
    var nomeJs = esc(u.nome_completo).replace(/'/g, "\\'");
    return '<tr onmouseover="this.style.background=\'#F4F8FF\'" onmouseout="this.style.background=\'\'">'
      + '<td style="' + tdS + '"><div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:32px;height:32px;border-radius:50%;background:var(--bluel);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">' + esc(ini(u.nome_completo)) + '</div>'
      + '<span style="font-weight:500;font-size:13px">' + esc(u.nome_completo) + '</span></div></td>'
      + '<td style="' + tdS + '"><code style="font-size:12px;background:var(--bg);padding:3px 8px;border-radius:5px;border:1px solid var(--border)">' + esc(u.username) + '</code></td>'
      + '<td style="' + tdS + ';font-size:13px">' + esc(u.perfil) + '</td>'
      + '<td style="' + tdS + ';font-size:13px">' + esc(u.departamento || '—') + '</td>'
      + '<td style="' + tdS + '"><span class="badge ' + (ac ? 'b-concluded' : 'b-archived') + '">' + (ac ? 'Activo' : 'Inactivo') + '</span></td>'
      + '<td style="' + tdS + ';text-align:center"><div style="display:flex;gap:6px;justify-content:center">'
      + '<button class="btn btn-icon btn-sm" title="Editar" onclick="abrirEditarUser(' + u.id + ')"><i class="ti ti-edit"></i></button>'
      + '<button class="btn btn-icon btn-sm" title="Resetar senha" onclick="resetarSenhaUser(' + u.id + ',\'' + nomeJs + '\')"><i class="ti ti-key"></i></button>'
      + '<button class="btn btn-icon btn-sm" title="' + togTitle + '" onclick="toggleUser(' + u.id + ')" style="' + togStyle + '"><i class="ti ti-' + togIcon + '"></i></button>'
      + '<button class="btn btn-icon btn-sm" title="Eliminar" onclick="eliminarUser(' + u.id + ',\'' + nomeJs + '\')" style="color:var(--red)"><i class="ti ti-trash"></i></button>'
      + '</div></td></tr>';
  }).join('');

  var mobileU = ULTIMOS_USERS.map(function (u) {
    var ac = !!u.activo;
    var nomeJs = esc(u.nome_completo).replace(/'/g, "\\'");
    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:14px;box-shadow:var(--sh)">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      + '<div style="width:40px;height:40px;border-radius:50%;background:var(--bluel);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">' + esc(ini(u.nome_completo)) + '</div>'
      + '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + esc(u.nome_completo) + '</div>'
      + '<div style="font-size:12px;color:var(--tx2)">' + esc(u.perfil) + ' &middot; ' + esc(u.departamento || '—') + '</div></div>'
      + '<span class="badge ' + (ac ? 'b-concluded' : 'b-archived') + '">' + (ac ? 'Activo' : 'Inactivo') + '</span></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + '<button class="btn btn-sm" onclick="abrirEditarUser(' + u.id + ')"><i class="ti ti-edit"></i> Editar</button>'
      + '<button class="btn btn-sm" onclick="resetarSenhaUser(' + u.id + ',\'' + nomeJs + '\')"><i class="ti ti-key"></i></button>'
      + '<button class="btn btn-sm" onclick="toggleUser(' + u.id + ')" style="' + (ac ? 'color:var(--red)' : 'color:var(--green)') + '"><i class="ti ti-' + (ac ? 'user-off' : 'user-check') + '"></i></button>'
      + '<button class="btn btn-sm" onclick="eliminarUser(' + u.id + ',\'' + nomeJs + '\')" style="color:var(--red);margin-left:auto"><i class="ti ti-trash"></i></button>'
      + '</div></div>';
  }).join('');

  G('content').innerHTML = '<div class="panel" style="width:100%">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:10px">'
    + '<div style="display:flex;align-items:center;gap:8px"><i class="ti ti-users" style="color:var(--blue);font-size:18px"></i>'
    + '<span style="font-size:14px;font-weight:600">Utilizadores (' + ULTIMOS_USERS.length + ')</span></div>'
    + '<button class="btn btn-primary btn-sm" onclick="abrirCriarUser()"><i class="ti ti-user-plus"></i> Novo Utilizador</button>'
    + '</div>'
    + '<div class="ib blue" style="margin:12px 18px 4px"><i class="ti ti-shield-lock" style="font-size:15px;flex-shrink:0"></i>'
    + ' Apenas o <b>Administrador</b> pode criar, activar/desactivar ou eliminar utilizadores.</div>'
    + '<div style="overflow-x:auto;width:100%">'
    + '<table style="width:100%;border-collapse:collapse;table-layout:fixed;min-width:560px"><thead><tr>'
    + '<th style="' + thS + ';width:26%">Nome</th>'
    + '<th style="' + thS + ';width:14%">Utilizador</th>'
    + '<th style="' + thS + ';width:14%">Perfil</th>'
    + '<th style="' + thS + ';width:14%">Departamento</th>'
    + '<th style="' + thS + ';width:12%">Estado</th>'
    + '<th style="' + thS + ';width:20%;text-align:center">Ac&ccedil;&otilde;es</th>'
    + '</tr></thead><tbody>' + tableRows + '</tbody></table></div>'
    + '<div id="uCards" style="display:none;flex-direction:column;gap:10px;padding:14px">' + mobileU + '</div>'
    + '</div>';
  syncCards();
}

/* ─── Formulário (criar/editar) ─── */
function buildFormUser(u) {
  var perfis = window.SGD_PERFIS || [];
  var deptos = window.SGD_DEPARTAMENTOS || [];
  var rOpts = perfis.map(function (r) { return '<option ' + (u && u.perfil === r ? 'selected' : '') + '>' + esc(r) + '</option>'; }).join('');
  var dOpts = '<option value="">—</option>' + deptos.map(function (d) { return '<option ' + (u && u.departamento === d ? 'selected' : '') + '>' + esc(d) + '</option>'; }).join('');
  // Na criação não há campo de senha: o servidor atribui sempre a senha
  // inicial fixa (stj@2026) e obriga a troca no primeiro acesso.
  var campoSenha = u
    ? '<div class="fg"><label>Senha (em branco = manter) <small style="font-weight:400;color:var(--tx3)">(min. 8 caracteres, com letra e número)</small></label>'
      + '<input type="password" id="up" placeholder="..."></div>'
    : '<div class="fg"><label>Senha inicial</label>'
      + '<div class="ib blue" style="margin:0"><i class="ti ti-key" style="flex-shrink:0"></i> Atribuída automaticamente: <code>stj@2026</code>. Será pedida a troca no primeiro acesso.</div></div>';
  return '<div class="fg2">'
    + '<div class="fg"><label class="required">Nome Completo</label><input id="un" value="' + (u ? esc(u.nome_completo) : '') + '"></div>'
    + '<div class="fg"><label class="required">Utilizador</label><input id="uu" value="' + (u ? esc(u.username) : '') + '"></div>'
    + '</div>'
    + '<div class="fg2">'
    + campoSenha
    + '<div class="fg"><label>Perfil</label><select id="ur">' + rOpts + '</select></div>'
    + '</div>'
    + '<div class="fg2">'
    + '<div class="fg"><label>Departamento</label><select id="ud">' + dOpts + '</select></div>'
    + '<div class="fg"><label>Estado</label><select id="ua">'
    + '<option value="1" ' + (!u || u.activo ? 'selected' : '') + '>Activo</option>'
    + '<option value="0" ' + (u && !u.activo ? 'selected' : '') + '>Inactivo</option>'
    + '</select></div>'
    + '</div>';
}

function abrirCriarUser() {
  G('crudT').textContent = 'Novo Utilizador';
  G('crudB').innerHTML = buildFormUser(null);
  G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
    + '<button class="btn btn-primary" onclick="guardarUser(\'create\')"><i class="ti ti-device-floppy"></i> Criar Utilizador</button>';
  G('crudM').classList.add('open');
}

function abrirEditarUser(id) {
  var u = ULTIMOS_USERS.filter(function (x) { return x.id === id; })[0];
  if (!u) return;
  G('crudT').textContent = 'Editar - ' + u.nome_completo;
  G('crudB').innerHTML = buildFormUser(u);
  G('crudF').innerHTML = '<button class="btn" onclick="closeCrud()">Cancelar</button>'
    + '<button class="btn btn-primary" onclick="guardarUser(\'edit\',' + id + ')"><i class="ti ti-device-floppy"></i> Guardar</button>';
  G('crudM').classList.add('open');
}

function closeCrud() { G('crudM').classList.remove('open'); }

function guardarUser(modo, id) {
  var nome = GV('un').trim(), user = GV('uu').trim();
  // No modo 'create' não há campo #up (ver buildFormUser) — a senha é
  // sempre a inicial fixa, atribuída pelo servidor.
  var senha = modo === 'edit' ? GV('up') : '';
  if (!nome || !user) { showToast('Preencha nome e utilizador', 'ti-alert-circle', 'red'); return; }
  // Mesma regra validada no servidor (api/utilizadores/atualizar.php);
  // valida aqui só para dar feedback imediato sem ida ao servidor.
  if (senha && !senhaValida(senha)) {
    showToast('A senha deve ter 8+ caracteres, com letra e número', 'ti-alert-circle', 'red');
    return;
  }

  var dados = { nome: nome, username: user, senha: senha, perfil: GV('ur'), departamento: GV('ud'), activo: GV('ua') === '1' };
  var endpoint = modo === 'create' ? 'api/utilizadores/criar.php' : 'api/utilizadores/atualizar.php';
  if (modo === 'edit') dados.id = id;

  apiPost(endpoint, dados).then(function (res) {
    closeCrud();
    carregarUtilizadores();
    if (modo === 'create') {
      cfDlg('Utilizador Criado',
        'Senha inicial de <b>' + esc(nome) + '</b>: <code style="font-size:14px">' + esc(res.senhaInicial) + '</code>'
        + '<br><br>Comunique-a com segurança — será pedida a troca no primeiro acesso.',
        function () {});
    } else {
      showToast(nome + ' actualizado!', 'ti-circle-check');
    }
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function toggleUser(id) {
  apiPost('api/utilizadores/alternar-estado.php', { id: id }).then(function (res) {
    showToast(res.activo ? 'Utilizador activado' : 'Utilizador desactivado', 'ti-user-check');
    carregarUtilizadores();
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function resetarSenhaUser(id, nome) {
  cfDlg('Resetar Senha', 'Gerar nova senha temporária para <b>' + esc(nome) + '</b>?', function () {
    apiPost('api/utilizadores/resetar-senha.php', { id: id }).then(function (res) {
      cfDlg('Senha Resetada',
        'Nova senha temporária de <b>' + esc(nome) + '</b>:<br><code style="font-size:14px">' + esc(res.senhaTemporaria) + '</code>'
        + '<br><br>Comunique-a com seguran&ccedil;a — ser&aacute; pedida a troca no pr&oacute;ximo acesso.',
        function () {});
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}

function eliminarUser(id, nome) {
  cfDlg('Eliminar Utilizador', 'Eliminar permanentemente <b>' + esc(nome) + '</b>?', function () {
    apiPost('api/utilizadores/eliminar.php', { id: id }).then(function () {
      carregarUtilizadores();
      showToast('Utilizador eliminado', 'ti-trash', 'red');
    }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
  });
}
