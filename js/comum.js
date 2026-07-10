/**
 * comum.js — utilitários partilhados por todas as páginas autenticadas
 * (ex autenticacao.js, menos doLogin/doLogout que agora falam com a API).
 */

/* ─── DOM / formatação ─── */
function G(id)  { return document.getElementById(id); }
function GV(id) { var e = G(id); return e ? e.value : ''; }

function ini(n) {
  return (n || '').split(' ').slice(0, 2).map(function (x) { return x[0] || ''; }).join('').toUpperCase();
}

function trunc(s, n) {
  return s && s.length > n ? s.substring(0, n) + '...' : (s || '');
}

/**
 * Aplica um fade-in suave a um contentor cujo innerHTML acabou de ser
 * substituído (ex: esqueleto "A carregar..." -> dados reais), para evitar
 * o "pisca" de uma troca instantânea de conteúdo.
 */
function fadeIn(el) {
  if (!el) return;
  el.classList.remove('fade-in');
  void el.offsetWidth; /* força reflow para reiniciar a animação */
  el.classList.add('fade-in');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Política de senha do SGD (espelha Senha::validar() em app/Core/Senha.php):
 * 8+ caracteres, com pelo menos uma letra e um número.
 */
function senhaValida(s) {
  return !!s && s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);
}

/**
 * Cartão de estatística com três contagens lado a lado: Total / Pendente /
 * Concluído. Partilhado por painel.js e estatisticas.js.
 */
function statDuplo(icone, cor, titulo, pendente, concluido) {
  var total = pendente + concluido;
  return '<div class="stat"><div class="stat-lbl"><i class="ti ' + icone + '" style="color:' + cor + '"></i> ' + titulo + '</div>'
    + '<div style="display:flex;gap:12px">'
    + '<div><div class="stat-num" style="font-size:18px;color:var(--blue)">' + total + '</div><div class="stat-sub">Total</div></div>'
    + '<div><div class="stat-num" style="font-size:18px;color:var(--amber)">' + pendente + '</div><div class="stat-sub">Pendente</div></div>'
    + '<div><div class="stat-num" style="font-size:18px;color:' + cor + '">' + concluido + '</div><div class="stat-sub">Concluído</div></div>'
    + '</div></div>';
}

function pad(n) { return String(n).padStart(2, '0'); }

function nowPT() {
  var d = new Date();
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function hojeISO() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function p2i(pt) {
  if (!pt) return '';
  var p = pt.split('/');
  return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : pt;
}

function i2p(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
}

function shortDate(dt) { return dt ? dt.split(' ')[0] : ''; }

/* ─── Sessão (perfil vem do servidor via window.SGD_PERFIL, ver includes/head.php) ─── */
function isAdm() { return window.SGD_PERFIL === 'Administrador'; }

/** O perfil Visualizador é o único sem permissão de registar/editar processos. */
function podeEditar() { return window.SGD_PERFIL !== 'Visualizador'; }

function doLogout() {
  fetch('api/auth/logout.php', { method: 'POST', credentials: 'same-origin' })
    .catch(function () {})
    .then(function () { window.location = 'index.php'; });
}

/* ─── Toast ─── */
var toastTimer;
var TOAST_CORES = { green: 'var(--green)', red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue)' };
function showToast(msg, icon, type) {
  icon = icon || 'ti-circle-check';
  var t = type === 'red' ? 'red' : type === 'amber' ? 'amber' : type === 'blue' ? 'blue' : 'green';
  var el  = G('toast');
  var bar = G('toast-bar');

  G('toastI').className      = 'ti ' + icon;
  G('toastI').style.color    = TOAST_CORES[t];
  G('toastM').textContent    = msg;

  el.classList.remove('t-green', 't-red', 't-amber', 't-blue');
  el.classList.add('t-' + t);

  /* reinicia a animação da barra de progresso */
  bar.style.animation = 'none';
  bar.offsetWidth; /* força reflow */
  bar.style.animation = '';

  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3000);
}

/* ─── Diálogo de confirmação ───
 * opts (opcional): { simTxt, naoTxt, naoCb } — textos dos botões e acção ao
 * clicar em "Não"/Cancelar (por omissão só fecha, sem acção nenhuma).
 */
var cfCb = null;
var cfNoCb = null;
function cfDlg(title, msg, cb, opts) {
  opts = opts || {};
  G('cfT').textContent = title;
  G('cfP').innerHTML = msg;
  G('cfYes').textContent = opts.simTxt || 'Confirmar';
  G('cfNo').textContent = opts.naoTxt || 'Cancelar';
  cfCb = cb;
  cfNoCb = opts.naoCb || null;
  G('cfbg').classList.add('open');
}

/* ─── Aviso de sessão a expirar ───
 * Agenda um aviso (reutilizando o diálogo de confirmação) alguns minutos
 * antes da sessão expirar, para o utilizador não perder um formulário
 * aberto (ex: edição de processo) sem aviso. "Continuar sessão" chama
 * api/auth/renovar.php, que prolonga a sessão no servidor e reagenda o
 * aviso; sem resposta, a sessão expira normalmente e o próximo pedido à
 * API é redireccionado para o login por js/api.js.
 */
var AVISO_SESSAO_MS = 2 * 60 * 1000;

function agendarAvisoSessao(expiraEmMs) {
  clearTimeout(window._avisoSessaoTimer);
  var restante = expiraEmMs - Date.now();
  // Sessões configuradas mais curtas que AVISO_SESSAO_MS (ex: ambiente de
  // testes com "sessao_expira_min" a 1-2min) não devem fazer o aviso disparar
  // de imediato a cada renovação/navegação, dando a sensação de que nunca
  // fecha — nesse caso avisa a meio do tempo restante em vez disso.
  var antecedencia = Math.min(AVISO_SESSAO_MS, Math.max(0, restante) / 2);
  window._avisoSessaoTimer = setTimeout(mostrarAvisoSessao, Math.max(0, restante - antecedencia));
}

function mostrarAvisoSessao() {
  cfDlg('Sessão a expirar', 'A sua sessão está prestes a expirar. Deseja continuar sessão?', renovarSessao, {
    simTxt: 'Sim',
    naoTxt: 'Não',
    naoCb: function () { window.location = 'painel.php'; }
  });
}

function renovarSessao() {
  apiPost('api/auth/renovar.php', {}).then(function (res) {
    agendarAvisoSessao(res.expiraEm);
    showToast('Sessão renovada.', 'ti-shield-check');
  }).catch(function (e) {
    // Falha a renovar (sessão já expirada no servidor, rede em baixo, etc.):
    // sem isto o diálogo fechava e não acontecia mais nada visível para
    // o utilizador — reencaminha sempre para o login em vez de ficar preso.
    showToast(e && e.message ? e.message : 'Não foi possível renovar a sessão.', 'ti-alert-circle', 'red');
    window.location = 'index.php';
  });
}

if (typeof window.SGD_SESSAO_EXPIRA_EM === 'number') {
  agendarAvisoSessao(window.SGD_SESSAO_EXPIRA_EM);
}

/* ─── Sidebar (mobile) ─── */
function openSB()  { G('sidebar').classList.add('open');    G('overlay').classList.add('show'); }
function closeSB() { G('sidebar').classList.remove('open'); G('overlay').classList.remove('show'); }

/* ─── Paginação (partilhada) ─── */
function paginate(data, pg, pageSize) {
  pageSize = pageSize || 15;
  var total = data.length;
  var pages = Math.max(1, Math.ceil(total / pageSize));
  var p = Math.min(Math.max(1, pg), pages);
  var s = (p - 1) * pageSize;
  return { items: data.slice(s, s + pageSize), page: p, pages: pages, total: total, s: s, e: Math.min(s + pageSize, total) };
}

function mkPager(pg, fn) {
  if (pg.pages <= 1) return '';
  var b = [];
  for (var i = 1; i <= pg.pages; i++) {
    if (i === 1 || i === pg.pages || Math.abs(i - pg.page) <= 1) {
      b.push('<button class="pb' + (i === pg.page ? ' on' : '') + '" onclick="' + fn + '(' + i + ')">' + i + '</button>');
    } else if (b[b.length - 1] !== '...') {
      b.push('...');
    }
  }
  return '<div class="pager"><span class="pager-info">A mostrar ' + (pg.s + 1) + '-' + pg.e + ' de ' + pg.total + '</span>'
    + '<div class="pager-btns">'
    + '<button class="pb" onclick="' + fn + '(' + (pg.page - 1) + ')" ' + (pg.page <= 1 ? 'disabled' : '') + '>&#8249;</button>'
    + b.map(function (x) { return x === '...' ? '<span style="padding:0 3px;line-height:28px;color:var(--tx3)">...</span>' : x; }).join('')
    + '<button class="pb" onclick="' + fn + '(' + (pg.page + 1) + ')" ' + (pg.page >= pg.pages ? 'disabled' : '') + '>&#8250;</button>'
    + '</div></div>';
}

/* ─── Responsividade: alternar cards/tabela (página Utilizadores) ─── */
function syncCards() {
  var mob = window.innerWidth < 768;
  var uc = G('uCards');
  var pagina = document.body.getAttribute('data-pagina');
  var to = G('content') ? G('content').querySelector('.tbl-outer') : null;
  if (uc) uc.style.display = mob ? 'flex' : 'none';
  if (to && pagina === 'utilizadores') to.style.display = mob ? 'none' : 'block';
}

/* ─── Badge "Em Entrada" na sidebar ─── */
function updBadge() {
  var b = G('sbBadge');
  if (!b) return;
  fetch('api/processos/contagem-entrada.php', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var n = d && typeof d.total === 'number' ? d.total : 0;
      b.textContent = n;
      b.style.display = n ? 'flex' : 'none';
    })
    .catch(function () {});
}

/* ─── Listeners partilhados por todas as páginas autenticadas ─── */
document.addEventListener('DOMContentLoaded', function () {
  var menuBtn = G('menuBtn');
  var overlay = G('overlay');
  if (menuBtn) menuBtn.addEventListener('click', openSB);
  if (overlay) overlay.addEventListener('click', closeSB);

  var logoutBtn = G('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

  var bellBtn = G('bellBtn');
  if (bellBtn) bellBtn.addEventListener('click', function () { showToast('Sem novas notificações', 'ti-bell'); });

  var cfYes = G('cfYes'), cfNo = G('cfNo'), cfbg = G('cfbg');
  if (cfYes) cfYes.addEventListener('click', function () {
    cfbg.classList.remove('open');
    cfNoCb = null;
    if (cfCb) { var f = cfCb; cfCb = null; f(); }
  });
  if (cfNo) cfNo.addEventListener('click', function () {
    cfbg.classList.remove('open');
    cfCb = null;
    if (cfNoCb) { var f = cfNoCb; cfNoCb = null; f(); }
  });
  if (cfbg) cfbg.addEventListener('click', function (e) { if (e.target === this) { this.classList.remove('open'); cfCb = null; cfNoCb = null; } });

  document.querySelectorAll('.modal-bg').forEach(function (bg) {
    bg.addEventListener('click', function (e) {
      // #crudM é o formulário de criação/edição (Novo Processo, Novo
      // Utilizador) — clicar fora não fecha, para não perder dados a meio
      // do preenchimento. Só o botão Cancelar (closeCrud()) fecha.
      if (this.id === 'crudM') return;
      if (e.target === this) this.classList.remove('open');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-bg.open').forEach(function (m) {
        if (m.id === 'crudM') return;
        m.classList.remove('open');
      });
      if (cfbg) cfbg.classList.remove('open');
    }
  });

  window.addEventListener('resize', syncCards);
  syncCards();
  updBadge();
});
