# SGD — Diagrama Entidade-Relacionamento

## Modelo Relacional

```
┌──────────────────────┐         ┌──────────────────────────┐
│      perfis          │         │      departamentos        │
├──────────────────────┤         ├──────────────────────────┤
│ PK id                │         │ PK id                    │
│    codigo (UNIQUE)   │         │    nome (UNIQUE)          │
│    descricao         │         │    sigla                 │
│    pode_criar_util.  │         │    activo                │
│    pode_elim_proc.   │         └──────────────────────────┘
│    pode_gerir_sist.  │                     │ 1
└──────────────────────┘                     │
           │ 1                               │
           │                                 │
           │ N                               │ N
┌──────────────────────────────────────────────────────────┐
│                      utilizadores                        │
├──────────────────────────────────────────────────────────┤
│ PK id                                                    │
│    username (UNIQUE)                                     │
│    senha_hash                                            │
│    nome_completo                                         │
│    email (UNIQUE)                                        │
│ FK perfil_id        → perfis.id                         │
│ FK departamento_id  → departamentos.id                  │
│    activo                                                │
│    ultimo_acesso                                         │
│    tentativas_falha                                      │
│    bloqueado_ate                                         │
│    criado_em / atualizado_em                            │
└──────────────────────────────────────────────────────────┘
           │ 1                           │ 1
           │                             │
           │ N                           │ N
┌──────────────────┐         ┌───────────────────┐
│sessoes_utilizador│         │       processos   │
├──────────────────┤         ├───────────────────┤
│ PK id            │         │ PK id             │
│ FK utilizador_id │         │    numero_processo│ ← gerado pelo trigger
│    token(UNIQUE) │         │    data_registo   │   SGD-AAAA-NNNN
│    ip_origem     │         │ FK especie_id     │→ especies_processo
│    expira_em     │         │    partes         │
│    terminado_em  │         │    distribuicao   │
└──────────────────┘         │    origem         │
                             │ FK estado_id      │→ estados_processo
                             │    observacoes    │
                             │ FK registado_por  │→ utilizadores
                             │ FK atualizado_por │→ utilizadores
                             └───────────────────┘
                                      │ 1
                     ┌────────────────┼────────────────┐
                     │ 1              │ 1              │ 1..N
                     │                │                │
                     ▼                ▼                ▼
          ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
          │  datas_controlo  │ │  historico   │ │    ficheiros     │
          ├──────────────────┤ ├──────────────┤ ├──────────────────┤
          │ PK processo_id   │ │ PK id        │ │ PK id            │
          │    notif_citacao │ │ FK proc_id   │ │ FK processo_id   │
          │    conclusao     │ │    data_even.│ │    nome_original │
          │    visto_mp      │ │    descricao │ │    nome_ficheiro │
          │    visto_adj1    │ │    tipo_event│ │    tipo_mime     │
          │    visto_adj2    │ │    estado_ant│ │    tamanho_bytes │
          │    inscr_tabela  │ │    estado_nov│ │    caminho       │
          │    acordao       │ │ FK util_id   │ │ FK enviado_por   │
          │    notif_acordao │ │    ip_origem │ │    eliminado     │
          │    conta_custas  │ └──────────────┘ └──────────────────┘
          │    arquivamento  │
          └──────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│  especies_processo  │    │   estados_processo  │
├─────────────────────┤    ├─────────────────────┤
│ PK id               │    │ PK id               │
│    nome (UNIQUE)    │    │    codigo (UNIQUE)  │
│    descricao        │    │    label            │
│    activo           │    │    cor_css          │
│    ordem            │    │    ordem            │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐
│    configuracoes    │
├─────────────────────┤
│ PK chave            │
│    valor            │
│    descricao        │
│    atualizado_em    │
└─────────────────────┘
```

## Tabelas — 11 no total

| Tabela | Descrição | Linhas iniciais |
|--------|-----------|-----------------|
| `perfis` | Perfis de utilizador com permissões | 5 |
| `departamentos` | Secções/departamentos | 6 |
| `especies_processo` | Tipos de processo | 10 |
| `estados_processo` | Estados possíveis | 5 |
| `configuracoes` | Configurações do sistema | 8 |
| `utilizadores` | Contas de utilizador | 4 (demo) |
| `sessoes_utilizador` | Sessões activas/expiradas | — |
| `processos` | Processos judiciais | 3 (demo) |
| `datas_controlo` | Datas processuais (1:1) | automático |
| `historico_processo` | Auditoria completa | automático |
| `ficheiros_processo` | Anexos digitalizados | — |

## Vistas — 7 no total

| Vista | Utilização |
|-------|-----------|
| `v_processos_completos` | Listagem principal da aplicação |
| `v_pendentes_conclusao` | Página "Conclusão" |
| `v_pendentes_vistos` | Página "Vistos" |
| `v_pendentes_tabela` | Página "Inscrição de Tabela" |
| `v_pendentes_acordao` | Página "Acórdão" |
| `v_relatorio_geral` | Dashboard — gráfico por estado |
| `v_auditoria_recente` | Últimas actividades |

## Triggers automáticos

| Trigger | Quando activa | O que faz |
|---------|--------------|-----------|
| `trg_numero_processo` | INSERT em processos | Gera SGD-AAAA-NNNN automaticamente |
| `trg_criar_datas_controlo` | INSERT em processos | Cria linha em datas_controlo |
| `trg_historico_estado` | UPDATE estado em processos | Regista mudança no histórico |
| `trg_proc_atualizado_em` | UPDATE em processos | Actualiza timestamp |
| `trg_util_atualizado_em` | UPDATE em utilizadores | Actualiza timestamp |
| `trg_dc_atualizado_em` | UPDATE em datas_controlo | Actualiza timestamp |
