-- ══════════════════════════════════════════════════════════════
-- Migração — 2026-07-26
-- Reforça ao nível da base de dados a regra "Número de Processo +
-- Espécie não pode repetir" (já validada em ProcessoModel::criar()/
-- atualizar() via existeNumeroEspecie()) — sem esta constraint, dois
-- pedidos em simultâneo ainda podiam criar um duplicado (condição de
-- corrida entre o SELECT de validação e o INSERT).
--
-- O Número de Processo em si CONTINUA a poder repetir-se entre
-- processos de espécies diferentes — só a combinação das duas colunas
-- passa a ser única.
--
-- PASSO 1 (obrigatório, correr primeiro e ler o resultado): verifica
-- se já existem duplicados em produção. Se devolver alguma linha, a
-- ALTER TABLE do passo 2 vai falhar — resolva esses duplicados
-- primeiro (edite o Número de Processo ou a Espécie de um dos dois
-- processos em conflito) antes de continuar.
-- ══════════════════════════════════════════════════════════════

SELECT numero_processo_externo, especie_id, COUNT(*) AS total_duplicados,
       GROUP_CONCAT(numero_processo ORDER BY numero_processo) AS processos_em_conflito
FROM processos
WHERE numero_processo_externo IS NOT NULL AND TRIM(numero_processo_externo) <> ''
GROUP BY numero_processo_externo, especie_id
HAVING COUNT(*) > 1;

-- ══════════════════════════════════════════════════════════════
-- PASSO 2 — só correr depois de confirmar que o PASSO 1 não devolveu
-- nenhuma linha. Idempotente (IF NOT EXISTS — suportado em MariaDB).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE processos
    ADD UNIQUE INDEX IF NOT EXISTS uq_processos_numero_especie (numero_processo_externo, especie_id);
