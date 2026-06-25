/**
 * api.js — wrapper fetch() para falar com os endpoints em api/*.php.
 * Trata 401 globalmente (sessão expirada -> volta ao login).
 */
function api(metodo, url, corpo) {
  var opts = { method: metodo, credentials: 'same-origin', headers: {} };
  if (corpo !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(corpo);
  }

  return fetch(url, opts).then(function (r) {
    if (r.status === 401) {
      window.location = 'index.php';
      return Promise.reject(new Error('Sessão expirada.'));
    }
    return r.json().catch(function () { return {}; }).then(function (body) {
      if (!r.ok) {
        var erro = new Error(body.erro || ('Erro HTTP ' + r.status));
        erro.status = r.status;
        erro.body = body;
        throw erro;
      }
      return body;
    });
  });
}

function apiGet(url)         { return api('GET', url); }
function apiPost(url, corpo) { return api('POST', url, corpo); }
