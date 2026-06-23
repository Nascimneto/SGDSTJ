<?php
require_once __DIR__ . '/../../includes/api_guard.php';
require_once __DIR__ . '/../../config/conexao.php';

$pdo = obterConexao();

$pendentes = $pdo->query(
    "SELECT p.id, p.numero_processo, ep.nome AS especie, p.partes, p.distribuicao,
            dc.visto_mp, dc.visto_adjunto1, dc.visto_adjunto2,
            umP.nome_completo AS visto_mp_por, ua1.nome_completo AS visto_adj1_por, ua2.nome_completo AS visto_adj2_por
     FROM processos p
     JOIN especies_processo ep ON ep.id = p.especie_id
     JOIN estados_processo est ON est.id = p.estado_id
     JOIN datas_controlo dc ON dc.processo_id = p.id
     LEFT JOIN utilizadores umP ON umP.id = dc.registado_visto_mp_por
     LEFT JOIN utilizadores ua1 ON ua1.id = dc.registado_visto_adj1_por
     LEFT JOIN utilizadores ua2 ON ua2.id = dc.registado_visto_adj2_por
     WHERE dc.conclusao IS NOT NULL
       AND (dc.visto_mp IS NULL OR dc.visto_adjunto1 IS NULL OR dc.visto_adjunto2 IS NULL)
       AND est.codigo <> 'archived'
     ORDER BY dc.conclusao"
)->fetchAll();

$concluidos = (int)$pdo->query(
    "SELECT COUNT(*) FROM datas_controlo dc
     JOIN processos p ON p.id = dc.processo_id
     JOIN estados_processo e ON e.id = p.estado_id
     WHERE dc.visto_mp IS NOT NULL AND dc.visto_adjunto1 IS NOT NULL AND dc.visto_adjunto2 IS NOT NULL
       AND e.codigo <> 'archived'"
)->fetchColumn();

echo json_encode(['pendentes' => $pendentes, 'concluidosCount' => $concluidos]);
