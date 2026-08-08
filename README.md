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
- **4 cards de topo**: Processos Registados e Processos de Entrada (ambos com filtro de período: todo /
  este ano / este mês), Total Pendentes (estados ≠ concluded/archived) e Total Findos (concluded +
  archived) — os dois últimos reflectem sempre o acumulado global, independentemente do filtro de
  período.
- **Distribuição por estado** e **Produtividade por Juiz Relator** lado a lado (`.row2`): gráfico de
  Pizza (total por estado) e gráfico de coluna agrupada (Pendentes/Findos por juiz), ambos Chart.js.
- **Processos recentes**: tabela compacta com os 8 processos mais recentes, com link directo ao detalhe
  (`processos.php?ver=<numero_processo>`).
- **Gráfico volumétrico**: barras agrupadas SVG (Registados vs Concluídos) por mês (13 meses) ou por ano
  (5 anos), com toggle Mensal/Anual.

Adicionado (2026-07-26): "Distribuição por Estado" e "Produtividade por Juiz Relator" passaram de
markup puro (barras `div`/CSS) para gráficos Chart.js (`desenharGraficoEstadoPainel()`,
`desenharGraficoJuizPainel()`, ambos em `js/painel.js`) — o gráfico volumétrico "Registados vs
Concluídos" continua em SVG puro, sem alteração. Isto exigiu carregar `chart.js` e
`chartjs-plugin-datalabels` em `app/Views/painel/index.php` (antes só `estatisticas.php` os
carregava). `CHART_PAINEL_ESTADO`/`CHART_PAINEL_JUIZ` são destruídos no início de `renderPainel()`
antes de recriar os canvas, para o toggle de período (Todo/Ano/Mês) não acumular instâncias Chart.js
órfãs a apontar para um `<canvas>` já substituído.

Alterado (2026-07-26): "Produtividade por Juiz Relator" perdeu a tabela por baixo do gráfico (ficou só
o gráfico de coluna agrupada) e passou a ficar lado a lado com "Distribuição por Estado" (`.row2`), em
vez de estar num painel próprio, largura total, abaixo da linha "Processos Recentes"/"Registados vs
Concluídos". O detalhe por juiz (tabela completa) continua disponível no tab "Por Juiz Relator" de
Estatísticas.

Corrigido e adicionado (2026-07-27): o card "Processos Entrados" na verdade sempre contou por
`processos.data_registo` (quando o processo foi registado no sistema), nunca por `data_entrada` (quando
o processo deu entrada) — nome corrigido para "Processos Registados", para não confundir as duas datas.
Adicionado um card novo, "Processos de Entrada", que conta por `data_entrada` com os mesmos filtros de
período/utilizador — `EstatisticaModel::resumo()` ganhou `condicoesPorCampo(array $get, string
$campoData)` (extraído de `condicoes()`, que passou a chamá-lo com `'p.data_registo'`) para reutilizar a
mesma lógica de filtros com outra coluna de data, devolvendo `entrada_total`/`entrada_total_acumulado`
ao lado de `total`/`total_acumulado`. Grid de cards passou de 3 para 4 colunas
(`grid-template-columns:repeat(4,1fr)`).

## Estatísticas e Relatórios
`estatisticas.php` / `js/estatisticas.js` reorganizados em 5 tabs independentes, cada um com gráfico
(Chart.js) e tabela detalhada, filtráveis por utilizador e intervalo de datas:

| Tab | API | Gráfico | Exportação |
|---|---|---|---|
| **Por Período** | `volume.php` (Mensal/Anual) | Barras agrupadas/Pizza/Linha (selector) | Período, Reg., Conc., Saldo |
| **Por Juiz Relator** | `produtividade.php` | Coluna agrupada (Pendentes/Findos)/Pizza/Linha (selector) | Juiz, Total, Pendentes, Findos, Taxa % |
| **Por Espécie** | `distribuicao.php → porEspecie` | Barras/Pizza/Linha (selector) | Espécie, Total |
| **Por Estado** | `distribuicao.php → porEstado` | Barras/Pizza/Linha (selector) | Estado, Total |
| **Por Origem** | `distribuicao.php → porOrigem` | Coluna agrupada (Pendentes/Findos)/Pizza/Linha (selector) | Origem, Total |

`EstatisticaModel::distribuicao()` devolve agora também `porOrigem`: agrupamento por `processos.origem`
(campo texto livre; fallback "Sem origem"; LIMIT 30), com os mesmos filtros de data/utilizador.
`EstatisticaModel::volume()` e `EstatisticaModel::produtividade()` servem tanto o Painel como a tab
correspondente de Estatísticas. Os botões **PDF** e **Excel** exportam apenas o tab activo.
O selector `#fTipoGrafico` (Barras/Pizza/Linha) actua sobre os 5 tabs. Em "Por Período" a opção Pizza
agrega o intervalo filtrado em duas fatias (Registados/Concluídos), já que o gráfico normal tem duas
séries ao longo do tempo; em "Por Juiz Relator" a Pizza mostra a proporção de processos por juiz e a
Linha desenha os mesmos valores em vez de barras horizontais. Botão "Imprimir" usa `window.print()` com
a barra de filtros e os tabs escondidos via `.no-print`.

Corrigido (2026-07-26): a opção "Linha" não tinha efeito nos tabs Espécie/Estado/Origem —
`desenharGraficoSimples()` só resolvia o tipo do Chart.js para `'pie'` ou `'bar'`, nunca para `'line'`.
Além disso, os tabs **Por Período** e **Por Juiz Relator** ignoravam por completo o selector (gráfico
fixo em barras) — como esse é o tab que abre por defeito, dava a sensação de que Pizza/Linha "não
funcionavam" em toda a página. `desenharGraficoPeriodo()` e `desenharGraficoJuiz()` passaram a
respeitar `TIPO_GRAFICO` tal como os outros três tabs.

Melhorado (2026-07-26): layout do tab **Por Período** passou a usar `.row2` (gráfico e tabela de
detalhe lado a lado, tal como nos outros 4 tabs) em vez de ter a tabela empilhada por baixo do
gráfico. A altura do canvas subiu de 220px para 280px e removeu-se a legenda HTML manual
(Registados/Concluídos) que duplicava a legenda já desenhada pelo próprio Chart.js — dava mais
espaço à Pizza, que ficava pequena e com legenda repetida. Em **Por Juiz Relator**, a altura do
gráfico deixou de seguir a fórmula pensada para barras horizontais (`nº de juízes × 38px`, que
ficava demasiado baixa com poucos juízes) e passou a 280px fixos quando o tipo escolhido é Pizza
ou Linha.

Ajustado (2026-07-26): a legenda do Gráfico de Pizza (nos 5 tabs) passou de `position:'bottom'`
(indicadores numa linha horizontal, a quebrar quando não cabiam) para `position:'right'` — Chart.js
lista os indicadores um por linha, na vertical, ao lado do círculo.

Ajustado (2026-07-26): canvas dos 5 tabs aumentado de 260/280px para 400px (Período, Juiz não-barra,
Espécie, Estado, Origem não-barra), para os gráficos — sobretudo a Pizza — ocuparem mais espaço no
ecrã e os dados/legenda ficarem mais legíveis. Nos tabs com barras horizontais dependentes do número
de itens (Juiz e Origem, quando o tipo é Barras), a fórmula subiu de `nº itens × 38px` (180–420px)
para `nº itens × 42px` (260–480px). A legenda da Pizza também ficou maior (`font-size` 10→12,
`boxWidth` 12→14, `padding` 10px entre itens).

Corrigido (2026-08-07): com muitas fatias (ex: muitos juízes/espécies/origens diferentes), a legenda
da Pizza — de tamanho fixo desde o ajuste de 2026-07-26 acima — ficava mais alta do que os 400px (ou
280px, no modal de detalhe) do canvas, e os últimos nomes acabavam cortados/invisíveis fora da área do
gráfico, tanto nos 5 tabs como no modal de drill-down (`chartDetalheA`/`chartDetalheB`). Três
ajustes, todos em `js/estatisticas.js`:

- `legendaPizza(n)`: `font-size`, `boxWidth` e `padding` da legenda diminuem em dois patamares (mais
  de 6 e mais de 10 fatias) e os rótulos são truncados com "…" acima de 16–30 caracteres (consoante o
  patamar) — evita que um único nome muito comprido force a coluna da legenda a alargar à custa do
  círculo.
- `raioPizza(n)`: o raio do círculo (`options.radius`) também diminui nos mesmos dois patamares
  (90%→76%→62%), deixando o gráfico visivelmente mais pequeno e "encostado" à esquerda, com mais
  espaço reservado à legenda à direita.
- `alturaGrafico(n)`: nos 5 tabs, a altura do canvas em modo Pizza deixou de ser fixa (400px) e passou
  a acompanhar a quantidade de fatias (`nº itens × 24px + 60`, entre 320–760px); no modal de detalhe,
  `desenharPizzaDetalhe()` ajusta a altura do contentor da mesma forma (220–420px) antes de desenhar.
  Isto garante que a coluna vertical da legenda tem sempre altura suficiente para listar todos os
  itens, mesmo com grandes quantidades de dados.

Corrigido (2026-08-07): mesmo depois do ajuste acima, a legenda vertical (Chart.js, `position:'right'`)
continuava a acabar fora da vista em painéis largos. Motivo: com `maintainAspectRatio:false`, o
círculo da Pizza fica limitado pela altura do canvas (bem menor do que a largura do painel), mas o
Chart.js centra esse círculo, agora mais estreito, no meio de todo o espaço disponível — o que
empurrava a legenda para a direita, a par com a largura do painel, em vez de a manter encostada ao
círculo. `estiloContainerGrafico(n)` (`js/estatisticas.js`) resolve isto limitando a largura do
contentor do canvas em modo Pizza (`max-width` proporcional à altura calculada por `alturaGrafico(n)`)
em vez de o deixar esticar a 100% do painel, com `margin-right:auto` para o manter encostado à
esquerda — círculo e legenda ficam sempre lado a lado, sem o espaço morto que empurrava os nomes para
fora da janela.

Ajustado (2026-08-07): os limites da correcção acima (raio, legenda e altura/largura do contentor)
tinham ficado demasiado apertados — gráfico e legenda pequenos demais. Valores aumentados em
`js/estatisticas.js` para o conjunto ficar bem visível, mantendo-se sempre dentro da janela/painel
(sem repetir o problema original): `raioPizza(n)` subiu de 62–90% para 72–92%; `legendaPizza(n)`
aumentou tipo de letra (9–12px→10–13px), `boxWidth` (8–13→9–14) e o limite de truncagem dos rótulos
(16–30→18–34 caracteres); `alturaGrafico(n)` subiu de 320–760px para 400–820px (220–420px→280–480px no
modal de detalhe); e o `max-width` do contentor (`estiloContainerGrafico(n)`) passou de
`altura × 1.45` (360–620px) para `altura × 1.65` (520–860px nos 5 tabs, 340–560px no modal).

Ajustado (2026-08-07): `legendaPizza(n)` deixou de truncar (com "…") os nomes dos rótulos na legenda
da Pizza — os nomes aparecem sempre por extenso, mesmo os mais compridos. Para compensar,
`estiloContainerGrafico()` (`js/estatisticas.js`) passou a receber a lista de rótulos (em vez de só a
quantidade) e calcula a largura do contentor a partir do nome mais comprido de facto (tamanho de letra
× nº de caracteres, com uma margem), em vez de uma proporção fixa da altura — assim a largura
reservada acompanha o conteúdo real da legenda, e não só a quantidade de fatias.

Ajustado (2026-08-07): o contentor (círculo + legenda) do gráfico de Pizza, nos 5 tabs e no modal de
detalhe, passou de encostado à esquerda do painel (`margin-right:auto`) para centrado
(`margin:0 auto`) — mais equilibrado visualmente do que ficar sempre "colado" à margem esquerda,
mantendo tudo dentro da janela como antes (só muda o alinhamento horizontal, não a largura máxima).

Melhorado (2026-08-07): em vez de tentar sempre caber *todas* as fatias (o que, com muitas categorias,
ainda obrigava a letra pequena/gráfico grande para caber tudo), o gráfico de Pizza (nos 5 tabs e no
modal de detalhe) passou a **limitar-se a 8 fatias principais + "Outras"** — mais legível e mais
próximo do que se usa em relatórios deste tipo. Tudo em `js/estatisticas.js`:

- `agruparTopN(itens, fnRotulo, fnValor, fnCor)`: ordena da maior para a menor fatia e, havendo mais de
  `MAX_FATIAS_PIZZA` (9) itens, agrupa os mais pequenos numa fatia final "Outras (N)" — devolve
  `{ item, label, valor, cor }` por fatia, com `item:null` em "Outras" (não corresponde a um registo
  específico).
- `atribuirPaletaSequencial(grupos)`: para Juiz Relator/Espécie/Origem (sem cor semântica própria),
  reatribui a `PALETA` pela posição já ordenada — evita cores parecidas lado a lado, o que podia
  acontecer ao usar a posição no array original antes de ordenar. "Por Estado" continua a usar sempre
  a cor fixa de `SGD_COR_ESTADO` (nunca esta função), por ser semântica.
- Dentro da pizza só aparece a percentagem de fatias com **≥ 3%** do total (`datalabels.formatter`);
  fatias menores (1–2%) só ficam identificadas na legenda, não dentro do círculo — evita números
  ilegíveis sobrepostos em fatias muito finas.
- Clicar na fatia "Outras" não abre o modal de drill-down (`onClick` verifica `item:null` e ignora) —
  não corresponde a um único Juiz/Espécie/Estado/Origem, por isso não haveria detalhe correcto a
  mostrar.
- `estiloContainerGrafico()` e `desenharPizzaDetalhe()` passaram a dimensionar o contentor com base no
  limite de 9 fatias (não na quantidade real de itens do relatório), já que é isso que a pizza mostra
  de facto — evita reservar espaço a mais quando há, por exemplo, 30 origens diferentes mas só 9
  fatias visíveis.

Adicionado (2026-08-08): como clicar na fatia "Outras" não abre o modal de detalhe (ver acima), não
havia forma de ver rapidamente quais itens tinham sido agrupados nela — só consultando a tabela
completa por baixo do gráfico. `agruparTopN()` passou a guardar, na fatia "Outras", a lista
`agrupados` (rótulo + valor de cada item que lá foi parar); `tooltipPizza(grupos)`
(`js/estatisticas.js`) usa essa lista para substituir o tooltip por omissão do Chart.js ("Outras (N):
total") por uma lista linha a linha ao passar o rato sobre essa fatia (limitada a 14 linhas, com "…
mais X" a seguir se sobrarem mais); nas restantes fatias mantém o tooltip normal. Aplicado aos 3
gráficos de Pizza que agrupam em "Outras" (Juiz Relator, Espécie/Estado/Origem, e os 2 do modal de
drill-down).

Adicionado (2026-07-26): drill-down genérico nos 5 tabs de Estatísticas — clicar numa
barra/coluna/fatia/ponto de qualquer gráfico, OU numa linha de qualquer tabela de detalhe, abre um
modal (`#estDetalheBg`, `app/Views/estatisticas/index.php`) com estatísticas rápidas (Total,
Pendentes/Findos ou Registados/Concluídos, já disponíveis no cliente — sem pedido extra) e até 2
gráficos de Pizza com as dimensões relacionadas àquele valor, respeitando os filtros activos
(utilizador/datas):

- **Juiz Relator** → Por Estado + Por Espécie
- **Espécie** → Por Estado + Por Juiz Relator
- **Estado** → Por Espécie + Por Juiz Relator
- **Origem** e **Período** → Por Estado + Por Espécie

Novo endpoint genérico `GET api/estatisticas/detalhe.php?eixo=relator|especie|estado|origem|periodo&valor=...`
→ `EstatisticaController::detalheEixo()` → `EstatisticaModel::detalheEixo()`, que reaproveita
`condicoes()` e acrescenta a condição do eixo clicado (com tratamento especial para os sentinelas
`'(Não distribuído)'`/`'(Sem origem)'`, que correspondem a colunas vazias/NULL), devolvendo só as
duas dimensões acima (nunca a do próprio eixo clicado, para não desenhar uma fatia trivial de 100%).
No lado do cliente, `abrirDetalheEixo(eixo, valor, titulo)` (`js/estatisticas.js`) é chamada tanto
pelo `onClick` do Chart.js de cada gráfico (`onHover` muda o cursor para `pointer` sobre elementos
clicáveis) como por `attachLinhasDetalhe()`, que liga o clique em qualquer `<tr data-eixo>` — as
tabelas de cada tab marcam as suas linhas com `data-eixo`/`data-valor`/`data-titulo`. Isto porque a
regra global `.pt tr:hover td { cursor:pointer }` (`css/estilos.css`) já faz qualquer linha de
qualquer tabela parecer clicável, e antes só o gráfico reagia.

Adicionado (2026-07-26): os gráficos de Barras de "Por Juiz Relator" e "Por Origem" passaram de uma
única barra/coluna de Total para coluna agrupada Pendentes/Findos por item (tal como
Registados/Concluídos em "Por Período") — mais informativo do que um único número. Para Origem isto
exigiu estender `EstatisticaModel::distribuicao()` a somar `pendentes`/`findos` por origem (mesmo
critério de `produtividade()`), além do `total` que já devolvia.

Corrigido (2026-07-26): no tab "Por Período", os filtros de Utilizador e Data (`#fEstUtilizador`,
`#fEstDataDe`/`#fEstDataAte`) não tinham efeito nenhum nos números de Registados/Concluídos —
`EstatisticaModel::volume()` nunca chamava `condicoes($get)` como os outros métodos do model, e
ignorava por completo esses três parâmetros (só lia `escala`). Passou a aplicar a mesma condição de
`p.data_registo`/`p.registado_por` de `resumo()`/`distribuicao()`/`produtividade()`/`funil()`: a
contagem de Registados filtra directamente por essas colunas, e a de Concluídos passou a fazer
`JOIN processos p ON p.id = dc.processo_id` para poder aplicar o mesmo filtro (que é sobre a data de
*registo*/utilizador que registou, não sobre a data de conclusão em si — mesma semântica do resto da
página).

Adicionado (2026-07-26): botão "Limpar Filtros" (`#btnLimparFiltrosEst`) da barra de filtros de
Estatísticas fica destacado (`btn-danger` + texto "Limpar Filtros") enquanto Utilizador, Data De ou
Data Até tiverem algum valor escolhido — antes era só um ícone (🚫) sempre com o mesmo aspecto, sem
indicar se algum filtro estava activo. `atualizarBotaoLimparFiltros()` corre a cada `change` desses 3
campos, ao clicar no próprio botão, e uma vez ao carregar a página.

Adicionado (2026-07-26): botão "PDF" (`#estDetalheExportPdf`) no modal de detalhe (drill-down —
clicar num juiz/utilizador/espécie/estado/origem/período em qualquer tab) exporta esse detalhe para
PDF com um cabeçalho institucional fixo, por este modelo:
1. Logótipo (`assets/img/logostj.jpg`) centrado no topo.
2. Traço tracejado.
3. "RELATÓRIO GESTÃO DE PROCESSOS" / "ENTIDADE - SUPREMO TRIBUNAL DE JUSTIÇA - ANO JUDICIAL:
   2025/2026" (ano fixo por agora) + parágrafo narrativo com os totais reais e actuais do sistema
   (`api/estatisticas/resumo.php`, sem filtros — é sempre o total institucional, não o filtro activo
   na página) por extenso em português (`numeroPorExtenso()`, cobre 0–999999) e em percentagem.
4. Outro traço tracejado.
5. Título do valor clicado, as estatísticas rápidas do modal (texto), e os 2 gráficos de Pizza do
   modal — capturados directamente do `<canvas>` já desenhado (`chart.canvas.toDataURL('image/png')`),
   sem os redesenhar.

`gerarPdfDetalhe()` (`js/estatisticas.js`) usa `doc.setLineDashPattern()` do jsPDF para os traços
tracejados, com fallback silencioso para traço contínuo se essa API não existir na versão carregada
(`typeof doc.setLineDashPattern === 'function'`) — evita que a exportação falhe por completo só por
causa do traço. O logótipo é carregado via `<canvas>` (`carregarImagemDataURL()`) porque o jsPDF
precisa de uma dataURL, não de um caminho de imagem.

Adicionado (2026-07-26): o mesmo cabeçalho institucional passou a aplicar-se também ao botão "PDF"
principal da barra de topo (`exportarPDF()`, que já existia e exporta o tab activo — Período, Juiz,
Espécie, Estado ou Origem, conforme a selecção/filtros correntes) — antes só o PDF do modal de
detalhe tinha logótipo/tracejados/parágrafo institucional. Extraído para
`desenharCabecalhoInstitucionalPdf(doc, logo)` e `comCabecalhoInstitucionalPdf(callback)`, partilhados
por `gerarPdfRelatorio()` (tab activo) e `gerarPdfDetalhe()` (modal de drill-down).

Corrigido (2026-07-26): o parágrafo institucional usava `api/estatisticas/resumo.php`, cujos totais
(`total_acumulado`/`pendentes`/`findos`) são **sempre globais e sem filtro**, por desenho (servem o
Painel Geral) — por isso o parágrafo mostrava sempre o total da instituição inteira, nunca o do
filtro/utilizador seleccionado na página. `desenharCabecalhoInstitucionalPdf()` passou a usar
`totaisFiltrados()`, que soma `ULTIMOS_DADOS.distribuicao.porEstado` (já filtrado por
Utilizador/Data) em vez de chamar `resumo.php` — sem pedido extra ao servidor.

Alterado (2026-07-26): o PDF principal (`gerarPdfRelatorio()`) deixou de desenhar uma tabela
(`autoTable`) com as linhas de `dadosExportacao()` — passou a converter cada linha numa frase de texto
("Cabeçalho: valor, Cabeçalho: valor"), com paginação manual própria (`escreverTextoComPaginacao()`,
já que `doc.text()` sozinho não pagina como o `autoTable` fazia). Por baixo, nova secção "Resumo
geral" (`resumoGeralLinhas()`): total/pendentes/findos e taxa média de conclusão do filtro activo, mais
uma frase de disparidade entre relatores — calculada a partir da maior/menor taxa de conclusão entre
os juízes relatores actualmente carregados (só entra se a diferença for ≥ 30 pontos percentuais; caso
contrário fica de fora, em vez de forçar uma observação sem sentido para os dados reais). O PDF do
modal de detalhe (`gerarPdfDetalhe()`) manteve os 2 gráficos de Pizza — só o PDF principal perdeu a
tabela.

Corrigido (2026-07-26): os cartões "Registados"/"Concluídos"/"Saldo" no topo do tab **Por Período**
somavam apenas o array `dados` de `volume.php`, que só cobre os últimos 13 meses (mensal) ou 5 anos
(anual) — por desenho, é um gráfico de tendência recente, não o histórico completo (ver
`EstatisticaModel::volume()`). Ao filtrar por um utilizador com processos concluídos há mais tempo do
que essa janela, os cartões mostravam um número de Concluídos menor do que a Lista de Processos
filtrada pelo mesmo utilizador+estado (ex: 2 em vez de 5). `htmlTabPeriodo()` passou a calcular estes 3
cartões com `totaisFiltrados()` (a mesma função usada no cabeçalho do PDF — soma
`ULTIMOS_DADOS.distribuicao.porEstado`, sem limite de tempo), reflectindo sempre o filtro
Utilizador/Data activo por completo. O gráfico e a tabela "Detalhe por Mês/Ano" abaixo continuam
limitados à janela recente (é o objectivo desse gráfico), mas passaram a indicar isso explicitamente
no título — "(últimos 13 meses)"/"(últimos 5 anos)" — para não parecerem inconsistentes com os
cartões acima.

Corrigido (2026-07-26): a estatística por Juiz Relator (tab "Por Juiz Relator", "Produtividade por
Juiz Relator" no Painel, e o eixo `relator` do drill-down) contava sempre pelo campo `distribuicao`
(o juiz original), ignorando por completo `redistribuicao` — um processo redistribuído continuava a
contar para o relator original em vez de "sair" dele e passar a contar para o novo. Novo
`EstatisticaModel::exprRelator()`: `COALESCE(NULLIF(TRIM(p.redistribuicao),''),
NULLIF(TRIM(p.distribuicao),''), '(Não distribuído)')` — usado em `produtividade()` e nos dois sítios
de `detalheEixo()` que antes liam `p.distribuicao` directamente (o eixo `relator` e a subconsulta
`porRelator`). Um processo nunca é contado nos dois relatores ao mesmo tempo — ou ainda não foi
redistribuído (conta para `distribuicao`) ou foi (conta só para `redistribuicao`). As colunas
`distribuicao`/`redistribuicao` em si (`processos.php`) mantêm-se as duas, como registo histórico de
quem foi o relator original e para quem foi depois redistribuído — só a *estatística* passou a somar
pelo relator efectivo.

Adicionado (2026-07-26): "Data de Distribuição" (`distribuicao_data`) passou a obrigatória, tal como
"Distribuição (Juiz Relator)" já era — `ProcessoModel::criar()`/`atualizar()` rejeitam o pedido sem
ela, e `js/processo-form.js` marca o campo com `class="required"` e valida antes de submeter (em
ambos os formulários, criação e edição). Como processos antigos podiam ainda não ter esta data (o
campo era opcional até agora), `dtSt()` (mudança rápida de estado, no modal de detalhe) passou a
enviar a data de hoje como *fallback* quando o processo não a tiver — sem isto, essa acção ficaria
bloqueada por um campo que nem sequer está a ser editado ali.

Adicionado (2026-07-26): o Número de Processo (`numero_processo_externo`) continua a poder repetir-se
entre processos (não é único por si só — nunca foi, e mantém-se assim), mas a combinação Número +
Espécie passou a ter de ser única — não pode haver dois processos com o mesmo número **e** a mesma
espécie (já teria de ser necessariamente o mesmo processo). Novo
`ProcessoModel::existeNumeroEspecie($numero, $especieId, $ignorarId = null)`, chamado em `criar()` e
`atualizar()` (com `$ignorarId` = o próprio processo, para não se comparar consigo mesmo ao editar) —
devolve `409 Já existe um processo com este número e esta espécie.` se a combinação já existir noutro
processo. `js/processo-form.js` não duplica esta validação no cliente (exige uma consulta à BD), mas
apanha o erro 409 e realça o campo Espécie (`err-input`), tal como os outros campos obrigatórios.
Reforçado ao nível da base de dados por `uq_processos_numero_especie` (índice único em
`numero_processo_externo, especie_id`) — `sql/migracao_2026-07-26.sql`, já reflectido em
`database.sql` para instalações novas — defesa contra condição de corrida entre o `SELECT` de
validação e o `INSERT`/`UPDATE` em dois pedidos simultâneos. A migração começa por um `SELECT` que
lista duplicados existentes (se devolver alguma linha, resolva-os antes de correr a `ALTER TABLE`,
que falha se já houver dados a violar a constraint); testado localmente (sem duplicados, `ALTER
TABLE` aplicada e confirmada idempotente por reexecução).

Limpo/optimizado (2026-07-26): revisão de desempenho pedida antes de um commit (score do Lighthouse
mais baixo em mobile do que em desktop). Achados:
- `PALETA` em `js/painel.js` estava declarada mas nunca usada (sobrou de uma versão anterior) —
  removida.
- `jspdf-autotable` deixou de ter qualquer utilização em `js/estatisticas.js` desde que o PDF do tab
  activo deixou de desenhar tabela (ver "Alterado" acima) — confirmado por grep, zero ocorrências de
  `autoTable` no ficheiro — biblioteca inteira removida de `app/Views/estatisticas/index.php`.
- jsPDF e xlsx (usadas só pelos botões "PDF"/"Excel", não no carregamento normal da página) passaram
  de `<script>` estático no `<head>` para carregamento a pedido: `carregarScript()`,
  `carregarLibPdf()`, `carregarLibXlsx()` (`js/estatisticas.js`) injectam o `<script>` (com o mesmo
  `integrity`/`crossorigin` de antes) só quando o utilizador clica em Exportar, com uma Promise que
  evita carregar duas vezes a mesma biblioteca. Chart.js/`chartjs-plugin-datalabels` continuam
  carregadas sempre (Período/Juiz/Espécie/Estado/Origem/Painel desenham gráficos logo ao abrir a
  página, não há como adiar isso). Não foram encontradas outras funções/variáveis órfãs nos ficheiros
  alterados nesta sessão (`js/estatisticas.js`, `js/painel.js`, `js/processo-form.js`,
  `app/Models/EstatisticaModel.php`, `app/Models/ProcessoModel.php`) — confirmado por contagem de
  ocorrências de cada símbolo introduzido.

Reformatado (2026-07-27): formatação institucional do corpo dos PDFs de Estatísticas (PDF do tab activo
e PDF do modal de detalhe, ambos via `desenharCabecalhoInstitucionalPdf()`) — fonte Times New Roman
(`doc.setFont('times', ...)`, fonte nativa do jsPDF, em vez de Helvetica), corpo a 12pt, justificado, com
espaçamento entre linhas de 1,5 (`ALTURA_LINHA_CORPO = 6.5mm` ≈ 12pt × 1,5 ÷ 2,8346pt/mm). Título
"RELATÓRIO GESTÃO DE PROCESSOS" passou de 13pt para 14pt; a linha "ENTIDADE - SUPREMO TRIBUNAL DE
JUSTIÇA - ANO JUDICIAL: 2025/2026" passou de 10pt para 14pt, com "ENTIDADE" e "ANO JUDICIAL: 2025/2026"
a negrito e o resto normal — jsPDF não mistura pesos dentro do mesmo `doc.text()`, por isso esta linha é
desenhada segmento a segmento (mede a largura de cada troço com a fonte certa, `doc.getTextWidth()`,
para poder centrar a linha inteira apesar dos pesos diferentes). No parágrafo institucional, "Supremo
Tribunal de Justiça (STJ)" e os 3 números por extenso entre parênteses (total/findos/pendentes) também
ficam a negrito, a meio da frase.

Como o texto justificado com trechos negrito/normal misturados não tem suporte nativo no jsPDF (só
`{align:'justify', maxWidth}` num `doc.text()` de um peso só), duas funções novas cobrem os dois casos:
- `escreverParagrafoJustificado(doc, texto, x, y, largura, alturaLinha, margemInferior)` — parágrafos de
  um só peso: delega o "word-wrap" e a justificação ao próprio jsPDF (passa a string completa +
  `{maxWidth, align:'justify'}`); usa `splitTextToSize()` só para saber quantas linhas vão sair (o
  `text()` não devolve essa contagem) e decidir se cabe na página antes de desenhar.
- `escreverParagrafoComNegrito(doc, partes, x, y, largura, alturaLinha, margemInferior)` — parágrafos
  com trechos negrito/normal (`partes = [{texto, negrito}, ...]`): faz o "word-wrap" e a justificação à
  mão, palavra a palavra — mede cada palavra com a fonte certa, empacota em linhas até `largura`, e
  distribui o espaço sobrante entre as palavras de cada linha (excepto a última, sempre alinhada à
  esquerda — um parágrafo de uma única linha nunca fica esticado a preencher a largura toda).

Reordenado e ampliado (2026-07-27): no PDF principal (`gerarPdfRelatorio()`), "Resumo geral" passou a
aparecer **antes** dos dados do tab activo (era depois). Nova secção fixa "Por Relator (ordenado por %
de conclusão)" (`desenharTabelaPorRelator()`) a seguir ao Resumo Geral, **sempre presente independentemente
do tab activo** — tabela sem linhas (nem separadora nem de grelha, só espaçamento e alinhamento de
colunas: Relator à esquerda, Total/Pendentes/Findos/% à direita), com os mesmos dados reais de
produtividade do tab "Por Juiz Relator" (`ULTIMOS_DADOS.produtividade.relatores`), ordenados por taxa de
conclusão decrescente. Como as Estatísticas já não carregam `jspdf-autotable` (ver "Limpo/optimizado"
acima), a tabela é desenhada célula a célula com `doc.text()`, com paginação manual (cabeçalho repetido
em cada página nova) tal como o resto do documento.

Removido (2026-07-27): a antiga secção "Relatório — [Tab activo]" (dados do tab em frases de texto,
"Cabeçalho: valor, Cabeçalho: valor") deixou de fazer parte do PDF principal — Resumo Geral + a tabela
"Por Relator" já cobrem o que interessa mostrar, sempre com dados reais. `labelTabActiva()` foi removida
por ter ficado sem uso.

Afinado (2026-07-27): no cabeçalho institucional, o traço logo a seguir ao logótipo é tracejado e mais
espesso (negrito); o logótipo tem tamanho fixo 48×26mm (mais largo que alto — a imagem de origem,
510×280px, já é assim, mas maior do que o tamanho anterior). O bloco de título (duas linhas) fica
centrado entre esse traço e um segundo traço, este contínuo e fino, adicionado logo antes do parágrafo
institucional — 10mm de espaço antes e depois do título (para o centrar entre os dois traços) e 16mm
entre o traço fino e o início do parágrafo. No "Resumo geral", as duas linhas passam a ter uma marca "•"
a negrito no início (via `escreverParagrafoComNegrito()`, reaproveitada aqui para um marcador em vez de
uma palavra a destacar).

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

**Filtro de datas da Lista de Processos passou a usar Data de Entrada (2026-07-27)**: os dois campos
`<input type="date">` da barra de filtros (`fDataDe`/`fDataAte`, `app/Views/processos/index.php`)
filtravam por `DATE(criado_em)` — instante em que a linha foi inserida na BD, sem relação com nenhuma
data mostrada nas colunas da tabela — em vez de `data_entrada` (a coluna "Data Entrada" já visível na
própria tabela). Corrigido em `ProcessoModel::listarComFiltros()`. Como a query corre sobre a view
`v_processos_completos`, que expõe `data_entrada` já formatada (`DATE_FORMAT(p.data_entrada,
'%d/%m/%Y')`, texto, não `DATE` nativo), a comparação usa `STR_TO_DATE(data_entrada, '%d/%m/%Y')` em vez
de `DATE(data_entrada)` — aplicar `DATE()` directamente à string formatada devolveria sempre `NULL`.
Tooltips dos dois campos actualizados de "Data de registo" para "Data de entrada".

**Botão "Limpar Filtros" destacado, também na Lista de Processos (2026-07-27)**: mesmo tratamento já
existente em Estatísticas (`atualizarBotaoLimparFiltros()`, `#btnLimparFiltrosEst`) — o botão
(`#btnLimparFiltros`) passa de simples ícone a `btn-danger` com o texto "Limpar Filtros" assim que
Pesquisa, Estado, Espécie, Data De ou Data Até tiverem algum valor escolhido, para não passar
despercebido que a lista está filtrada. `atualizarBotaoLimparFiltrosProc()` (`js/processos.js`) corre a
cada `input`/`change` desses 5 campos, ao clicar no próprio botão, e uma vez ao carregar a página.

**Formulário de Editar Processo reorganizado em separadores por etapa (2026-07-28)**:
`buildFormEditar()` (`js/processo-form.js`) listava todos os ~30 campos em sequência dentro de 2
blocos `.fsec` ("Identificação do Processo" e "Datas de Controlo Processual"), com linhas `.fg2`/
`.fg3-tight`/`.fg2-tight` inconsistentes entre si e bastante espaço vazio nas linhas de 1-2 campos.
Passou a gerar uma barra de separadores (`.ftabs`/`.ftab-btn`) + painéis (`.ftab-panel`, um por
etapa, trocados por `mostrarFTab(idx)`), todos usando a mesma grid de 3 colunas (`.fg3`) para
alinhamento consistente: **1. Identificação** (Nº Registo, Data Registo, Nº Processo, Data Entrada,
Espécie, Origem, Partes, Estado — Nº de Processo ao lado de Data de Entrada), **2. Distribuição**
(Distribuição, Data Distribuição, Redistribuição, Data de Redistribuição), **3. Notificações**
(Notificação/Citação, Notificação 1, Notificação 2), **4. Julgamento** (Conclusão, Vistos MP/Adj.1/
Adj.2), **5. Acórdãos** (Data + Nº de cada um dos 3 Acórdãos), **6. Notificações dos Acórdãos**
(as 3 notificações de Acórdão juntas, separadas da etapa 5), **7. Custas** (Conta e Custas, 2ª Conta
e Custas, e as respectivas Notificações), **8. Encerramento** (Inscrição de Tabela, Arquivamento,
Observações). `mostrarFTab()` procura `.ftab-btn`/`.ftab-panel` dentro de `#crudB` (não há `id`
próprio no wrapper de separadores, por isso a troca é sempre relativa ao container do modal CRUD,
que só tem tabs na edição — `buildFormCriar()`, formulário de criação fase 1, continua numa página
única, sem tabs, pois não tem os campos de controlo processual). `guardarEditar()` chama
`mostrarFTab(0)` ou `mostrarFTab(1)` antes de mostrar o toast de erro de validação, para saltar
automaticamente para o separador onde está o campo em falta (Identificação ou Distribuição) — sem
isto, o utilizador via o erro mas o campo destacado podia estar escondido noutro separador.

**Codificação de cor dos campos do formulário de Processos (2026-07-28)**: antes, todos os campos
(obrigatórios, opcionais, vazios, preenchidos) tinham o mesmo fundo branco e a mesma borda cinza —
nada no próprio campo indicava se era obrigatório ou se já tinha sido preenchido. `sgdColorirCampo(el)`
+ `sgdColorirFormulario(root)` (`js/processo-form.js`) aplicam classes conforme o estado do campo:
`.req` (borda azul, `var(--blue)`) nos campos já marcados como obrigatórios (mesmos campos da label
`.required`, agora também na tag do input/select — `f_num_externo`, `f_data_entrada`, `f_esp`,
`f_partes`, `f_st`, `f_dist`, `f_dist_data`); `.f-filled` (fundo verde claro, `var(--greenl)`) em
qualquer campo de texto/select com valor; e, só para `<input type="date">`, `.f-past` (fundo vermelho
claro, `var(--redl)`, valor anterior a hoje) ou `.f-future` (fundo azul claro, `var(--bluel)`, valor
posterior a hoje) em vez do verde genérico — uma data preenchida não diz nada de útil por si só, o
que importa é se já passou ou ainda está por vir. Campos `.auto` (Nº/Data de Registo, só leitura)
ficam de fora do esquema. A comparação de datas usa comparação de strings `'aaaa-mm-dd' </>/ hojeISO()`
— funciona porque o valor nativo de `<input type="date">` já vem nesse formato zero-padded, a mesma
ordem lexicográfica e cronológica. Em vez de recolorir cada campo manualmente ao editar, um único
listener delegado em `document` (`input`/`change`, filtrando por `closest('#crudB')`) chama
`sgdColorirCampo()` no campo alterado — funciona nos dois formulários (criar e editar) e em todos os
separadores da edição sem precisar de um listener por campo. `sgdColorirFormulario()` corre uma vez
logo a seguir a construir o HTML em `abrirCriar()`/`abrirEditar()`, para os valores já preenchidos
(modo edição) começarem coloridos, sem esperar por uma interacção do utilizador.

**Janela de Detalhe do Processo reorganizada por etapas e com badges de cor (2026-07-29)**:
`abrirDetalhe()` (`js/processo-form.js`), a modal de "Ver" acedida a partir da Lista de Processos,
tinha só 2 blocos: "Identificacao" (borda azul, `.dsec.bl`) e um único "Datas de Controlo" (borda
âmbar, `.dsec.am`) onde entravam misturados Redistribuição, Notificações, Vistos, Acórdãos, Custas e
Arquivamento — sem correspondência com os separadores por etapa já usados no formulário de Editar
(ver entrada acima, "Formulário de Editar Processo reorganizado em separadores por etapa"). Passou a
ter as mesmas 8 secções e cores da edição, divididas em 2
colunas dentro da mesma `.dsec`: coluna esquerda — **Identificação** (azul), **Distribuição** (roxo,
nova classe `.dsec.pu`), **Notificações** (âmbar), **Julgamento** (azul); coluna direita —
**Acórdãos** (roxo), **Notif. Acórdãos** (âmbar), **Custas** (verde), **Encerramento** (vermelho, nova
classe `.dsec.rd`) + Observações + o selector de "Actualizar Estado". As duas classes de cor que
faltavam (`.dsec.pu`, `.dsec.rd`) foram acrescentadas ao CSS ao lado de `.dsec.bl`/`.am`/`.gr` já
existentes. A função `dd()` (campos com data de controlo) deixou de mostrar um simples ícone
verde/cinza + texto e passou a gerar um badge de pílula reaproveitando as classes já usadas no badge
de Estado — `b-concluded` (verde, campo preenchido) ou `b-distributed` (âmbar, "Pendente") — para que
o preenchido/pendente também se distinga por cor consistente com o resto da aplicação, e não só por
um ícone. Os títulos das secções (`.dsec`) passaram de 10px para 14px — antes eram do mesmo tamanho
do texto normal e quase não se destacavam apesar de já estarem a negrito — e a cor do texto passou de
`var(--tx2)` (cinza secundário) para `var(--tx)` (cor de texto principal), para contrastar mais com o
resto do conteúdo. O selector "Actualizar Estado", que antes era um `<label>` pequeno igual aos dos
formulários (`.fg label`, 10px), passou também a usar `.dsec`, ficando visualmente ao mesmo nível dos
restantes títulos de secção.

**Modal de Editar/Novo Processo mais largo em ecrã grande (2026-07-29)**: `.modal` (regra partilhada
por `#crudM` e `#detM`) fica limitado a `max-width:800px` a partir dos 768px de viewport
(`@media(min-width:768px)`). Nesse limite, os separadores por etapa do formulário de Editar
(`.fg3`, grid de 3 colunas) ficavam apertados o suficiente para aparecer scroll horizontal dentro do
modal em ecrãs maiores. Acrescentada `#crudM .modal { max-width:980px; }` dentro do mesmo media query,
só para o modal de criar/editar. O modal de detalhe (`#detM`) recebeu o mesmo ajuste
(`#detM .modal { max-width:980px; }`) pouco depois, pela mesma razão — as 2 colunas de secções
(`.dsec`) acrescentadas na reorganização por etapas também ficavam apertadas nos 800px, com scroll
horizontal a aparecer nos ecrãs maiores.

**Scroll horizontal persistente nos modais, mesmo depois de os alargar (2026-07-29)**: alargar
`#crudM`/`#detM` não resolveu — a causa real era `.modal` ter `overflow-y:auto` sem `overflow-x`
definido. Pela especificação CSS, quando um eixo tem um valor que gera scroll (`auto`/`scroll`) e o
outro fica em `visible`, o `visible` passa a computar como `auto` também — por isso qualquer overflow
horizontal mínimo (por exemplo, o espaço que a própria barra de scroll vertical ocupa ao aparecer)
já bastava para mostrar scroll à direita, independentemente da largura do modal. Corrigido com
`overflow-x:hidden` explícito em `.modal` — a única forma de o conteúdo ficar mais largo que o modal
é o `flex-wrap:wrap` das colunas empilhar verticalmente, nunca aparecer scroll lateral.

**PDF da Lista de Processos reconstruído com cabeçalho institucional e cor por estado (2026-07-31)**:
`exportarPDF()` (`js/processos.js`) gerava uma tabela crua com as ~29 colunas todas da view (`colunasExport()`/
`linhasExport()`, ainda usadas pelo Excel) e um título de uma linha sem qualquer identidade institucional.
Passou a montar o PDF em duas partes: cabeçalho — logótipo (`assets/img/logostj.jpg`) centrado no topo
(carregado como dataURL via `<canvas>` em `carregarLogoInstitucionalProc()`, o mesmo truque já usado em
`carregarImagemDataURL()` de `js/estatisticas.js`, porque o jsPDF não aceita um caminho/URL directamente),
seguido do nome "SUPREMO TRIBUNAL DE JUSTIÇA" também centrado e do título "Lista de Processos" — e corpo —
tabela reduzida às 9 variáveis mais relevantes para leitura rápida (`colunasExportPdf()`/`linhasExportPdf()`):
Número de Registo, Data Registo, Nº Processo, Data Entrada, Espécie, Partes, Distribuição, Origem, Estado. A linha de
cabeçalho da tabela usa `headStyles.fillColor` a azul (`[37,99,235]`, a mesma cor de destaque usada em botões
primários e no badge `.b-entry`). A coluna Estado é colorida célula a célula via `didParseCell` do
autoTable, mapeando `estado_codigo` para o mesmo par fundo/texto claro dos badges `.b-entry`/`.b-analysis`/
`.b-distributed`/`.b-concluded`/`.b-archived` de `css/estilos.css` (`ESTADO_CORES_PDF`, com um par cinza de
omissão para códigos sem regra própria) — para que o PDF impresso continue a distinguir o estado de cada
processo à primeira vista, tal como a lista no ecrã. O Excel (`exportarExcel()`) não foi tocado — continua a
exportar as ~29 colunas completas via `colunasExport()`/`linhasExport()`, sem cor (formato de dados, não de
leitura).

## Parâmetros de URL que abrem algo automaticamente
`processos.php?novo=1` (abre "Novo Processo") e `processos.php?ver=<numero>` (abre o detalhe desse
processo) limpam o parâmetro da URL com `history.replaceState()` logo depois de o consumir
(`js/processos.js`) — sem isto, dar refresh no browser reabria sempre o formulário/detalhe (vazio,
no caso do formulário), porque o parâmetro continuava na barra de endereço.

## Formulários (modais)
O modal `#crudM` (Novo/Editar Processo, Novo/Editar Utilizador) não fecha ao clicar fora nem com Esc —
só o botão "Cancelar" (`closeCrud()`) ou o "×" fecham (`js/comum.js`). Evita perder dados a meio do
preenchimento por um clique a seguir. O modal de detalhe (`#detM`, só leitura) continua a fechar normalmente.

**Diálogo de confirmação (`cfDlg`) com ícone de aviso opcional e menos espaço em branco (2026-07-29)**:
`cfDlg()` (`js/comum.js`) é partilhado por confirmações destrutivas (eliminar processo/utilizador/
espécie/estado/departamento/magistrado) e não destrutivas (sessão a expirar, senha resetada), por
isso o `#cfIcon` acrescentado ao `#cfbox` (`includes/modais.php`) começa escondido e só aparece
quando a chamada passa `{ icone: 'nome-do-icone-tabler' }` em `opts` — sem isto, o ícone de alerta
apareceria também em diálogos informativos onde não faz sentido. O diálogo de eliminar processo
(`delDoc()`, `js/processo-form.js`) passa `{ icone: 'alert-triangle' }`, troca o texto de "Eliminar
permanentemente SGD-2026-0034? Acção irreversível." (pergunta) para "O processo **SGD-2026-0034**
será eliminado permanentemente." (afirmação — o ícone de aviso já comunica a irreversibilidade, não
precisa de o repetir em texto), e destaca o número do processo a negrito com a mesma fonte
monoespaçada azul (`IBM Plex Mono`) usada no resto da aplicação para números de processo. `#cfbox p`
perdeu 6px de `margin-bottom` (18px → 12px) para encostar mais o texto aos botões.

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
