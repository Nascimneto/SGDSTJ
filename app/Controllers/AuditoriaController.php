<?php
require_once __DIR__ . '/../Models/AuditoriaModel.php';

class AuditoriaController
{
    private AuditoriaModel $model;

    public function __construct()
    {
        $this->model = new AuditoriaModel(Database::pdo());
    }

    /** GET auditoria.php — página HTML. */
    public function index(): void
    {
        // Título reflecte o item de menu seguido (Histórico vs Auditoria — ver
        // includes/sidebar.php) e a aba inicial é decidida em js/auditoria.js.
        $tituloPagina = ($_GET['aba'] ?? 'historico') === 'sistema' ? 'Auditoria' : 'Histórico';

        View::render('auditoria/index', [
            'paginaActiva'    => 'auditoria',
            'tituloPagina'    => $tituloPagina,
            'utilizadores'    => $this->model->listarUtilizadores(),
            // Tipos de evento do histórico de processos (historico_processo) e da
            // auditoria do sistema (auditoria_sistema) são listas distintas — ver
            // app/Core/Auditoria.php e database.sql para a separação entre as duas tabelas.
            'tiposHistorico'  => ['REGISTO', 'EDICAO', 'ESTADO', 'DATA'],
            'tiposAuditoria'  => ['UTILIZADOR', 'CONFIGURACAO'],
        ]);
    }

    /** GET api/auditoria/listar.php — chamador já correu ApiGuard::exigirPerfil(['Administrador']). */
    public function listar(): void
    {
        echo json_encode(['items' => $this->model->listarHistorico($_GET)]);
    }

    /** GET api/auditoria/sistema.php — chamador já correu ApiGuard::exigirPerfil(['Administrador']). */
    public function sistema(): void
    {
        echo json_encode(['items' => $this->model->listarSistema($_GET)]);
    }
}
