<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title><?= sgd_e($tituloPagina ?? 'SGD') ?> — SGD</title>
<link rel="icon" type="image/jpeg" href="<?= sgd_asset('assets/img/logostj.jpg') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" integrity="sha384-mY6asDzXlnHeimHHXw8cavPeArhEcAfnCibDFiaDPex3Fudo+edh/hnT7siZz8bg" crossorigin="anonymous">
<link rel="stylesheet" href="<?= sgd_asset('css/estilos.css') ?>">
<script>
  window.SGD_PERFIL   = <?= json_encode(sgd_perfil()) ?>;
  window.SGD_NOME     = <?= json_encode($_SESSION['nome'] ?? '') ?>;
  window.SGD_USERNAME = <?= json_encode($_SESSION['username'] ?? '') ?>;
  // Lido por perfil.js para restringir o formulário só à troca de senha
  // enquanto sgd_deve_trocar_senha() estiver activo (ver app/Core/PageGuard.php).
  window.SGD_TROCAR_SENHA = <?= json_encode(sgd_deve_trocar_senha()) ?>;
</script>
