-- ══════════════════════════════════════════════════════════════
-- Migração consolidada — 2026-07-10
-- Junta as 3 migrações pendentes:
--   scripts/migrar_redistribuicao.php
--   scripts/migrar_notificacao_acordao.php
--   scripts/migrar_notificacao_custas.php
--
-- Idempotente (usa IF NOT EXISTS — suportado em MariaDB) e não apaga
-- nem altera dados existentes. Pode ser colada de uma vez na aba SQL
-- do phpMyAdmin.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE processos
    ADD COLUMN IF NOT EXISTS redistribuicao VARCHAR(150) NULL AFTER distribuicao;

ALTER TABLE datas_controlo
    ADD COLUMN IF NOT EXISTS notificacao_acordao2 DATE NULL AFTER notificacao_acordao,
    ADD COLUMN IF NOT EXISTS notificacao_acordao3 DATE NULL AFTER notificacao_acordao2,
    ADD COLUMN IF NOT EXISTS notificacao_conta_custas  DATE NULL AFTER conta_custas2,
    ADD COLUMN IF NOT EXISTS notificacao_conta_custas2 DATE NULL AFTER notificacao_conta_custas;

DROP VIEW IF EXISTS v_processos_completos;
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
    p.redistribuicao,
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
    DATE_FORMAT(dc.notificacao_acordao2,'%d/%m/%Y')  AS notificacao_acordao2,
    DATE_FORMAT(dc.notificacao_acordao3,'%d/%m/%Y')  AS notificacao_acordao3,
    DATE_FORMAT(dc.conta_custas,        '%d/%m/%Y')  AS conta_custas,
    DATE_FORMAT(dc.conta_custas2,       '%d/%m/%Y')  AS conta_custas2,
    DATE_FORMAT(dc.notificacao_conta_custas, '%d/%m/%Y')  AS notificacao_conta_custas,
    DATE_FORMAT(dc.notificacao_conta_custas2,'%d/%m/%Y')  AS notificacao_conta_custas2,
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
