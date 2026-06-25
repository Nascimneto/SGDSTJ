/**
 * login.js — autenticação da página de login (index.php)
 */
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('loginBtn');
  var lp  = document.getElementById('lp');
  if (btn) btn.addEventListener('click', doLogin);
  if (lp)  lp.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
});

function doLogin() {
  var u  = document.getElementById('lu').value.trim();
  var p  = document.getElementById('lp').value;
  var el = document.getElementById('lerr');
  el.classList.remove('show');

  if (!u || !p) {
    el.textContent = 'Preencha utilizador e senha.';
    el.classList.add('show');
    return;
  }

  fetch('api/auth/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, senha: p })
  })
    .then(function (r) { return r.json().then(function (body) { return { status: r.status, body: body }; }); })
    .then(function (res) {
      if (res.status === 200 && res.body.ok) {
        // perfil.php decide por si (window.SGD_TROCAR_SENHA) se deve restringir
        // o formulário só à troca de senha — não é preciso passar isso aqui.
        window.location = res.body.trocarSenha ? 'perfil.php' : 'painel.php';
      } else {
        el.textContent = res.body.erro || 'Utilizador ou senha incorrectos.';
        el.classList.add('show');
        limparCamposLogin();
      }
    })
    .catch(function () {
      el.textContent = 'Erro de ligação ao servidor. Tente novamente.';
      el.classList.add('show');
      limparCamposLogin();
    });
}

/** Em qualquer erro de login, limpa utilizador/senha e devolve o foco ao primeiro campo. */
function limparCamposLogin() {
  document.getElementById('lu').value = '';
  document.getElementById('lp').value = '';
  document.getElementById('lu').focus();
}
