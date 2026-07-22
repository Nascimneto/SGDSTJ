-- ══════════════════════════════════════════════════════════════
-- Migração — 2026-07-22
-- Cria a tabela "magistrados" — lista configurável de nomes usada
-- pelo combobox de Distribuição e Redistribuição no formulário de
-- Processos, gerida em Configurações. processos.distribuicao e
-- processos.redistribuicao continuam VARCHAR livre (sem FK); esta
-- tabela só alimenta as opções do combobox.
--
-- Semeia a tabela com os nomes já usados em processos.distribuicao/
-- redistribuicao, para nenhum valor existente desaparecer quando
-- esses campos passam de texto livre a combobox.
--
-- Idempotente e não apaga nem altera dados existentes. Pode ser
-- colada de uma vez na aba SQL do phpMyAdmin.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS magistrados (
    id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome   VARCHAR(150) NOT NULL UNIQUE,
    activo TINYINT(1)   NOT NULL DEFAULT 1,
    ordem  SMALLINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO magistrados (nome, ordem)
SELECT nome, @rn := @rn + 1 AS ordem
FROM (
    SELECT DISTINCT TRIM(distribuicao) AS nome FROM processos WHERE distribuicao IS NOT NULL AND TRIM(distribuicao) <> ''
    UNION
    SELECT DISTINCT TRIM(redistribuicao) AS nome FROM processos WHERE redistribuicao IS NOT NULL AND TRIM(redistribuicao) <> ''
) nomes_existentes, (SELECT @rn := (SELECT COALESCE(MAX(ordem),0) FROM magistrados)) init
ORDER BY nome;
