-- ══════════════════════════════════════════════════════════════
-- Migração — 2026-07-22 (b)
-- Adiciona processos.distribuicao_data (Data de Distribuição, ao
-- lado de Distribuição em "Identificação do Processo") e
-- datas_controlo.numero_acordao/numero_acordao2/numero_acordao3
-- (nº do acórdão, ao lado de cada campo de data Acórdão/2º/3º
-- Acórdão).
--
-- Idempotente (usa IF NOT EXISTS — suportado em MariaDB) e não apaga
-- nem altera dados existentes. Pode ser colada de uma vez na aba SQL
-- do phpMyAdmin.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE processos
    ADD COLUMN IF NOT EXISTS distribuicao_data DATE NULL AFTER distribuicao;

ALTER TABLE datas_controlo
    ADD COLUMN IF NOT EXISTS numero_acordao  VARCHAR(50) NULL AFTER acordao,
    ADD COLUMN IF NOT EXISTS numero_acordao2 VARCHAR(50) NULL AFTER acordao2,
    ADD COLUMN IF NOT EXISTS numero_acordao3 VARCHAR(50) NULL AFTER acordao3;

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
    DATE_FORMAT(p.distribuicao_data, '%d/%m/%Y')     AS distribuicao_data,
    p.redistribuicao,
    p.origem,
    est.label                                        AS estado,
    est.codigo                                       AS estado_codigo,
    est.cor_css                                       AS estado_cor,
    p.observacoes,
    DATE_FORMAT(dc.redistribuicao_data, '%d/%m/%Y')  AS redistribuicao_data,
    DATE_FORMAT(dc.notificacao_citacao, '%d/%m/%Y')  AS notificacao_citacao,
    DATE_FORMAT(dc.notificacao1,        '%d/%m/%Y')  AS notificacao1,
    DATE_FORMAT(dc.notificacao2,        '%d/%m/%Y')  AS notificacao2,
    DATE_FORMAT(dc.conclusao,           '%d/%m/%Y')  AS conclusao,
    DATE_FORMAT(dc.visto_mp,            '%d/%m/%Y')  AS visto_mp,
    DATE_FORMAT(dc.visto_adjunto1,      '%d/%m/%Y')  AS visto_adjunto1,
    DATE_FORMAT(dc.visto_adjunto2,      '%d/%m/%Y')  AS visto_adjunto2,
    DATE_FORMAT(dc.inscricao_tabela,    '%d/%m/%Y')  AS inscricao_tabela,
    DATE_FORMAT(dc.acordao,             '%d/%m/%Y')  AS acordao,
    dc.numero_acordao,
    DATE_FORMAT(dc.acordao2,            '%d/%m/%Y')  AS acordao2,
    dc.numero_acordao2,
    DATE_FORMAT(dc.acordao3,            '%d/%m/%Y')  AS acordao3,
    dc.numero_acordao3,
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
