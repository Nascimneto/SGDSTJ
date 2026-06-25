<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
  <title>SGD — Supremo Tribunal de Cabo Verde</title>
  <link rel="icon" type="image/jpeg" href="assets/img/logostj.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" integrity="sha384-mY6asDzXlnHeimHHXw8cavPeArhEcAfnCibDFiaDPex3Fudo+edh/hnT7siZz8bg" crossorigin="anonymous">
  <link rel="stylesheet" href="<?= sgd_asset('css/estilos.css') ?>">
</head>
<body>

<div id="login">
  <div class="lcard">
    <div class="ltop">
      <img src="assets/img/logostj.jpg" alt="Supremo Tribunal de Justiça" style="height:60px;width:auto;display:block;margin:0 auto 14px">
      <h1 style="font-size:17px;font-weight:600;margin-bottom:3px;color:var(--tx2)">Supremo Tribunal de Cabo Verde</h1>
      <h1 style="font-size:26px;font-weight:700;margin-bottom:4px">SGD</h1>
      <p style="font-size:13px;color:var(--tx2)">Sistema de Gestão de Processos</p>
    </div>
    <div class="lerr" id="lerr">Utilizador ou senha incorrectos.</div>

    <div class="fg">
      <label class="required">Utilizador</label>
      <input id="lu" type="text" autocomplete="off" placeholder="Introduza o utilizador">
    </div>

    <div class="fg">
      <label class="required">Senha</label>
      <input id="lp" type="password" autocomplete="current-password" placeholder="Introduza a senha">
    </div>

    <button class="btn btn-primary btn-block" id="loginBtn" style="padding:13px;margin-top:6px">
      <i class="ti ti-login"></i> Entrar no Sistema
    </button>
  </div>
</div>

<script src="<?= sgd_asset('js/login.js') ?>"></script>
</body>
</html>
