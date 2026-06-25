/**
 * configuracoes.js — dados institucionais, segurança, exportação de
 * dados e auditoria. Tudo persistido via API (tabela `configuracoes`),
 * não decorativo.
 */
document.addEventListener('DOMContentLoaded', carregarConfiguracoes);

function carregarConfiguracoes() {
  apiGet('api/configuracoes/obter.php').then(function (res) {
    renderConfiguracoes(res.configuracoes);
  }).catch(function (e) {
    G('content').innerHTML = '<div class="empty"><i class="ti ti-alert-triangle"></i><p>Erro: ' + esc(e.message) + '</p></div>';
  });
}

function renderConfiguracoes(c) {
  G('content').innerHTML = '<div class="row2" style="flex-wrap:wrap">'
    + '<div class="panel" style="padding:18px;min-width:260px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:16px"><i class="ti ti-building" style="color:var(--blue)"></i> Configuracoes Gerais</div>'
    + '<div class="fg"><label>Nome do Tribunal</label><input id="cf_nome" value="' + esc(c.tribunal_nome || '') + '"></div>'
    + '<div class="fg"><label>Endereco</label><input id="cf_endereco" value="' + esc(c.tribunal_endereco || '') + '"></div>'
    + '<div class="fg"><label>Email</label><input id="cf_email" value="' + esc(c.tribunal_email || '') + '"></div>'
    + '<div class="fg"><label>Prefixo de Numeracao</label><input id="cf_prefixo" value="' + esc(c.prefixo_numeracao || '') + '" style="max-width:90px"></div>'
    + '<div class="fg"><label>Processos por Pagina</label><input type="number" id="cf_pagina" value="' + esc(c.processos_pagina || '15') + '" min="5" max="100" style="max-width:90px"></div>'
    + '<button class="btn btn-primary" onclick="guardarConfigGerais()"><i class="ti ti-device-floppy"></i> Guardar</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:14px;flex:1;min-width:260px">'
    + '<div class="panel" style="padding:18px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:14px"><i class="ti ti-shield-check" style="color:var(--green)"></i> Seguranca</div>'
    + '<div class="fg"><label>Sessao expira (min)</label><input type="number" id="cf_sessao" value="' + esc(c.sessao_expira_min || '60') + '" style="max-width:90px"></div>'
    + '<div class="fg"><label>Tentativas de login</label><input type="number" id="cf_tentativas" value="' + esc(c.max_tentativas_login || '5') + '" style="max-width:90px"></div>'
    + '<div class="fg"><label>Bloqueio (min)</label><input type="number" id="cf_bloqueio" value="' + esc(c.bloqueio_min || '15') + '" style="max-width:90px"></div>'
    + '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:12px"><input type="checkbox" id="cf_auditoria" ' + (c.registo_auditoria === '1' ? 'checked' : '') + ' style="width:15px;height:15px"> Registo de auditoria</label>'
    + '<button class="btn btn-primary" onclick="guardarConfigSeguranca()"><i class="ti ti-device-floppy"></i> Guardar</button>'
    + '</div>'
    + '<div class="panel" style="padding:18px">'
    + '<div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="ti ti-database" style="color:var(--amber)"></i> Dados</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
    + '<button class="btn" onclick="exportarProcessosCSV()"><i class="ti ti-download"></i> Exportar Processos (CSV)</button>'
    + '</div></div>'
    + '</div></div>';
}

function guardarConfigGerais() {
  var dados = {
    tribunal_nome: GV('cf_nome'),
    tribunal_endereco: GV('cf_endereco'),
    tribunal_email: GV('cf_email'),
    prefixo_numeracao: GV('cf_prefixo'),
    processos_pagina: GV('cf_pagina')
  };
  apiPost('api/configuracoes/atualizar.php', dados).then(function () {
    showToast('Configuracoes guardadas!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

function guardarConfigSeguranca() {
  var dados = {
    sessao_expira_min: GV('cf_sessao'),
    max_tentativas_login: GV('cf_tentativas'),
    bloqueio_min: GV('cf_bloqueio'),
    registo_auditoria: G('cf_auditoria').checked ? '1' : '0'
  };
  apiPost('api/configuracoes/atualizar.php', dados).then(function () {
    showToast('Guardado!', 'ti-circle-check');
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}

// Sempre entre aspas e com "" a escapar aspas internas — sem isto, uma vírgula
// dentro de Origem/Distribuição (texto livre) desalinhava todas as colunas
// seguintes dessa linha (só "Partes" estava protegido antes desta correcção).
function csvEsc(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function exportarProcessosCSV() {
  apiGet('api/processos/listar.php').then(function (res) {
    var H = ['N Registo Processo', 'N Processo', 'Data Registo', 'Especie', 'Partes', 'Distribuicao', 'Origem',
      'Conclusao', 'Notif/Citacao', 'Visto MP', 'Visto Adj1', 'Visto Adj2',
      'Ins Tabela', 'Acordao', 'Notif Acordao', 'Conta Custas', 'Arquivamento', 'Estado'];
    var R = res.items.map(function (d) {
      return [d.numero_processo, d.numero_processo_externo || '', d.data_registo, d.especie, d.partes,
        d.distribuicao, d.origem, d.conclusao, d.notificacao_citacao, d.visto_mp, d.visto_adjunto1, d.visto_adjunto2,
        d.inscricao_tabela, d.acordao, d.notificacao_acordao, d.conta_custas, d.arquivamento, d.estado].map(csvEsc);
    });
    var csv = [H.map(csvEsc)].concat(R).map(function (r) { return r.join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = 'SGD_Processos.csv';
    a.click();
  }).catch(function (e) { showToast(e.message, 'ti-alert-circle', 'red'); });
}
