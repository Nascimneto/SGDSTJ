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

## Estatísticas
`api/estatisticas/{resumo,distribuicao,funil}.php` aceitam os filtros opcionais `?utilizador=<id>`,
`?data_de=` e `?data_ate=` (sobre `processos.data_registo`) — aplicados directamente às tabelas
(`processos`/`datas_controlo`/`estados_processo`/`especies_processo`/`utilizadores`), já não às views
`v_relatorio_geral`/`v_distribuicao_especie` (sem parâmetros, não dava para filtrar). `distribuicao.php`
passou a devolver também `porUtilizador` (total de processos registados por cada utilizador). Os três
gráficos de distribuição (Estado/Espécie/Utilizador) usam Chart.js, com um selector único (#fTipoGrafico
em `estatisticas.php`) para trocar entre barras/pizza/linha sem voltar a consultar a API. Nos gráficos
de barras e pizza, cada fatia/barra mostra a percentagem (`chartjs-plugin-datalabels`, calculada sobre
o total desse gráfico, já filtrado) — na linha não, para não poluir pontos próximos. Nas barras, o eixo Y
tem `suggestedMax` acima do valor máximo para o rótulo não ficar colado/cortado no topo do canvas.
Botão "Imprimir" usa `window.print()` com a barra de filtros e a navegação escondidas via `.no-print`
(`css/estilos.css`, `@media print`).

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
Painel Geral · Lista de Processos · Conclusão · Vistos · Estatísticas · Utilizadores · Configurações.

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
- **Administrador**: acesso total (CRUD processos + gestão de utilizadores + configurações)
- **Outros perfis**: registar, editar e visualizar processos + trocar a própria senha em "O Meu Perfil"
  (nome e nome de utilizador só são editáveis pelo Administrador, em Utilizadores)

## Tecnologias
- Backend: PHP 8 (PDO, prepared statements), MariaDB/MySQL
- Frontend: HTML5 + CSS3 + JavaScript (sem frameworks), `fetch` para a API
- Gráficos: Chart.js 4 (Estatísticas — barras/pizza/linha seleccionáveis)
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
- Senha inicial fixa e igual para todos (`stj@2026`) na criação de utilizador — nunca escolhida pelo Administrador
- "O Meu Perfil" (`perfil.php`/`api/perfil/atualizar.php`) só permite ao próprio trocar a senha — nome
  e utilizador nunca são editáveis por esta via, só pelo Administrador (`api/utilizadores/atualizar.php`)
- Toda a acção administrativa sobre utilizadores e configurações fica registada em `auditoria_sistema`
  (ver secção "Histórico e Auditoria" abaixo) — incluindo eliminação, que antes não deixava rasto nenhum
- Sempre que a senha de um utilizador é definida por outra pessoa — criação, edição pelo Administrador
  ou "Resetar senha" — a conta fica marcada com `obrigar_troca_senha`; `PageGuard::aplicar()`
  (`app/Core/PageGuard.php`) bloqueia o acesso a qualquer página até o utilizador trocar a senha em
  `perfil.php`, que só dá acesso ao resto da plataforma depois da troca
- `.htaccess` bloqueia acesso directo a `.sql`/`.env`/`.md` e às pastas `includes/`, `app/`, `scripts/`
- `.htaccess` força HTTPS (redireccionamento 301 de `http://` para `https://`) em produção
- `.env` está em `.gitignore` — nunca é versionado; usar `.env.example` como modelo
- `instalar.php` (raiz) só responde se `INSTALL_TOKEN` estiver definido no `.env` e for passado em
  `?token=` — fail-closed por defeito (token vazio = 404 sempre); usar e apagar logo a seguir (ver
  secção "Deploy em produção")
