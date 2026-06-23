<div class="topbar">
  <button class="topbar-menu" id="menuBtn"><i class="ti ti-menu-2"></i></button>
  <span id="ttitle" style="font-size:15px;font-weight:600"><?= sgd_e($tituloPagina ?? '') ?></span>
  <div class="topbar-right">
    <button class="btn btn-sm" id="bellBtn"><i class="ti ti-bell"></i></button>
    <?php if (($paginaActiva ?? '') === 'processos' && sgd_pode_editar()): ?>
      <a class="btn btn-primary btn-sm" href="processos.php?novo=1" title="Adicionar novo processo"><i class="ti ti-plus"></i> Novo Processo</a>
    <?php endif; ?>
  </div>
</div>
