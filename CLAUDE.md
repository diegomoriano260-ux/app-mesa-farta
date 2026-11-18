## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## graphify: economia de tokens (vale para todas as tarefas)
- Atualizar o grafo depois de mudar código: sempre `graphify update .` (só AST, custo zero de API).
- Nunca rodar `graphify cluster-only`, `graphify label` ou extração semântica com LLM. Se precisar refazer os grupos, use `GRAPHIFY_BACKEND=none graphify cluster-only .`.
- Para entender o código, consultar o grafo antes de ler arquivos: `graphify query "<pergunta>"`, `graphify explain "<nó>"`, `graphify path "<A>" "<B>"`. Abrir arquivo só nas linhas que o grafo já apontou.
- Referência (`graphify benchmark`): ler o projeto todo ≈ 3.900 tokens; uma pergunta pelo grafo ≈ 1.200 tokens (~3x menos).

## Leitura de arquivos e links (markitdown)
- Sempre que o usuário enviar ou citar um arquivo ou link para ler, resumir ou extrair dados (PDF, Word, Excel, PowerPoint, HTML, CSV, JSON, XML, imagem, áudio, ZIP, EPUB ou página web), converta para Markdown com o MarkItDown automaticamente, sem esperar o usuário pedir "markitdown".
- Ordem de preferência: ferramenta MCP `convert_to_markdown` (servidor `markitdown` em `.mcp.json`); se não estiver carregada, o comando `markitdown <arquivo>` (ou `uvx markitdown <arquivo>`); se não estiver instalado, `pip install 'markitdown[all]'` antes.
- Arquivo de texto simples ou código-fonte (.md, .txt, .js etc.) se lê direto, sem conversão.
- Saída grande: salvar o .md no scratchpad e ler só as partes necessárias.
