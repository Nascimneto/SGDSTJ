/**
 * perfil.js — "O Meu Perfil": só permite trocar a senha. Nome e utilizador
 * são geridos pelo Administrador (página Utilizadores), não aqui.
 */
document.addEventListener('DOMContentLoaded', function () {
  renderPerfil();
});

function renderPerfil() {
  var nome = window.SGD_NOME || '';
  var obrigatorio = !!window.SGD_TROCAR_SENHA;

  var aviso = obrigatorio
    ? '<div class="ib amber"><i class="ti ti-key" style="flex-shrink:0"></i> Por segurança, defina uma nova senha antes de continuar. O resto do sistema só fica disponível depois.</div>'
    : '<div class="ib amber"><i class="ti ti-info-circle" style="flex-shrink:0"></i> Aqui só pode alterar a sua senha. Nome e utilizador são geridos pelo Administrador.</div>';

  G('content').innerHTML = '<div style="max-width:480px;margin:0 auto">'
    + '<div class="panel" style="padding:22px">'
    + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">'
    + '<div style="width:50px;height:50px;border-radius:50%;background:var(--bluel);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0">' + esc(ini(nome)) + '</div>'
    + '<div><div style="font-size:16px;font-weight:600">' + esc(nome) + '</div>'
    + '<div style="font-size:12px;color:var(--tx2)">' + esc(window.SGD_PERFIL || '') + '</div></div></div>'
    + aviso
    + '<div class="fg"><label class="required">Nova Senha <small style="font-weight:400;color:var(--tx3)">(min. 8 caracteres, com letra e número)</small></label>'
    + '<input type="password" id="pf_p" placeholder="..."></div>'
    + '<div class="fg"><label class="required">Confirmar Senha</label><input type="password" id="pf_p2" placeholder="..."></div>'
    + '<div style="display:flex;gap:10px">'
    + '<button class="btn" onclick="' + (obrigatorio ? 'doLogout()' : 'cancelarProf()') + '"><i class="ti ti-x"></i> Cancelar</button>'
    + '<button class="btn btn-primary" onclick="saveProf()"><i class="ti ti-device-floppy"></i> ' + (obrigatorio ? 'Trocar Senha e Entrar' : 'Trocar Senha') + '</button>'
    + '</div>'
    + '</div></div>';
  fadeIn(G('content'));
}

/** Cancelar fora do fluxo obrigatório: não há nada para descartar, só sair da página. */
function cancelarProf() {
  window.location = 'painel.php';
}

function saveProf() {
  var obrigatorio = !!window.SGD_TROCAR_SENHA;
  var p = GV('pf_p'), p2 = GV('pf_p2');

  if (!p) { showToast('Defina uma nova senha', 'ti-alert-circle', 'red'); return; }
  if (p !== p2) { showToast('Senhas nao coincidem', 'ti-alert-circle', 'red'); return; }
  // Mesma regra validada no servidor (api/perfil/atualizar.php); feedback imediato.
  if (!senhaValida(p)) {
    showToast('A senha deve ter 8+ caracteres, com letra e número', 'ti-alert-circle', 'red');
    return;
  }

  apiPost('api/perfil/atualizar.php', { senha: p, senha2: p2 }).then(function () {
    if (obrigatorio) {
      // Senha trocada: guard.php deixa de bloquear o resto do sistema.
      window.location = 'painel.php';
      return;
    }
    showToast('Senha alterada!', 'ti-circle-check');
    G('pf_p').value = '';
    G('pf_p2').value = '';
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}
