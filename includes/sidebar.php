<?php $paginaActiva = $paginaActiva ?? ''; ?>
<nav class="sidebar" id="sidebar">
  <!-- Logótipo: liga sempre ao Painel Geral (página inicial da plataforma). -->
  <a class="sb-logo" href="painel.php" title="Ir para o Painel Geral" style="flex-direction:column;align-items:stretch;gap:7px;text-decoration:none;color:inherit;cursor:pointer">
    <div style="background:#fff;border-radius:7px;padding:6px 8px;display:flex;align-items:center;justify-content:center">
      <img src="<?= sgd_asset('assets/img/logostj.jpg') ?>" alt="Supremo Tribunal de Justiça" style="height:24px;width:auto;display:block">
    </div>
    <div class="sb-sub" style="padding-left:2px">SGD — Gestão de Processos</div>
  </a>
  <div class="sb-nav">
    <div class="sb-sec">Principal</div>
    <a class="sb-item<?= $paginaActiva === 'painel' ? ' active' : '' ?>" href="painel.php">
      <i class="ti ti-dashboard"></i> Painel Geral
    </a>
    <a class="sb-item<?= $paginaActiva === 'processos' ? ' active' : '' ?>" href="processos.php">
      <i class="ti ti-files"></i> Lista de Processos <span class="sb-badge" id="sbBadge" style="display:none">0</span>
    </a>

    <?php if (sgd_pode_editar()): ?>
    <div class="sb-sec">Controlo Processual</div>
    <a class="sb-item<?= $paginaActiva === 'conclusao' ? ' active' : '' ?>" href="conclusao.php">
      <i class="ti ti-check"></i> Conclusão
    </a>
    <a class="sb-item<?= $paginaActiva === 'vistos' ? ' active' : '' ?>" href="vistos.php">
      <i class="ti ti-eye-check"></i> Vistos
    </a>
    <?php endif; ?>
    <a class="sb-item<?= $paginaActiva === 'estatisticas' ? ' active' : '' ?>" href="estatisticas.php">
      <i class="ti ti-chart-bar"></i> Estatísticas
    </a>

    <div class="sb-sec">Sistema</div>
    <?php if (sgd_perfil() === 'Administrador'): ?>
      <a class="sb-item<?= $paginaActiva === 'utilizadores' ? ' active' : '' ?>" href="utilizadores.php">
        <i class="ti ti-users"></i> Utilizadores
      </a>
    <?php else: ?>
      <a class="sb-item<?= $paginaActiva === 'perfil' ? ' active' : '' ?>" href="perfil.php">
        <i class="ti ti-user"></i> O Meu Perfil
      </a>
    <?php endif; ?>
    <?php if (sgd_perfil() === 'Administrador'): ?>
      <a class="sb-item<?= $paginaActiva === 'configuracoes' ? ' active' : '' ?>" href="configuracoes.php">
        <i class="ti ti-settings"></i> Configurações
      </a>
      <?php $abaAuditoria = $_GET['aba'] ?? 'historico'; ?>
      <a class="sb-item<?= ($paginaActiva === 'auditoria' && $abaAuditoria === 'historico') ? ' active' : '' ?>" href="auditoria.php">
        <i class="ti ti-history"></i> Histórico
      </a>
      <a class="sb-item<?= ($paginaActiva === 'auditoria' && $abaAuditoria === 'sistema') ? ' active' : '' ?>" href="auditoria.php?aba=sistema">
        <i class="ti ti-shield-lock"></i> Auditoria
      </a>
    <?php endif; ?>
  </div>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-av" id="sbAv"><?= sgd_e(sgd_iniciais($_SESSION['nome'] ?? '')) ?></div>
      <div style="min-width:0;flex:1">
        <div class="sb-uname" id="sbName"><?= sgd_e($_SESSION['nome'] ?? '') ?></div>
        <div class="sb-urole"><?= sgd_e($_SESSION['perfil'] ?? '') ?></div>
      </div>
      <i class="ti ti-logout sb-logout" id="logoutBtn" title="Sair"></i>
    </div>
    <div class="sb-copy">&copy; <?= date('Y') ?> Osvanildo Nascimento</div>
  </div>
</nav>
