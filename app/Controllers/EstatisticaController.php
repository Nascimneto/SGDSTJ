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

    /** GET api/estatisticas/detalhe.php?eixo=relator|especie|estado|origem|periodo&valor=...
     *  Drill-down ao clicar num valor de qualquer gráfico/tabela de Estatísticas. */
    public function detalheEixo(): void
    {
        $eixo  = trim((string)($_GET['eixo'] ?? ''));
        $valor = trim((string)($_GET['valor'] ?? ''));
        if ($eixo === '' || $valor === '') {
            http_response_code(400);
            echo json_encode(['erro' => 'Parâmetros eixo e valor são obrigatórios.']);
            return;
        }
        try {
            echo json_encode($this->model->detalheEixo($eixo, $valor, $_GET));
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['erro' => $e->getMessage()]);
        } catch (Throwable $e) {
            // Erro de base de dados ou outro imprevisto: nunca deixar um 500 "em branco"
            // chegar ao cliente (o toast do frontend só sabe mostrar `body.erro` — sem
            // isto, apiGet() cai no fallback genérico "Erro HTTP 500", sem pista nenhuma
            // do que falhou de facto). A mensagem real fica só no log do servidor (mesmo
            // padrão de ProcessoModel::atualizar()), nunca exposta ao cliente.
            error_log('SGD detalheEixo: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['erro' => 'Erro ao obter o detalhe deste valor.']);
        }
    }
}
