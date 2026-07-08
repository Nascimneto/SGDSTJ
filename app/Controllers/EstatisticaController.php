<?php
require_once __DIR__ . '/../Models/EstatisticaModel.php';

class EstatisticaController
{
    private EstatisticaModel $model;

    public function __construct()
    {
        $this->model = new EstatisticaModel(Database::pdo());
    }

    /** GET estatisticas.php — página HTML. */
    public function index(): void
    {
        View::render('estatisticas/index', [
            'paginaActiva' => 'estatisticas',
            'tituloPagina' => 'Estatísticas e Relatórios',
            // Lista de utilizadores para o filtro — não exige perfil Administrador
            // (api/estatisticas/distribuicao.php já devolve esta lista, agregada
            // por utilizador, a qualquer perfil autenticado).
            'utilizadores' => $this->model->listarUtilizadores(),
        ]);
    }

    /** GET api/estatisticas/resumo.php */
    public function resumo(): void
    {
        echo json_encode($this->model->resumo($_GET));
    }

    /** GET api/estatisticas/distribuicao.php */
    public function distribuicao(): void
    {
        echo json_encode($this->model->distribuicao($_GET));
    }

    /** GET api/estatisticas/funil.php */
    public function funil(): void
    {
        echo json_encode(['funil' => $this->model->funil($_GET)]);
    }

    /** GET api/estatisticas/volume.php */
    public function volume(): void
    {
        echo json_encode($this->model->volume($_GET));
    }

    /** GET api/estatisticas/produtividade.php */
    public function produtividade(): void
    {
        echo json_encode($this->model->produtividade($_GET));
    }
}
