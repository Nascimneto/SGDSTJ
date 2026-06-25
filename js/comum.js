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
function showToast(msg, icon, type) {
  icon = icon || 'ti-circle-check';
  G('toastI').className = 'ti ' + icon;
  G('toastI').style.color = type === 'red' ? '#f87171' : '#4ade80';
  G('toastM').textContent = msg;
  G('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { G('toast').classList.remove('show'); }, 3000);
}

/* ─── Diálogo de confirmação ─── */
var cfCb = null;
function cfDlg(title, msg, cb) {
  G('cfT').textContent = title;
  G('cfP').innerHTML = msg;
  cfCb = cb;
  G('cfbg').classList.add('open');
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
    if (cfCb) { var f = cfCb; cfCb = null; f(); }
  });
  if (cfNo) cfNo.addEventListener('click', function () { cfbg.classList.remove('open'); cfCb = null; });
  if (cfbg) cfbg.addEventListener('click', function (e) { if (e.target === this) { this.classList.remove('open'); cfCb = null; } });

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
