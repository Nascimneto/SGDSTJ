<div class="overlay" id="overlay"></div>

<div id="cfbg">
  <div id="cfbox">
    <h3 id="cfT">Confirmar</h3>
    <p id="cfP">Tem a certeza?</p>
    <div class="btns">
      <button class="btn" id="cfNo">Cancelar</button>
      <button class="btn btn-danger" id="cfYes">Confirmar</button>
    </div>
  </div>
</div>

<div id="toast" class="t-green">
  <i id="toastI" class="ti ti-circle-check" style="font-size:18px;flex-shrink:0;color:var(--green)"></i>
  <span id="toastM"></span>
  <div id="toast-bar"></div>
</div>

<!-- Menu de ações (⋮) flutuante, partilhado por todas as tabelas — position:fixed
     para escapar ao overflow:hidden das células (.pt td), reposicionado em JS
     junto ao botão que o abriu (ver abrirMenuAcoes() em js/comum.js). -->
<div id="acoesMenuFloat" class="acoes-menu"></div>
