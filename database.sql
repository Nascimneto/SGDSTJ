-- ═══════════════════════════════════════════════════════════════════
--  SGD — Base de Dados Relacional
--  Sistema de Gestão de Processos — Tribunal Supremo de Cabo Verde
-- ───────────────────────────────────────────────────────────────────
--  Motor: MariaDB 10.4+ / MySQL 8+ (InnoDB, utf8mb4)
--  Reescrito de sintaxe PostgreSQL para MariaDB/MySQL.
--  Os utilizadores e os processos de demonstração NÃO são semeados
--  aqui (precisam de hash bcrypt, que SQL puro não calcula) —
--  ver scripts/seed.php.
-- ═══════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS auditoria_sistema;
DROP TABLE IF EXISTS historico_processo;
DROP TABLE IF EXISTS ficheiros_processo;
DROP TABLE IF EXISTS datas_controlo;
DROP TABLE IF EXISTS processos;
DROP TABLE IF EXISTS sessoes_utilizador;
DROP TABLE IF EXISTS utilizadores;
DROP TABLE IF EXISTS departamentos;
DROP TABLE IF EXISTS perfis;
DROP TABLE IF EXISTS especies_processo;
DROP TABLE IF EXISTS estados_processo;
DROP TABLE IF EXISTS configuracoes;

DROP VIEW IF EXISTS v_processos_completos;
DROP VIEW IF EXISTS v_pendentes_vistos;
DROP VIEW IF EXISTS v_pendentes_conclusao;
DROP VIEW IF EXISTS v_pendentes_tabela;
DROP VIEW IF EXISTS v_pendentes_acordao;
DROP VIEW IF EXISTS v_relatorio_geral;
DROP VIEW IF EXISTS v_auditoria_recente;
DROP VIEW IF EXISTS v_distribuicao_especie;

SET FOREIGN_KEY_CHECKS = 1;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  1. TABELAS DE REFERÊNCIA (lookup tables)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1.1 Perfis de utilizador
CREATE TABLE perfis (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo      VARCHAR(30)  NOT NULL UNIQUE,
    descricao   VARCHAR(100) NOT NULL,
    pode_criar_utilizadores  TINYINT(1) NOT NULL DEFAULT 0,
    pode_eliminar_processos  TINYINT(1) NOT NULL DEFAULT 0,
    pode_gerir_sistema       TINYINT(1) NOT NULL DEFAULT 0,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Departamentos / Secções
CREATE TABLE departamentos (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(80)  NOT NULL UNIQUE,
    sigla       VARCHAR(10),
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Espécies de processo
CREATE TABLE especies_processo (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(60)  NOT NULL UNIQUE,
    descricao   VARCHAR(200),
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    ordem       SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Estados do processo
CREATE TABLE estados_processo (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,
    label       VARCHAR(40)  NOT NULL,
    cor_css     VARCHAR(20),
    ordem       SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 Configurações gerais do sistema
CREATE TABLE configuracoes (
    chave         VARCHAR(60)  NOT NULL PRIMARY KEY,
    valor         TEXT         NOT NULL,
    descricao     VARCHAR(200),
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  2. UTILIZADORES E SESSÕES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 2.1 Utilizadores
CREATE TABLE utilizadores (
    id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(40)   NOT NULL UNIQUE,
    -- senha guardada como hash bcrypt (password_hash() em PHP) — nunca MD5/texto simples
    senha_hash       VARCHAR(255)  NOT NULL,
    nome_completo    VARCHAR(100)  NOT NULL,
    email            VARCHAR(100)  UNIQUE,
    telefone         VARCHAR(20),
    perfil_id        INT           NOT NULL,
    departamento_id  INT,
    activo           TINYINT(1)    NOT NULL DEFAULT 1,
    ultimo_acesso    TIMESTAMP     NULL,
    tentativas_falha SMALLINT      NOT NULL DEFAULT 0,
    bloqueado_ate    TIMESTAMP     NULL,
    obrigar_troca_senha TINYINT(1) NOT NULL DEFAULT 0,
    criado_em        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por       INT           NULL,
    CONSTRAINT fk_util_perfil       FOREIGN KEY (perfil_id)       REFERENCES perfis(id),
    CONSTRAINT fk_util_depto        FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
    CONSTRAINT fk_util_criado_por   FOREIGN KEY (criado_por)      REFERENCES utilizadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Sessões activas
CREATE TABLE sessoes_utilizador (
    id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    utilizador_id   INT           NOT NULL,
    token           VARCHAR(128)  NOT NULL UNIQUE,
    ip_origem       VARCHAR(45),
    user_agent      VARCHAR(300),
    criado_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- DEFAULT é só placeholder p/ satisfazer NOT NULL; a aplicação define sempre o valor real no INSERT
    expira_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    terminado_em    TIMESTAMP     NULL,
    CONSTRAINT fk_sessao_util FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  3. PROCESSOS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 3.1 Tabela principal de processos
CREATE TABLE processos (
    id                     INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -- Nº de registo do processo na secretaria — gerado automaticamente (trigger)
    numero_processo        VARCHAR(20)    NOT NULL UNIQUE,
    -- Número de processo (livre, tal como vem de fora — ex: do tribunal de origem)
    numero_processo_externo VARCHAR(50)   NULL,
    -- Data de entrada do processo (editável — distinta de data_registo, que é o carimbo automático de registo no sistema)
    data_entrada           DATE           NOT NULL DEFAULT (CURRENT_DATE),
    data_registo           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    especie_id             INT            NOT NULL,
    partes                 VARCHAR(500)   NOT NULL,
    origem                 VARCHAR(200)   NOT NULL,
    distribuicao           VARCHAR(150),
    estado_id              INT            NOT NULL,
    observacoes            TEXT,
    -- Auditoria
    registado_por          INT            NOT NULL,
    atualizado_por         INT            NULL,
    criado_em              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_proc_especie  FOREIGN KEY (especie_id)    REFERENCES especies_processo(id),
    CONSTRAINT fk_proc_estado   FOREIGN KEY (estado_id)     REFERENCES estados_processo(id),
    CONSTRAINT fk_proc_reg_por  FOREIGN KEY (registado_por) REFERENCES utilizadores(id),
    CONSTRAINT fk_proc_atu_por  FOREIGN KEY (atualizado_por) REFERENCES utilizadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Datas de controlo processual (relação 1:1 com processo)
CREATE TABLE datas_controlo (
    processo_id             INT       NOT NULL PRIMARY KEY,
    notificacao_citacao     DATE      NULL,
    notificacao1            DATE      NULL,
    notificacao2            DATE      NULL,
    conclusao               DATE      NULL,
    visto_mp                DATE      NULL,
    visto_adjunto1          DATE      NULL,
    visto_adjunto2          DATE      NULL,
    inscricao_tabela        DATE      NULL,
    acordao                 DATE      NULL,
    acordao2                DATE      NULL,
    acordao3                DATE      NULL,
    notificacao_acordao     DATE      NULL,
    conta_custas            DATE      NULL,
    conta_custas2           DATE      NULL,
    arquivamento            DATE      NULL,
    -- Quem registou cada data (nunca vem do payload do cliente — sempre da sessão)
    registado_conclusao_por     INT NULL,
    registado_visto_mp_por      INT NULL,
    registado_visto_adj1_por    INT NULL,
    registado_visto_adj2_por    INT NULL,
    registado_tabela_por        INT NULL,
    registado_acordao_por       INT NULL,
    registado_acordao2_por      INT NULL,
    registado_acordao3_por      INT NULL,
    registado_arquivo_por       INT NULL,
    atualizado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dc_processo   FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
    CONSTRAINT fk_dc_conc_por   FOREIGN KEY (registado_conclusao_por)  REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_mp_por     FOREIGN KEY (registado_visto_mp_por)   REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_adj1_por   FOREIGN KEY (registado_visto_adj1_por) REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_adj2_por   FOREIGN KEY (registado_visto_adj2_por) REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_tab_por    FOREIGN KEY (registado_tabela_por)     REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_ac_por     FOREIGN KEY (registado_acordao_por)    REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_ac2_por    FOREIGN KEY (registado_acordao2_por)   REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_ac3_por    FOREIGN KEY (registado_acordao3_por)   REFERENCES utilizadores(id),
    CONSTRAINT fk_dc_arch_por   FOREIGN KEY (registado_arquivo_por)    REFERENCES utilizadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Histórico de eventos do processo (auditoria completa)
CREATE TABLE historico_processo (
    id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    processo_id     INT           NOT NULL,
    data_evento     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descricao       VARCHAR(500)  NOT NULL,
    tipo_evento     VARCHAR(30),
    estado_anterior VARCHAR(20)   NULL,
    estado_novo     VARCHAR(20)   NULL,
    utilizador_id   INT           NULL,
    ip_origem       VARCHAR(45),
    CONSTRAINT fk_hist_processo FOREIGN KEY (processo_id)     REFERENCES processos(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_e_ant    FOREIGN KEY (estado_anterior) REFERENCES estados_processo(codigo),
    CONSTRAINT fk_hist_e_nov    FOREIGN KEY (estado_novo)     REFERENCES estados_processo(codigo),
    CONSTRAINT fk_hist_util     FOREIGN KEY (utilizador_id)   REFERENCES utilizadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 Ficheiros anexos
CREATE TABLE ficheiros_processo (
    id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    processo_id     INT           NOT NULL,
    nome_original   VARCHAR(255)  NOT NULL,
    nome_ficheiro   VARCHAR(255)  NOT NULL,
    tipo_mime       VARCHAR(100),
    tamanho_bytes   BIGINT,
    caminho         VARCHAR(500),
    enviado_em      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviado_por     INT           NULL,
    eliminado       TINYINT(1)    NOT NULL DEFAULT 0,
    eliminado_em    TIMESTAMP     NULL,
    eliminado_por   INT           NULL,
    CONSTRAINT fk_fich_processo    FOREIGN KEY (processo_id)   REFERENCES processos(id) ON DELETE CASCADE,
    CONSTRAINT fk_fich_enviado_por FOREIGN KEY (enviado_por)   REFERENCES utilizadores(id),
    CONSTRAINT fk_fich_elim_por    FOREIGN KEY (eliminado_por) REFERENCES utilizadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 Auditoria do sistema — acções administrativas fora do âmbito de um
-- processo (gestão de utilizadores, configurações). Separada de
-- historico_processo de propósito: aquela é por processo (processo_id
-- NOT NULL), esta é geral — por isso "Histórico" e "Auditoria" são secções
-- distintas em auditoria.php, não a mesma lista com dois nomes.
CREATE TABLE auditoria_sistema (
    id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mensagem      VARCHAR(500)  NOT NULL,
    tipo_evento   VARCHAR(30)   NOT NULL,
    codigo_evento VARCHAR(40)   NOT NULL,
    criado_por    INT           NULL,
    criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_origem     VARCHAR(45),
    -- ON DELETE SET NULL: eliminar um utilizador nunca pode apagar o
    -- registo de auditoria das acções que ele próprio executou.
    CONSTRAINT fk_aud_criado_por FOREIGN KEY (criado_por) REFERENCES utilizadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  4. ÍNDICES (performance)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX idx_processos_numero      ON processos(numero_processo);
CREATE INDEX idx_processos_estado      ON processos(estado_id);
CREATE INDEX idx_processos_especie     ON processos(especie_id);
CREATE INDEX idx_processos_data        ON processos(data_registo DESC);
CREATE INDEX idx_processos_origem      ON processos(origem);
CREATE INDEX idx_processos_distribuido ON processos(distribuicao);
CREATE INDEX idx_processos_numero_externo ON processos(numero_processo_externo);
CREATE FULLTEXT INDEX idx_processos_partes_ft ON processos(partes);

CREATE INDEX idx_dc_conclusao    ON datas_controlo(conclusao);
CREATE INDEX idx_dc_visto_mp     ON datas_controlo(visto_mp);
CREATE INDEX idx_dc_tabela       ON datas_controlo(inscricao_tabela);
CREATE INDEX idx_dc_acordao      ON datas_controlo(acordao);

CREATE INDEX idx_hist_processo   ON historico_processo(processo_id, data_evento DESC);
CREATE INDEX idx_hist_tipo       ON historico_processo(tipo_evento);

CREATE INDEX idx_aud_sistema_data ON auditoria_sistema(criado_em DESC);
CREATE INDEX idx_aud_sistema_tipo ON auditoria_sistema(tipo_evento);

CREATE INDEX idx_sessoes_expira  ON sessoes_utilizador(expira_em);
CREATE INDEX idx_sessoes_token   ON sessoes_utilizador(token);

CREATE INDEX idx_fich_processo   ON ficheiros_processo(processo_id, eliminado);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  5. VIEWS (consultas pré-definidas)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 5.1 Vista completa de processos (junta todas as tabelas)
CREATE VIEW v_processos_completos AS
SELECT
    p.id,
    p.numero_processo,
    p.numero_processo_externo,
    DATE_FORMAT(p.data_entrada, '%d/%m/%Y')         AS data_entrada,
    DATE_FORMAT(p.data_registo, '%d/%m/%Y %H:%i')   AS data_registo,
    ep.nome                                          AS especie,
    p.partes,
    p.distribuicao,
    p.origem,
    est.label                                        AS estado,
    est.codigo                                       AS estado_codigo,
    est.cor_css                                       AS estado_cor,
    p.observacoes,
    DATE_FORMAT(dc.notificacao_citacao, '%d/%m/%Y')  AS notificacao_citacao,
    DATE_FORMAT(dc.notificacao1,        '%d/%m/%Y')  AS notificacao1,
    DATE_FORMAT(dc.notificacao2,        '%d/%m/%Y')  AS notificacao2,
    DATE_FORMAT(dc.conclusao,           '%d/%m/%Y')  AS conclusao,
    DATE_FORMAT(dc.visto_mp,            '%d/%m/%Y')  AS visto_mp,
    DATE_FORMAT(dc.visto_adjunto1,      '%d/%m/%Y')  AS visto_adjunto1,
    DATE_FORMAT(dc.visto_adjunto2,      '%d/%m/%Y')  AS visto_adjunto2,
    DATE_FORMAT(dc.inscricao_tabela,    '%d/%m/%Y')  AS inscricao_tabela,
    DATE_FORMAT(dc.acordao,             '%d/%m/%Y')  AS acordao,
    DATE_FORMAT(dc.acordao2,            '%d/%m/%Y')  AS acordao2,
    DATE_FORMAT(dc.acordao3,            '%d/%m/%Y')  AS acordao3,
    DATE_FORMAT(dc.notificacao_acordao, '%d/%m/%Y')  AS notificacao_acordao,
    DATE_FORMAT(dc.conta_custas,        '%d/%m/%Y')  AS conta_custas,
    DATE_FORMAT(dc.conta_custas2,       '%d/%m/%Y')  AS conta_custas2,
    DATE_FORMAT(dc.arquivamento,        '%d/%m/%Y')  AS arquivamento,
    u_reg.nome_completo                              AS registado_por,
    u_atu.nome_completo                              AS atualizado_por,
    p.criado_em,
    p.atualizado_em,
    (SELECT COUNT(*) FROM ficheiros_processo f
     WHERE f.processo_id = p.id AND f.eliminado = 0) AS total_ficheiros
FROM processos p
LEFT JOIN especies_processo  ep   ON ep.id  = p.especie_id
LEFT JOIN estados_processo   est  ON est.id = p.estado_id
LEFT JOIN datas_controlo     dc   ON dc.processo_id = p.id
LEFT JOIN utilizadores       u_reg ON u_reg.id = p.registado_por
LEFT JOIN utilizadores       u_atu ON u_atu.id = p.atualizado_por;


-- 5.2 Processos pendentes de Conclusão
CREATE VIEW v_pendentes_conclusao AS
SELECT
    p.id, p.numero_processo, p.data_registo, ep.nome AS especie,
    p.partes, p.distribuicao, p.origem, est.label AS estado
FROM processos p
JOIN especies_processo ep  ON ep.id  = p.especie_id
JOIN estados_processo  est ON est.id = p.estado_id
LEFT JOIN datas_controlo dc ON dc.processo_id = p.id
WHERE (dc.conclusao IS NULL)
  AND est.codigo <> 'archived'
ORDER BY p.data_registo;


-- 5.3 Processos pendentes de Vistos
CREATE VIEW v_pendentes_vistos AS
SELECT
    p.id, p.numero_processo, ep.nome AS especie, p.partes, p.distribuicao,
    DATE_FORMAT(dc.conclusao, '%d/%m/%Y')      AS conclusao,
    DATE_FORMAT(dc.visto_mp, '%d/%m/%Y')       AS visto_mp,
    DATE_FORMAT(dc.visto_adjunto1, '%d/%m/%Y') AS visto_adj1,
    DATE_FORMAT(dc.visto_adjunto2, '%d/%m/%Y') AS visto_adj2,
    CASE WHEN dc.visto_mp IS NULL THEN 'Pendente' ELSE 'OK' END AS status_mp,
    CASE WHEN dc.visto_adjunto1 IS NULL THEN 'Pendente' ELSE 'OK' END AS status_adj1,
    CASE WHEN dc.visto_adjunto2 IS NULL THEN 'Pendente' ELSE 'OK' END AS status_adj2
FROM processos p
JOIN especies_processo ep  ON ep.id  = p.especie_id
JOIN estados_processo  est ON est.id = p.estado_id
JOIN datas_controlo    dc  ON dc.processo_id = p.id
WHERE dc.conclusao IS NOT NULL
  AND (dc.visto_mp IS NULL OR dc.visto_adjunto1 IS NULL OR dc.visto_adjunto2 IS NULL)
  AND est.codigo <> 'archived'
ORDER BY dc.conclusao;


-- 5.4 Processos pendentes de Inscrição em Tabela
CREATE VIEW v_pendentes_tabela AS
SELECT
    p.id, p.numero_processo, ep.nome AS especie, p.partes, p.distribuicao,
    DATE_FORMAT(dc.visto_mp,         '%d/%m/%Y') AS visto_mp,
    DATE_FORMAT(dc.inscricao_tabela, '%d/%m/%Y') AS inscricao_tabela,
    est.label AS estado
FROM processos p
JOIN especies_processo ep  ON ep.id  = p.especie_id
JOIN estados_processo  est ON est.id = p.estado_id
JOIN datas_controlo    dc  ON dc.processo_id = p.id
WHERE dc.visto_mp IS NOT NULL
  AND dc.inscricao_tabela IS NULL
  AND est.codigo <> 'archived'
ORDER BY dc.visto_mp;


-- 5.5 Processos pendentes de Acórdão
CREATE VIEW v_pendentes_acordao AS
SELECT
    p.id, p.numero_processo, ep.nome AS especie, p.partes, p.distribuicao,
    DATE_FORMAT(dc.inscricao_tabela, '%d/%m/%Y') AS inscricao_tabela,
    DATE_FORMAT(dc.acordao,          '%d/%m/%Y') AS acordao,
    est.label AS estado
FROM processos p
JOIN especies_processo ep  ON ep.id  = p.especie_id
JOIN estados_processo  est ON est.id = p.estado_id
JOIN datas_controlo    dc  ON dc.processo_id = p.id
WHERE dc.inscricao_tabela IS NOT NULL
  AND dc.acordao IS NULL
  AND est.codigo <> 'archived'
ORDER BY dc.inscricao_tabela;


-- 5.6 Relatório geral (dashboard / estatísticas — distribuição por estado)
CREATE VIEW v_relatorio_geral AS
SELECT
    est.codigo,
    est.label,
    est.cor_css,
    est.ordem,
    COUNT(p.id) AS total
FROM estados_processo est
LEFT JOIN processos p ON p.estado_id = est.id
GROUP BY est.id, est.codigo, est.label, est.cor_css, est.ordem
ORDER BY est.ordem;


-- 5.7 Distribuição por espécie (módulo Estatísticas)
CREATE VIEW v_distribuicao_especie AS
SELECT
    ep.id,
    ep.nome AS especie,
    ep.ordem,
    COUNT(p.id) AS total
FROM especies_processo ep
LEFT JOIN processos p ON p.especie_id = ep.id
GROUP BY ep.id, ep.nome, ep.ordem
ORDER BY ep.ordem;


-- 5.8 Auditoria — últimas actividades
CREATE VIEW v_auditoria_recente AS
SELECT
    hp.data_evento,
    p.numero_processo,
    hp.descricao,
    hp.tipo_evento,
    hp.estado_anterior,
    hp.estado_novo,
    u.nome_completo AS utilizador,
    hp.ip_origem
FROM historico_processo hp
JOIN processos    p ON p.id = hp.processo_id
LEFT JOIN utilizadores u ON u.id = hp.utilizador_id
ORDER BY hp.data_evento DESC;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  6. TRIGGERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIMITER $$

-- 6.1 Gerar número de processo automático: <prefixo>-AAAA-NNNN
--     Prefixo lido de configuracoes.prefixo_numeracao (cai para 'SGD' se ausente)
CREATE TRIGGER trg_numero_processo
BEFORE INSERT ON processos
FOR EACH ROW
BEGIN
    DECLARE v_ano     INT;
    DECLARE v_proximo INT;
    DECLARE v_prefixo VARCHAR(20);

    IF NEW.numero_processo IS NULL OR NEW.numero_processo = '' THEN
        SET v_ano = YEAR(CURDATE());

        SELECT valor INTO v_prefixo FROM configuracoes WHERE chave = 'prefixo_numeracao' LIMIT 1;
        IF v_prefixo IS NULL OR v_prefixo = '' THEN
            SET v_prefixo = 'SGD';
        END IF;

        SELECT COALESCE(MAX(CAST(RIGHT(numero_processo, 4) AS UNSIGNED)), 0) + 1
          INTO v_proximo
          FROM processos
          WHERE numero_processo LIKE CONCAT(v_prefixo, '-', v_ano, '-%');

        SET NEW.numero_processo = CONCAT(v_prefixo, '-', v_ano, '-', LPAD(v_proximo, 4, '0'));
    END IF;
END$$

-- 6.2 Inserir registo de datas_controlo ao criar processo
CREATE TRIGGER trg_criar_datas_controlo
AFTER INSERT ON processos
FOR EACH ROW
BEGIN
    INSERT INTO datas_controlo (processo_id) VALUES (NEW.id);
END$$

-- 6.3 Registar histórico ao mudar estado
CREATE TRIGGER trg_historico_estado
AFTER UPDATE ON processos
FOR EACH ROW
BEGIN
    DECLARE v_estado_ant VARCHAR(20);
    DECLARE v_estado_nov VARCHAR(20);

    IF OLD.estado_id <> NEW.estado_id THEN
        SELECT codigo INTO v_estado_ant FROM estados_processo WHERE id = OLD.estado_id;
        SELECT codigo INTO v_estado_nov FROM estados_processo WHERE id = NEW.estado_id;

        INSERT INTO historico_processo (processo_id, descricao, tipo_evento, estado_anterior, estado_novo, utilizador_id)
        VALUES (NEW.id,
                CONCAT('Estado alterado: ', v_estado_ant, ' -> ', v_estado_nov),
                'ESTADO', v_estado_ant, v_estado_nov, NEW.atualizado_por);
    END IF;
END$$

DELIMITER ;

-- Nota: atualizado_em em processos/utilizadores/datas_controlo/configuracoes
-- já é mantido automaticamente via "ON UPDATE CURRENT_TIMESTAMP" na própria
-- coluna — não são precisos triggers dedicados a isso em MySQL/MariaDB.


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  7. DADOS DE REFERÊNCIA (lookup — sem dados pessoais/credenciais)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 7.1 Perfis
INSERT INTO perfis (codigo, descricao, pode_criar_utilizadores, pode_eliminar_processos, pode_gerir_sistema) VALUES
    ('Administrador', 'Acesso total — utilizadores, configurações e auditoria',           1, 1, 1),
    ('Secretaria',    'Secretaria — registo, edição e consulta de processos e relatórios', 0, 0, 0),
    ('Visualizador',  'Só consulta — visualizar processos e exportar relatórios',          0, 0, 0);

-- 7.2 Departamentos
INSERT INTO departamentos (nome, sigla) VALUES
    ('Secretaria Geral',          'SEC'),
    ('Tribunal',                  'TRB'),
    ('Recursos Humanos',          'RH'),
    ('Tecnologias de Informação', 'TI'),
    ('Financeiro',                'FIN'),
    ('Juridico',                  'JUR');

-- 7.3 Espécies de processo
INSERT INTO especies_processo (nome, ordem) VALUES
    ('Accao',                   1),
    ('Recurso',                 2),
    ('Incidente',               3),
    ('Providencia Cautelar',    4),
    ('Execucao',                5),
    ('Habeas Corpus',           6),
    ('Mandado de Seguranca',    7),
    ('Peticao',                 8),
    ('Reclamacao',              9),
    ('Outro',                  10);

-- 7.4 Estados do processo
INSERT INTO estados_processo (codigo, label, cor_css, ordem) VALUES
    ('entry',       'Entrada',      'b-entry',       1),
    ('analysis',    'Analise',      'b-analysis',    2),
    ('distributed', 'Distribuido',  'b-distributed', 3),
    ('concluded',   'Concluido',    'b-concluded',   4),
    ('archived',    'Arquivado',    'b-archived',    5);

-- 7.5 Configurações do sistema
INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('tribunal_nome',       'Tribunal Supremo de Cabo Verde', 'Nome do tribunal'),
    ('tribunal_endereco',   'Praia, Santiago, Cabo Verde',    'Endereço do tribunal'),
    ('tribunal_email',      'tribunal@supremo.cv',            'Email institucional'),
    ('prefixo_numeracao',   'SGD',                            'Prefixo dos números de processo'),
    ('processos_pagina',    '15',                             'Processos por página na listagem'),
    ('sessao_expira_min',   '60',                             'Minutos até expiração de sessão'),
    ('max_tentativas_login','5',                              'Tentativas de login antes de bloquear'),
    ('bloqueio_min',        '15',                             'Minutos de bloqueio após exceder tentativas de login'),
    ('registo_auditoria',   '1',                              'Activar registo de auditoria (1=sim, 0=não)'),
    ('versao_sistema',      '1.0.0',                          'Versão do sistema');

-- Utilizadores e processos de demonstração: ver scripts/seed.php
-- (precisam de password_hash() em PHP, que SQL puro não fornece).


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  8. QUERIES DE EXEMPLO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Listar todos os processos (usado pela listagem principal)
-- SELECT * FROM v_processos_completos ORDER BY criado_em DESC;

-- Dashboard / Estatísticas: contagem por estado
-- SELECT * FROM v_relatorio_geral;

-- Estatísticas: distribuição por espécie
-- SELECT * FROM v_distribuicao_especie;

-- Processos pendentes de conclusão / vistos / tabela / acórdão
-- SELECT * FROM v_pendentes_conclusao;
-- SELECT * FROM v_pendentes_vistos;
-- SELECT * FROM v_pendentes_tabela;
-- SELECT * FROM v_pendentes_acordao;

-- Auditoria recente
-- SELECT * FROM v_auditoria_recente LIMIT 20;

-- Pesquisa full-text em partes (autocomplete "processo de origem" usa LIKE simples em vez disto)
-- SELECT id, numero_processo, partes FROM processos WHERE MATCH(partes) AGAINST ('Silva' IN NATURAL LANGUAGE MODE);

-- Processos por espécie no ano corrente
-- SELECT ep.nome AS especie, COUNT(*) AS total
-- FROM processos p JOIN especies_processo ep ON ep.id = p.especie_id
-- WHERE YEAR(p.data_registo) = YEAR(CURDATE())
-- GROUP BY ep.nome ORDER BY total DESC;

-- Histórico completo de um processo
-- SELECT * FROM historico_processo
-- WHERE processo_id = (SELECT id FROM processos WHERE numero_processo = 'SGD-2026-0001')
-- ORDER BY data_evento;

-- Verificar sessão activa (autenticação por token)
-- SELECT u.*, s.expira_em FROM sessoes_utilizador s
-- JOIN utilizadores u ON u.id = s.utilizador_id
-- WHERE s.token = '<token>' AND s.expira_em > NOW() AND s.terminado_em IS NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  FIM DO SCRIPT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
