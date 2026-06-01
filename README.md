# razão livre

projeto acadêmico da disciplina de bancos de dados não relacionais.

este front-end simula um fluxo contábil com livro razão, razonete, balancete e balanço patrimonial. o objetivo é demonstrar a construção de um protótipo que integra conceitos contábeis com modelagem de dados no estilo nosql.

## estrutura

- `site/index.html` — interface do usuário e layout das telas.
- `site/style.css` — estilos para visualização responsiva e cards.
- `site/script.js` — lógica de lançamento, cálculo de razonete, balancete, balanço e geração de script mongodb.
- `server.js` — servidor local em node que expõe a API de persistência e relatório.
- `src/` — lógica de negócio, persistência mongodb e geração de relatório json.

## foco acadêmico

- demonstração de registro de lançamentos contábeis em documento no estilo nosql.
- uso de campos embutidos (`saldo`) e arrays (`movimentacoes`) para modelagem flexível.
- geração de comandos de carga e consulta para mongodb como suporte ao relatório de requisito.

## backend local

- conexão com mongodb local em `mongodb://localhost:27017` pelo endpoint `/api`.
- persistência completa dos lançamentos criados pelo front-end diretamente em MongoDB.
- front-end carrega lançamentos salvos no banco ao abrir a aplicação, não depende apenas de estado local.
- dados também são gravados localmente em `data/lancamentos.json` como fallback.
- banco mongodb padrão utilizado: `razao-livre` (coleção `lancamentos`).
- relatório final gerado por pipeline mongodb e gravado em `data/relatorio.json` e `data/relatorio.txt`.
- adicionado download direto de relatório JSON e relatório TXT pela interface.
- front-end mantém geração de script `mongosh` e leitura do relatório JSON.

## execução

1. instale dependências com `npm install`.
2. execute `npm start`.
3. abra `http://localhost:3000` no navegador.
