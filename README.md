# SGD — Sistema de Gestão de Processos

Tribunal Supremo de Cabo Verde. Aplicação multi-página com backend PHP/MySQL
(autenticação e autorização no servidor, dados persistidos em MariaDB).

## Requisitos
- Apache + PHP 8+ (extensões: pdo_mysql, mysqli, openssl, session)
- MariaDB 10.4+ / MySQL 8+

## Configuração inicial
1. Criar a base de dados e importar o schema:
   ```
   mysql -u <utilizador> -e "CREATE DATABASE sgd_cv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u <utilizador> sgd_cv < database.sql
   ```
2. Preencher `.env` na raiz do projecto (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`).
3. Semear os utilizadores e processos de demonstração (gera as senhas com bcrypt — `database.sql` não inclui credenciais):
   ```
   php scripts/seed.php
   ```
4. Abrir a app através do Apache (ex: `http://localhost/SGD/`, ou directamente `http://localhost/SGD/index.php`).

As credenciais de demonstração ficam definidas em `scripts/seed.php`. Desde 2026-06-25, a criação de
utilizador pela interface (`UtilizadorModel::criar()`) gera uma **senha aleatória por utilizador**
(nunca um valor fixo — um valor fixo ficaria visível para sempre no histórico de um repositório
público), mostrada uma única vez na resposta (`senhaInicial`), tal como já acontecia em "Resetar
senha". Como qualquer senha definida por outra pessoa, a aplicação obriga a troca no primeiro login
seguinte. A única senha ainda fixa é `Senha::INICIAL` (`stj@2026`, em `app/Core/Senha.php`), usada só
pelo bootstrap do `admin` (`instalar.php`/`scripts/seed.php`) antes de existir qualquer interface para
mostrar uma senha gerada — também essa é substituída no primeiro login.

## Arquitectura (MVC leve)
Desde 2026-06-24 a app segue um padrão MVC sem router central — `index.php` (login), `painel.php`,
`processos.php`, etc. (raiz) e os endpoints em `api/**/*.php` mantêm exactamente os mesmos URLs de
sempre, mas passaram a ser shims de ~6 linhas que chamam um Controller em `app/Controllers/`:
```php
require_once __DIR__ . '/app/bootstrap.php';
require_once __DIR__ . '/app/Core/PageGuard.php';
PageGuard::aplicar();
require_once __DIR__ . '/app/Controllers/ProcessoController.php';
(new ProcessoController())->index();
```

**Porque há sempre dois ficheiros com nomes parecidos (ex: `auditoria.php` na raiz e
`app/Views/auditoria/index.php`) — não são duplicados, fazem trabalhos diferentes:**
- `auditoria.php` (raiz) é o **endereço/URL** que o browser pede
  (`https://sgd-stj.sbs/auditoria.php`). É o "porteiro": confirma sessão válida
  (`PageGuard::aplicar()`), confirma permissão (`PageGuard::exigirPerfil(['Administrador'])`,
  quando aplicável) e só depois manda mostrar alguma coisa. **Sem este ficheiro a página não
  tem URL — ninguém consegue chegar lá.**
- `app/Views/auditoria/index.php` é só o HTML que esse "porteiro" manda mostrar depois de
  confirmar tudo. **Nunca é pedido directamente pelo browser** (nem podia: `.htaccess` bloqueia
  acesso directo a `app/`) — não tem nenhuma verificação de sessão/permissão própria, só sabe
  desenhar a página assumindo que já passou pelo porteiro.

Por isso os dois ficheiros nunca podem ser fundidos num só nem um dos dois apagado — um sem o
outro deixa a aplicação sem funcionar (ou sem URL, ou sem ecrã para mostrar).

- `app/Core/` — ligação à BD (`Database`), sessão/autenticação (`Session`, `Auth`), guards de página
  e de API (`PageGuard`, `ApiGuard`), auditoria (`Auditoria`), política de senha (`Senha`), helpers de
  template (`Helpers.php` — `sgd_e()`/`sgd_iniciais()`/`sgd_asset()` continuam funções globais, não
  métodos estáticos, porque são chamadas centenas de vezes dentro das Views) e `View::render()`.
- `app/Models/` — uma classe por domínio (`ProcessoModel`, `UtilizadorModel`, etc.), um método por
  query/operação, sem nenhum `echo`/`http_response_code()`/`exit` (erros voltam como
  `['erro' => ..., 'codigo' => ...]` para o Controller decidir a resposta HTTP).
- `app/Controllers/` — um método por página/endpoint, traduzindo o resultado do Model para o mesmo
  JSON/HTML que a versão anterior já devolvia (formas como `{items:[...]}`, `{processo:{...}}`,
  `{ok:true}` foram preservadas ao byte, porque `js/*.js` já dependia delas).
- `app/Views/<modulo>/index.php` — o HTML que antes estava inline na página raiz, sem alterações de
  conteúdo; continuam a incluir `includes/{head,sidebar,topbar,modais}.php` directamente (esses 4
  partials nunca migraram — são usados por todas as Views por igual).
- `includes/auth_funcoes.php`, `guard.php`, `api_guard.php`, `log.php`, `helpers.php`, `config/sessao.php`,
  `config/conexao.php`, `config/env.php` e `includes/senha.php` foram todos apagados — substituídos 1:1
  pelas classes em `app/Core/`. `diagnostico.php`, `instalar.php` e `scripts/seed.php` (ferramentas de
  deploy/dev, fora do âmbito desta migração de páginas/endpoints) usam directamente `app/Core/Env`,
  `Database` e `Senha` em vez de manter uma implementação duplicada só para eles.

## Histórico e Auditoria
O menu tem dois itens separados — **Histórico** (`auditoria.php`) e **Auditoria** (`auditoria.php?aba=sistema`)
— ambos servidos pela mesma página, só a abrirem em abas diferentes (`js/auditoria.js` lê `?aba=` no
carregamento). As duas abas são alimentadas por tabelas distintas — não são a mesma lista:
- **Histórico de Processos** (`historico_processo` / `api/auditoria/listar.php`): eventos por processo
  (registo, edição, mudança de estado, datas), sempre ligados a um `processo_id`.
- **Auditoria do Sistema** (`auditoria_sistema` / `api/auditoria/sistema.php`): acções administrativas
  sem processo associado — criação/edição/eliminação/activação/desactivação de utilizadores, reset de
  senha e alterações em Configurações. Registada por `Auditoria::registar()` (`app/Core/Auditoria.php`),
  chamada a partir de `UtilizadorModel` e `ConfiguracaoModel`.

Tal como `processos.php`, as duas tabelas têm uma vista em cartões (`.pc-list`) para ecrãs estreitos —
o CSS escondia `.tbl-outer` a partir de 767px e, sem isto, os dados desapareciam em telas pequenas
(`js/auditoria.js` não tinha o `.pc-list` que as outras páginas já tinham). O mesmo problema existia
no "Quadro Resumo por Espécie" em Estatísticas (`js/estatisticas.js`) — corrigido da mesma forma, mas
com um único cabeçalho "Espécie"/"Total" (cor igual à dos `<th>` da tabela real, `var(--sid)`) acima de
todas as linhas, em vez de repetir o rótulo em cada uma.

## Painel Geral
`painel.php` / `js/painel.js` agrega dados de 4 APIs em `Promise.all` e apresenta:
- **3 cards de topo**: Total de Processos Entrados (com filtro de período: todo / este ano / este mês),
  Total Pendentes (estados ≠ concluded/archived) e Total Findos (concluded + archived) — os dois últimos
  reflectem sempre o acumulado global, independentemente do filtro de período.
- **Distribuição por estado**: gráfico de barras horizontais (SVG puro, sem CDN) com o total de cada estado.
- **Processos recentes**: tabela compacta com os 8 processos mais recentes, com link directo ao detalhe
  (`processos.php?ver=<numero_processo>`).
- **Gráfico volumétrico**: barras agrupadas SVG (Registados vs Concluídos) por mês (13 meses) ou por ano
  (5 anos), com toggle Mensal/Anual.
- **Produtividade por Juiz Relator**: tabela com total, pendentes, findos e taxa de conclusão (barra
  proporcional verde/amber/vermelho) por `distribuicao`.

Todos os gráficos do painel usam SVG puro — sem dependência de Chart.js nem de qualquer CDN.

## Estatísticas e Relatórios
`estatisticas.php` / `js/estatisticas.js` reorganizados em 5 tabs independentes, cada um com gráfico
(Chart.js) e tabela detalhada, filtráveis por utilizador e intervalo de datas:

| Tab | API | Gráfico | Exportação |
|---|---|---|---|
| **Por Período** | `volume.php` (Mensal/Anual) | Barras agrupadas fixas | Período, Reg., Conc., Saldo |
| **Por Juiz Relator** | `produtividade.php` | Barras horizontais fixas | Juiz, Total, Pendentes, Findos, Taxa % |
| **Por Espécie** | `distribuicao.php → porEspecie` | Barras/Pizza/Linha (selector) | Espécie, Total |
| **Por Estado** | `distribuicao.php → porEstado` | Barras/Pizza/Linha (selector) | Estado, Total |
| **Por Origem** | `distribuicao.php → porOrigem` | Barras horizontais/Pizza/Linha | Origem, Total |

`EstatisticaModel::distribuicao()` devolve agora também `porOrigem`: agrupamento por `processos.origem`
(campo texto livre; fallback "Sem origem"; LIMIT 30), com os mesmos filtros de data/utilizador.
`EstatisticaModel::volume()` e `EstatisticaModel::produtividade()` servem tanto o Painel como a tab
correspondente de Estatísticas. Os botões **PDF** e **Excel** exportam apenas o tab activo.
O selector `#fTipoGrafico` (Barras/Pizza/Linha) actua sobre os tabs Espécie, Estado e Origem; os tabs
Período e Juiz usam tipo de gráfico fixo (adequado a dados de série temporal e texto longo,
respectivamente). Botão "Imprimir" usa `window.print()` com a barra de filtros e os tabs escondidos
via `.no-print`.

## Estrutura de ficheiros
```
SGD/
├── index.php (login), painel.php, processos.php, conclusao.php, vistos.php,
│   estatisticas.php, utilizadores.php, perfil.php, configuracoes.php, auditoria.php
│   (shims finos — ver "Arquitectura (MVC leve)"). index.php é a página de login
│   em vez de um login.php separado: o Apache já serve index.php por defeito
│   para "/" sem precisar de DirectoryIndex no .htaccess (bloqueado no Hostinger).
├── instalar.php        ← cria o admin em produção sem SSH (ver "Deploy em produção"); apagar após uso
├── diagnostico.php     ← diagnóstico temporário de ligação à BD; apagar depois de usar
├── app/
│   ├── bootstrap.php
│   ├── Core/           ← Database, Session, Auth, PageGuard, ApiGuard, Auditoria, Senha, Helpers, View
│   ├── Models/         ← um por domínio (ProcessoModel, UtilizadorModel, EstatisticaModel, ...)
│   ├── Controllers/    ← um por domínio, um método por página/endpoint
│   └── Views/<modulo>/index.php ← HTML por módulo
├── includes/           ← só os 4 partials de layout partilhados por todas as Views (bloqueado por .htaccess)
├── api/                ← endpoints PHP (JSON), shims finos que chamam app/Controllers/
├── scripts/seed.php    ← seed de desenvolvimento (bcrypt; bloqueado por .htaccess)
├── assets/img/         ← logótipo e outras imagens estáticas (acesso directo, sem bloqueio)
├── css/estilos.css
├── js/                 ← um ficheiro JS por módulo + comum.js/api.js partilhados
└── database.sql        ← schema MariaDB (tabelas, views, triggers)
```

## Módulos
Painel Geral · Lista de Processos · Conclusão · Vistos · Estatísticas e Relatórios · Utilizadores · Configurações.

## Configurações (parametrização do sistema)
`configuracoes.php` / `js/configuracoes.js` — exclusivo do perfil Administrador, organizado em 6 tabs:

| Tab | Conteúdo | Endpoints |
|---|---|---|
| **Dados Institucionais** | Nome, endereço e email do tribunal; prefixo de numeração e processos/página | `api/configuracoes/atualizar.php` |
| **Espécies Processuais** | Tabela CRUD: criar, editar nome (inline), activar/desactivar, eliminar (só se sem processos associados) | `especies-listar`, `criar`, `atualizar`, `toggle`, `eliminar` |
| **Estados do Processo** | Editar só a etiqueta de apresentação; código interno (`entry`, `analysis`, …) e classe CSS do badge são fixos | `estados-listar`, `estados-atualizar` |
| **Perfis de Utilizador** | Editar só a descrição; código (`Administrador`, `Secretaria`, `Visualizador`) e flags de permissão são fixos e mostrados como badges | `perfis-listar`, `perfis-atualizar` |
| **Departamentos** | CRUD: criar (nome + sigla), editar inline (nome e sigla simultâneos), activar/desactivar, eliminar (só se sem utilizadores associados); coluna "Utilizadores" mostra quantos utilizam cada departamento | `departamentos-listar`, `criar`, `atualizar`, `toggle`, `eliminar` |
| **Magistrados** | Tabela CRUD: criar, editar nome (inline), activar/desactivar, eliminar (só se sem processos associados); alimenta o combobox de Distribuição/Redistribuição no formulário de Processos | `magistrados-listar`, `criar`, `atualizar`, `toggle`, `eliminar` |
| **Sistema** | Segurança (sessão, tentativas de login, bloqueio, auditoria); exportação de todos os processos em CSV | `api/configuracoes/atualizar.php` |

Edição inline funciona por linha: botão lápis mostra `<input>` e esconde `<span>`, botão guardar envia ao servidor e actualiza o DOM sem recarregar; botão cancelar repõe o valor original (guardado em `data-*`). Departamentos editam nome e sigla em simultâneo na mesma linha. A eliminação de espécies/departamentos usa `cfDlg()` de confirmação antes de chamar o endpoint; o backend recusa com HTTP 409 se existirem processos/utilizadores associados.

**Campos obrigatórios nos processos**: Estado de Processo e Distribuição (Juiz Relator) são campos
obrigatórios tanto na criação como na edição — validados no frontend (`js/processo-form.js`,
com `err-input` nos campos em falta) e no backend (`ProcessoModel::criar()`/`atualizar()`).

**Redistribuição — dois campos distintos, de propósito**: `processos.redistribuicao` (texto — nome do
novo magistrado) e `datas_controlo.redistribuicao_data` (data — quando a redistribuição aconteceu) são
colunas de tabelas diferentes e nunca podem ter o mesmo alias na mesma vista (`v_processos_completos`),
senão uma pisa a outra no `fetch()` do PDO. O campo de data fica em "Datas de Controlo Processual" (só
disponível ao editar, tal como os restantes — Conclusão, Vistos, Acórdão, etc.); o campo de texto fica
em "Identificação do Processo", disponível já na criação. Migração: `scripts/migrar_redistribuicao_data.php`
(ou `sql/migracao_2026-07-11.sql` para colar directamente no phpMyAdmin).

**Tabela da Lista de Processos — coluna Redistribuição (2026-07-22)**: a tabela desktop
(`tblHTML()` em `js/processos.js`) ganhou uma 11ª coluna "Redistribuição", colocada a seguir a
Distribuição. Mostra `processos.redistribuicao` (texto — nome do novo magistrado), **não**
`datas_controlo.redistribuicao_data` (data) — mesmo par de campos distintos descrito acima, mas aqui
importa mostrar o mesmo tipo de informação que a coluna "Distribuição" já mostra (quem, não quando).
Primeira tentativa usou o campo de data por engano; como nenhum processo tinha essa data preenchida
na BD (`datas_controlo.redistribuicao_data` estava sempre `NULL`), a coluna aparecia sempre vazia —
corrigido para ler o campo de texto, que já tinha dados reais nalguns processos. Para abrir espaço
sem alargar a tabela toda, as colunas de formato curto e fixo — Data de Registo (118→90px), Nº de
Processo (130→82px), Data Entrada (78→60px) e Estado (75→65px) — foram encolhidas rente ao conteúdo
em `css/estilos.css` (`.pt col.c-datareg`/`.c-numext`/`.c-date`/`.c-est`); seguro porque `.tdl` já
corta com ellipsis em vez de partir o layout. A nova `.pt col.c-redist` fica com 90px. `min-width`
da `.pt` foi de 1081px para 1100px (ao acrescentar a coluna) e depois para 1067px (com o segundo
encolhimento).

**Distribuição e Redistribuição — de texto livre a combobox configurável (2026-07-22)**: os campos
Distribuição (Juiz/Relator) e Redistribuição no formulário de Processos (`js/processo-form.js`)
passaram de `<input>` de texto livre a `<select>`, para reduzir erros de digitação (nomes já
apareciam na BD com grafias inconsistentes — "Ana", "Ana teresa", "Ana Paula Joana"). As opções vêm
de uma nova tabela `magistrados` (id, nome, activo, ordem — igual em forma a `especies_processo`),
gerida na nova tab **Magistrados** em Configurações. Importante: `processos.distribuicao` e
`processos.redistribuicao` continuam `VARCHAR(150)` livre, **sem FK** para `magistrados` — a tabela só
alimenta as opções do combobox, à semelhança de como `departamentos` alimenta o `<select>` de
Departamento no formulário de Utilizador (`window.SGD_DEPARTAMENTOS`, `js/utilizadores.js`), sem FK
directa nesse caso também. Decidiu-se não migrar para FK porque isso obrigaria a normalizar dados
antigos com grafias inconsistentes antes da migração — fora do âmbito deste pedido.
`ProcessoModel::listarMagistradosActivos()` expõe a lista activa como `window.SGD_MAGISTRADOS` (só
nomes, tal como `SGD_ESPECIES`); a tab de Configurações usa endpoints `api/configuracoes/magistrados-*.php`
próprios (`ConfiguracaoModel`/`ConfiguracaoController`, `Administrador`-only), com eliminação
bloqueada (HTTP 409) se algum processo tiver esse nome em `distribuicao` OU `redistribuicao` (só por
igualdade de texto, já que não há FK). Migração: `scripts/migrar_magistrados.php` (ou
`sql/migracao_2026-07-22.sql` para colar directamente no phpMyAdmin) cria a tabela e semeia-a com os
nomes já usados em `processos.distribuicao`/`redistribuicao`, para nenhum valor existente desaparecer
do combobox ao editar processos antigos.

**Data de Distribuição e Nº de Acórdão (2026-07-22)**: `processos.distribuicao_data` (DATE, nova
coluna) fica ao lado de Distribuição em "Identificação do Processo" (disponível já na criação, ao
contrário de `datas_controlo.redistribuicao_data`, que só existe ao editar) — mostra quando o processo
foi distribuído, não só a quem. A linha de Redistribuição passou a ficar ao lado de Estado de Processo
(antes ficava sozinha numa linha). `datas_controlo.numero_acordao`/`numero_acordao2`/`numero_acordao3`
(VARCHAR(50), novas colunas) guardam o número de cada acórdão ao lado do respectivo campo de data; o
campo de data ficou mais estreito (nova classe `.fg2-tight` em `css/estilos.css`, grid `1fr 1.4fr` em
vez do `1fr 1fr` de `.fg2`, incluída no breakpoint móvel que empilha as colunas) para dar mais espaço
ao número, que é texto livre (ex: "123/2026") e tende a ser mais longo que uma data. Tal como
`distribuicao`/`redistribuicao`, `distribuicao_data` é actualizada de forma condicional em
`ProcessoModel::atualizar()` — só quando a chave vem no pedido — para chamadas parciais (ex: `dtSt()`,
mudança rápida de estado a partir do modal de detalhe) não apagarem a data ao não a reenviarem; os
campos `numero_acordao*` seguem o mesmo mecanismo dos restantes campos de `datas_controlo` (só tocados
quando presentes no payload). Migração: `scripts/migrar_distribuicao_data_numero_acordao.php` (ou
`sql/migracao_2026-07-22b.sql` para colar directamente no phpMyAdmin).

**Menu de ações (⋮) na Lista de Processos (2026-07-22)**: a coluna Acções da tabela desktop
(`js/processos.js`) tinha 3 botões-ícone lado a lado (Ver/Editar/Eliminar); passou a ter um único
botão "⋮" que abre um menu com Visualizar/Editar/Eliminar (Editar só para quem `podeEditar()`,
Eliminar só para `isAdm()`, tal como antes). O menu é um elemento único e partilhado,
`#acoesMenuFloat` (`includes/modais.php`), reaproveitado por todas as chamadas — `abrirMenuAcoes(botao,
itensHtml)` em `js/comum.js` troca o seu conteúdo e reposiciona-o junto ao botão clicado a cada
abertura. **Tem de ser `position:fixed`, não `absolute`**: `.pt td` usa `overflow:hidden` (para o
`text-overflow:ellipsis` das outras colunas), o que cortaria um menu posicionado dentro da própria
célula; `fixed` escapa a esse clipping e a posição é calculada em JS a partir de
`getBoundingClientRect()` do botão, com fallback para abrir para cima se não houver espaço por baixo
até ao fim da janela. Fecha em scroll/resize/Escape/clique fora (mais simples do que reposicionar em
tempo real). `js/processos.js` só constrói a lista de itens (`abrirMenuAcoesProcesso()`) — a mecânica
de posicionamento/abertura/fecho é genérica e reutilizável por outras tabelas no futuro. A coluna
Acções encolheu de 90px (3 botões) para 48px (1 botão); o espaço libertado foi para Intervenientes
(170px → 212px).

**Campos de data mais estreitos no formulário de Processos (2026-07-22)**: todos os `<input
type="date">` dentro do modal de criar/editar processo (`#crudB`) passaram a ter `max-width:150px`
(`#crudB .fg input[type="date"]` em `css/estilos.css`) — datas são sempre "dd/mm/aaaa", não precisam
de esticar até ao fim da coluna da grid como um campo de texto livre. Scoped a `#crudB` para não
afectar os campos de data de Conclusão/Vistos, que vivem fora deste contentor.

**Grids compactas — `.fg2-tight`/`.fg3-tight` (2026-07-22)**: ao contrário de `.fg2`/`.fg3` (colunas
`1fr`, esticam até preencher a linha), estas duas novas classes usam colunas de largura fixa em px —
os campos ficam com o tamanho do próprio conteúdo, alinhados à esquerda, com o resto da linha em
branco, para não haver campos curtos (datas, números de registo) esticados a ocupar meia linha à toa.
`.fg2-tight` (`150px 190px`) pareia Data + Nº — usada nas 3 linhas de Acórdão (Acordao/2º/3º Acordao
+ respectivo Nº do Acordao). `.fg3-tight` (`150px 150px 220px`) agrupa Nº de Registo + Data de Registo
+ Nº de Processo numa única linha em "Identificação do Processo" (antes eram 2 linhas `.fg2` de 2
colunas cada — 4 campos, incluindo Data de Entrada, que passou para a sua própria linha). Tal como
`.fg2`/`.fg3`, ambas colapsam para 1 coluna no breakpoint móvel (`@media(max-width:767px)`).

**Lista de Processos: coluna "Processos" fundida + responsividade fluida (2026-07-22)**: história
completa de como a tabela desktop chegou ao estado actual, do mais para o menos importante:

- *Colunas fundidas*: "Nº de Registo de Processo" e "Nº de Processo" eram 2 colunas; passaram a 1 só
  ("Processos", `c-proc`), cada célula com 4 linhas empilhadas — rótulo "Nº DE PROCESSO" (`.td0-lbl`
  — maiúsculas pequenas, cinza, negrito, deliberadamente diferente do estilo dos valores para não se
  confundirem) + valor de `numero_processo_externo` em destaque (`.td0` — mono, azul, negrito),
  depois rótulo "Nº DE REGISTO" + valor de `numero_processo` (código interno, ex: "SGD-2026-0001") em
  `.td0-sub`, mais discreto. Sem Nº de Processo externo (campo opcional), mostra só "Nº DE REGISTO" +
  valor em destaque, sem repetir informação.
- *Intervenientes/Partes já não trunca* — em vez de `trunc(d.partes, N)` + "..." (nunca se acertava N
  à largura da coluna: ou cortava demais, ou voltava a transbordar), mostra o texto completo com nova
  classe `.td-wrap` (`white-space:normal; word-break:break-word`, ao contrário de `.tdl`, que força
  `nowrap`+ellipsis) — quebra para 2ª linha em vez de cortar, à custa da linha ocasionalmente ficar
  mais alta.
- *Espécie ganhou `trunc(d.especie, 22)`* — não tinha nenhum corte em JS (nomes reais até 59
  caracteres, ex: "Recurso Contencioso Administrativo com Pedido de Suspensão"), só confiava no
  `overflow:hidden` do `.tdl`, que não protege bem um `<span class="badge">` lá dentro (o badge tem o
  seu próprio `white-space:nowrap`, por isso escapava ao ellipsis do pai).
- *Acções fica fixa à direita ao fazer scroll horizontal* — a coluna mais útil quando a tabela não
  cabe (tem os controlos) era a que ficava mais facilmente fora de vista. Novo `.th-act` no cabeçalho
  (a par do `.td-act` já existente no corpo) com `position:sticky; right:0` em ambos — ficam colados
  à borda direita do `.tbl-outer` durante o scroll. `.td-act` leva `background:var(--white)` +
  `box-shadow` para não deixar o conteúdo por baixo transparecer; o zebra-striping/hover (mais
  específicos) continuam a sobrepor essa cor base normalmente. `getBoundingClientRect()` em
  `abrirMenuAcoes()` lê sempre a posição real no ecrã, por isso o menu de ações continua a
  posicionar-se bem mesmo com o botão sticky.
- *Bug real por trás de "as colunas desaparecem" em ecrãs grandes* — não era falta de scroll, era um
  bug de layout: `.content` (wrapper principal da página) é item de um flex `column` (`.main`) mas não
  tinha `min-width:0` — por omissão, um item de flex recusa-se a encolher abaixo da largura mínima
  intrínseca do seu conteúdo, `.content` nunca conseguia encolher o suficiente para o
  `overflow-x:auto` de `.tbl-outer` chegar a ser necessário, e `body { overflow-x:hidden }` acabava
  por cortar directamente as últimas colunas em vez de as deixar alcançáveis por scroll. Corrigido com
  `min-width:0` em `.content` (`css/estilos.css`) — o fix clássico para "flex item com descendente
  `overflow:auto` que não faz scroll, empurra tudo para fora em vez disso".
- *Larguras fixas em px → percentagens fluidas* — a abordagem inicial foi medir o comprimento real dos
  dados na BD (`SELECT MAX(LENGTH(...))`) e dar a cada coluna largura fixa em px suficiente, o que
  levou a um `min-width` cada vez maior (1067px → 1276px → 1358px) e a ter de ajustar o breakpoint de
  cartões manualmente sempre que a largura mudava (1400px → 1500px → 1700px) — nunca convergia para
  "cabe em qualquer monitor". A tabela de Auditoria (`js/auditoria.js`) já resolvia isto de forma mais
  simples: `table-layout:fixed` sem `min-width` forçado, tabela sempre a 100% do contentor. Adoptada a
  mesma técnica aqui — colunas em `%` em vez de px (mantendo as proporções relativas já afinadas:
  Intervenientes 18% > Distribuição/Redistribuição 12% > Espécie/Origem/Processos 11% > Data de
  Registo 9% > Data Entrada/Estado 6% > Acções 4%) e removido o `min-width` da `.pt`. Isto elimina de
  vez a necessidade de um breakpoint de cartões dedicado a esta página — a tabela cabe sempre em
  qualquer largura ≥767px (o breakpoint móvel geral, partilhado com o resto da app), tal como
  Auditoria já fazia.
- *Só linhas horizontais entre processos, sem grelha vertical* — pedido explicitamente para
  uniformizar com Auditoria (que usa a mesma classe `.pt`): `border` a toda a volta em `.pt th`/`.pt
  td` passou a `border-top`+`border-bottom` só, directamente na regra base (já não scoped a uma
  página) — afecta as duas tabelas por igual. `border-collapse:collapse` continua a fundir as bordas
  horizontais entre linhas adjacentes normalmente.

Letras maiores continuam scoped só à Lista de Processos (`body[data-pagina="processos"] .pt td`/
`.tdd`/`.td0`/`.td0-sub`/`.td0-lbl`/`.pt .badge`), por ser um pedido específico dessa página — `.pt`/
`.tdd`/`.td0` são partilhadas com Auditoria, por isso o scope evita alterar o tamanho de letra lá.

**Cabeçalho da tabela de Utilizadores uniformizado com o resto da app (2026-07-22)**: a página
Utilizadores (`js/utilizadores.js`) não usa a classe partilhada `.pt` — tem a sua própria tabela com
estilos inline (`thS`), porque as colunas são só 6 e não precisam do sistema de larguras/colgroup das
tabelas maiores. O cabeçalho tinha fundo claro (`var(--bg)`, texto `var(--tx2)`), diferente do fundo
escuro `var(--sid)` + texto branco usado em `.pt th` (Processos, Auditoria) — corrigido para o mesmo
`background:var(--sid); color:#fff` (e a borda ajustada de `2px solid var(--border)` para `1px solid
rgba(255,255,255,.12)`, a mesma usada em `.pt th`, já que uma borda cinza clara não fazia sentido
sobre fundo escuro). Alinhamento do texto (esquerda, ao contrário do centro de `.pt th`) manteve-se —
não foi pedido, e faz sentido para uma coluna como "Nome".

**Gráfico "Registados vs Concluídos" preenche todo o espaço do painel (2026-07-22)**: no Painel
Geral, este painel fica lado a lado com "Processos Recentes" num CSS Grid de 2 colunas
(`grid-template-columns:1fr 1fr`) — por omissão, grid estica os itens (`align-items:stretch`) à
altura do mais alto da linha; como "Processos Recentes" mostra até 8 linhas de tabela, ficava quase
sempre mais alto do que o gráfico (SVG com altura fixa, `max-height:148px`), deixando espaço vazio no
fundo do painel do gráfico. Corrigido tornando o `.panel` num flex `column`
(`renderVolumeGrafico()`) e o SVG (`svgBars()`) num filho `flex:1` — a `<svg>` passou de `width:100%`
+ `max-height:148px` fixo para `position:absolute;inset:0;width:100%;height:100%` dentro de um wrapper
`flex:1;position:relative`, com `preserveAspectRatio="none"` para esticar o conteúdo (não deixar
"letterboxing", a área em branco à volta que o comportamento por omissão do viewBox — "meet",
preserva proporção — deixaria). O sistema de coordenadas interno mantém-se em 460×148 unidades; o
`viewBox` escala tudo (barras, grelha, texto) não-uniformemente para preencher a caixa real, seja
qual for a altura que o grid lhe der.

**Notificações (toast)**: `showToast(msg, icon, type)` em `js/comum.js` apresenta uma notificação
centrada no ecrã com fundo branco, borda colorida esquerda e barra de progresso de 3 s. O parâmetro
`type` aceita `'red'` (erro), `'amber'` (aviso) e `'blue'` (informação); omitido = verde (sucesso).
O HTML em `includes/modais.php` inclui `#toast-bar`; o CSS em `css/estilos.css` anima a barra via
`@keyframes toast-shrink` (reinicia correctamente se um novo toast aparecer antes do anterior fechar).

## Parâmetros de URL que abrem algo automaticamente
`processos.php?novo=1` (abre "Novo Processo") e `processos.php?ver=<numero>` (abre o detalhe desse
processo) limpam o parâmetro da URL com `history.replaceState()` logo depois de o consumir
(`js/processos.js`) — sem isto, dar refresh no browser reabria sempre o formulário/detalhe (vazio,
no caso do formulário), porque o parâmetro continuava na barra de endereço.

## Formulários (modais)
O modal `#crudM` (Novo/Editar Processo, Novo/Editar Utilizador) não fecha ao clicar fora nem com Esc —
só o botão "Cancelar" (`closeCrud()`) ou o "×" fecham (`js/comum.js`). Evita perder dados a meio do
preenchimento por um clique a seguir. O modal de detalhe (`#detM`, só leitura) continua a fechar normalmente.

## Navegação
O logótipo na sidebar (`includes/sidebar.php`, partilhado por todas as páginas autenticadas) liga
sempre a `painel.php` — a página inicial da plataforma depois do login.

## Permissões
O sistema tem exactamente três perfis:

| Funcionalidade | Administrador | Secretaria | Visualizador |
|---|:---:|:---:|:---:|
| Consultar processos | ✓ | ✓ | ✓ |
| Exportar relatórios (Estatísticas) | ✓ | ✓ | ✓ |
| Registar processo | ✓ | ✓ | — |
| Editar processo | ✓ | ✓ | — |
| Eliminar processo | ✓ | — | — |
| Conclusão / Vistos | ✓ | ✓ | — |
| Criar / Editar / Eliminar utilizadores | ✓ | — | — |
| Parametrizar o sistema (Configurações) | ✓ | — | — |
| Consultar Auditoria e Histórico | ✓ | — | — |

A lógica de controlo de acesso usa dois mecanismos ortogonais:
- `Auth::podeEditar()` / `PageGuard::exigirEscrita()` / `ApiGuard::exigirEscrita()` — bloqueiam o
  perfil Visualizador de qualquer operação de escrita (criar/editar processo, registar conclusão ou
  vistos). Administrador e Secretaria passam sempre.
- `PageGuard::exigirPerfil(['Administrador'])` / `ApiGuard::exigirPerfil(['Administrador'])` — reservam
  páginas e endpoints exclusivos do Administrador (utilizadores, configurações, auditoria, eliminar
  processo).

A sidebar adapta-se automaticamente: "Controlo Processual" (Conclusão/Vistos) só aparece quando
`sgd_pode_editar()` é verdadeiro; "Utilizadores", "Configurações", "Histórico" e "Auditoria" só
aparecem quando `sgd_perfil() === 'Administrador'`.

Nome e nome de utilizador só são editáveis pelo Administrador (em Utilizadores); cada utilizador pode
trocar apenas a própria senha em "O Meu Perfil".

## Tecnologias
- Backend: PHP 8 (PDO, prepared statements), MariaDB/MySQL
- Frontend: HTML5 + CSS3 + JavaScript (sem frameworks), `fetch` para a API
- Gráficos: SVG puro (Painel — sem CDN); Chart.js 4 (Estatísticas — barras/pizza/linha seleccionáveis)
- Exportação: jsPDF + jsPDF-AutoTable (PDF), SheetJS/xlsx (Excel), impressão via `window.print()`
- Ícones: Tabler Icons v2.44 · Fontes: IBM Plex Sans/Mono (Google Fonts)

## Deploy em produção (Hostinger)
1. **Plano**: escolher um plano com PHP 8, MySQL e, idealmente, acesso SSH (hPanel → Avançado →
   Acesso SSH) — necessário para correr `scripts/seed.php` na primeira instalação. Sem SSH, o seed
   tem de ser adaptado para correr uma única vez via browser (não incluído por defeito, porque
   `scripts/seed.php` rejeita invocação fora da CLI de propósito).
2. **Domínio**: associar o domínio (ou subdomínio) ao plano em hPanel → Domínios, apontando para a
   pasta onde o código vai ficar (normalmente `public_html/`).
3. **Base de dados**: criar uma base de dados MySQL em hPanel → Bases de Dados → Gestor de Bases de
   Dados (nome, utilizador e senha próprios — nunca reutilizar `root` sem senha como em desenvolvimento
   local). O host é normalmente `localhost`, porta `3306`.
4. **Código**: enviar os ficheiros para `public_html/` — via hPanel → Git (ligar directamente ao
   repositório `https://github.com/Nascimneto/SGDSTJ`) ou por Gestor de Ficheiros/FTP.
5. **`.env`**: criar manualmente o ficheiro `.env` no servidor (não existe no Git — ver `.env.example`)
   com as credenciais reais da base de dados criada no passo 3. Nunca commitar este ficheiro.
6. **Schema**: importar `database.sql` via phpMyAdmin (hPanel → Bases de Dados → phpMyAdmin →
   Importar) na base de dados criada no passo 3.
7. **Criar o admin inicial** — duas formas, conforme o plano:
   - **Com SSH** (hPanel → Avançado → Acesso SSH): `cd public_html && php scripts/seed.php` — cria o
     `admin` e também processos de demonstração (úteis em staging, dispensáveis em produção real).
   - **Sem SSH**: definir `INSTALL_TOKEN` no `.env` (um valor aleatório só teu) e abrir
     `https://<dominio>/instalar.php?token=<o-mesmo-valor>` — cria só o utilizador `admin`, sem dados
     de demonstração. Depois de confirmar a criação, **apagar `instalar.php` e remover `INSTALL_TOKEN`
     do `.env`** — o ficheiro fica inútil sem token, mas não vale a pena deixá-lo exposto.
   - Em ambos os casos, a senha inicial é `stj@2026`, com troca obrigatória no primeiro login.
8. **SSL/HTTPS**: activar o certificado gratuito em hPanel → Segurança → SSL (Let's Encrypt) — costuma
   ficar activo em poucos minutos. O `.htaccess` já força o redireccionamento `http://` → `https://`.
9. Confirmar o login em `https://<dominio>/` e trocar a senha do `admin` imediatamente.

## Segurança
- Sessões PHP (`httponly`, `SameSite=Strict`), senhas com `password_hash()` (bcrypt)
- RBAC aplicado no servidor (`app/Core/PageGuard.php`, `app/Core/ApiGuard.php`), nunca só no cliente
- Rate limiting de login (`max_tentativas_login`/`bloqueio_min`, parametrizável em Configurações)
- Política de senha (`app/Core/Senha.php`): mínimo 8 caracteres, com pelo menos uma letra e um número
- Senha inicial aleatória por utilizador na criação (nunca um valor fixo — ver nota em "Configuração
  inicial") — nunca escolhida pelo Administrador
- "O Meu Perfil" (`perfil.php`/`api/perfil/atualizar.php`) só permite ao próprio trocar a senha — nome
  e utilizador nunca são editáveis por esta via, só pelo Administrador (`api/utilizadores/atualizar.php`)
- Toda a acção administrativa sobre utilizadores e configurações fica registada em `auditoria_sistema`
  (ver secção "Histórico e Auditoria" abaixo) — incluindo eliminação, que antes não deixava rasto nenhum
- Sempre que a senha de um utilizador é definida por outra pessoa — criação, edição pelo Administrador
  ou "Resetar senha" — a conta fica marcada com `obrigar_troca_senha`; `PageGuard::aplicar()`
  (`app/Core/PageGuard.php`) bloqueia o acesso a qualquer página até o utilizador trocar a senha em
  `perfil.php`, que só dá acesso ao resto da plataforma depois da troca
- Aviso de sessão a expirar (`js/comum.js`, ~2min antes de `sessao_expira_em`, reutilizando o diálogo
  de confirmação com botões renomeados para "Sim"/"Não"): **Sim** chama `api/auth/renovar.php` e fica
  na página onde o utilizador está (ex: não perde a edição de um processo a meio); **Não** vai para
  `painel.php`. A antecedência do aviso nunca excede metade do tempo restante da sessão — sem isto,
  sessões configuradas mais curtas que os 2 minutos de antecedência (ex: `sessao_expira_min` baixo,
  usado para testar a funcionalidade) faziam o aviso reaparecer de imediato a cada fecho, dando a
  sensação de que os botões não faziam nada. Se a renovação falhar por qualquer motivo (sessão já
  realmente expirada, rede em baixo), o utilizador é sempre avisado e reencaminhado para `index.php`
  em vez do diálogo fechar sem dar nenhum feedback.
- `UtilizadorModel::eliminar()` apanha a violação de chave estrangeira (código SQLSTATE `23000`) quando
  o utilizador a eliminar tem processos/histórico/ficheiros associados, devolvendo um erro 409 claro em
  vez de deixar cair um erro fatal do PHP sem resposta JSON válida — sem isto, o pedido continuava a
  parecer bem-sucedido para o browser (o PHP não define automaticamente o estado HTTP num erro não
  apanhado) e a interface mostrava "Utilizador eliminado" mesmo sem nada ter sido apagado
- `.htaccess` bloqueia acesso directo a `.sql`/`.env`/`.md` e às pastas `includes/`, `app/`, `scripts/`
- `.htaccess` força HTTPS (redireccionamento 301 de `http://` para `https://`) em produção
- `.env` está em `.gitignore` — nunca é versionado; usar `.env.example` como modelo
- `instalar.php` (raiz) só responde se `INSTALL_TOKEN` estiver definido no `.env` e for passado em
  `?token=` — fail-closed por defeito (token vazio = 404 sempre); usar e apagar logo a seguir (ver
  secção "Deploy em produção")
