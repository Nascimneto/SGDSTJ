<?php
class PainelController
{
    public function index(): void
    {
        View::render('painel/index', [
            'paginaActiva' => 'painel',
            'tituloPagina' => 'Painel Geral',
        ]);
    }
}
