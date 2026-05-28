# razão livre

projeto acadêmico da disciplina de bancos de dados não relacionais.

este front-end simula um fluxo contábil com livro razão, razonete, balancete e balanço patrimonial. o objetivo é demonstrar a construção de um protótipo que integra conceitos contábeis com modelagem de dados no estilo nosql.

## estrutura

- `site/index.html` — interface do usuário e layout das telas.
- `site/style.css` — estilos para visualização responsiva e cards.
- `site/script.js` — lógica de lançamento, cálculo de razonete, balancete, balanço e geração de script mongodb.

## foco acadêmico

- demonstração de registro de lançamentos contábeis em documento no estilo nosql.
- uso de campos embutidos (`saldo`) e arrays (`movimentacoes`) para modelagem flexível.
- geração de comandos de carga e consulta para mongodb como suporte ao relatório de requisito.
