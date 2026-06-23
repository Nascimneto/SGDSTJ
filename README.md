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
4. Abrir `login.php` através do Apache (ex: `http://localhost/SGD/login.php`).

As credenciais de demonstração ficam definidas em `scripts/seed.php`. A senha inicial é sempre a mesma para todos os utilizadores — `stj@2026` (constante `SGD_SENHA_INICIAL` em `includes/senha.php`) — atribuída automaticamente na criação (e usada também pelo seed); como qualquer senha definida por outra pessoa, a aplicação obriga a troca no primeiro login seguinte.

## Histórico e Auditoria
O menu tem dois itens separados — **Histórico** (`auditoria.php`) e **Auditoria** (`auditoria.php?aba=sistema`)
— ambos servidos pela mesma página, só a abrirem em abas diferentes (`js/auditoria.js` lê `?aba=` no
carregamento). As duas abas são alimentadas por tabelas distintas — não são a mesma lista:
- **Histórico de Processos** (`historico_processo` / `api/auditoria/listar.php`): eventos por processo
  (registo, edição, mudança de estado, datas), sempre ligados a um `processo_id`.
- **Auditoria do Sistema** (`auditoria_sistema` / `api/auditoria/sistema.php`): acções administrativas
  sem processo associado — criação/edição/eliminação/activação/desactivação de utilizadores, reset de
  senha e alterações em Configurações. Registada por `sgd_registar_auditoria()` (`includes/log.php`),
  chamada a partir de cada endpoint em `api/utilizadores/*` e `api/configuracoes/atualizar.php`.

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
├── login.php, painel.php, processos.php, conclusao.php, vistos.php,
│   estatisticas.php, utilizadores.php, perfil.php, configuracoes.php
├── config/             ← ligação à BD, sessão, parser do .env (bloqueado por .htaccess)
├── includes/           ← guard de autenticação, layout partilhado (bloqueado por .htaccess)
├── api/                ← endpoints PHP (JSON), exigem sessão válida
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
7. **Seed inicial**: via SSH, `cd public_html && php scripts/seed.php` — cria o utilizador `admin`
   (senha inicial `stj@2026`, troca obrigatória no primeiro login) e os processos de demonstração.
8. **SSL/HTTPS**: activar o certificado gratuito em hPanel → Segurança → SSL (Let's Encrypt) — costuma
   ficar activo em poucos minutos. O `.htaccess` já força o redireccionamento `http://` → `https://`.
9. Confirmar o login em `https://<dominio>/login.php` e trocar a senha do `admin` imediatamente.

## Segurança
- Sessões PHP (`httponly`, `SameSite=Strict`), senhas com `password_hash()` (bcrypt)
- RBAC aplicado no servidor (`includes/guard.php`, `includes/api_guard.php`), nunca só no cliente
- Rate limiting de login (`max_tentativas_login`/`bloqueio_min`, parametrizável em Configurações)
- Política de senha (`includes/senha.php`): mínimo 8 caracteres, com pelo menos uma letra e um número
- Senha inicial fixa e igual para todos (`stj@2026`) na criação de utilizador — nunca escolhida pelo Administrador
- "O Meu Perfil" (`perfil.php`/`api/perfil/atualizar.php`) só permite ao próprio trocar a senha — nome
  e utilizador nunca são editáveis por esta via, só pelo Administrador (`api/utilizadores/atualizar.php`)
- Toda a acção administrativa sobre utilizadores e configurações fica registada em `auditoria_sistema`
  (ver secção "Histórico e Auditoria" abaixo) — incluindo eliminação, que antes não deixava rasto nenhum
- Sempre que a senha de um utilizador é definida por outra pessoa — criação, edição pelo Administrador
  ou "Resetar senha" — a conta fica marcada com `obrigar_troca_senha`; `includes/guard.php` bloqueia
  o acesso a qualquer página até o utilizador trocar a senha em `perfil.php`, que só dá acesso ao resto
  da plataforma depois da troca
- `.htaccess` bloqueia acesso directo a `.sql`/`.env`/`.md` e às pastas `config/`, `includes/`, `scripts/`
- `.htaccess` força HTTPS (redireccionamento 301 de `http://` para `https://`) em produção
- `.env` está em `.gitignore` — nunca é versionado; usar `.env.example` como modelo
