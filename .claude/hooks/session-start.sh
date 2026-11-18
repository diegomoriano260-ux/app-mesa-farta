#!/bin/bash
# Prepara cada sessão do Claude Code na web (nuvem): instala o graphify,
# registra a skill dele e instala as dependências do projeto.
# Só roda na nuvem; no computador da pessoa ele sai sem fazer nada.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Pasta onde o uv instala as ferramentas (ex.: ~/.local/bin)
export PATH="$HOME/.local/bin:$PATH"

# 1. uv (só se faltar)
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
bindir="$(uv tool dir --bin 2>/dev/null)"
export PATH="$bindir:$PATH"

# 2. graphify: o pacote oficial é graphifyy, com dois y (só se faltar)
if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy
fi

# 3. Skill do graphify no Claude Code (só se faltar)
if [ ! -f "$HOME/.claude/skills/graphify/SKILL.md" ]; then
  graphify install >/dev/null
fi

# 3b. Baixa em segundo plano os servidores MCP do .mcp.json (markitdown e playwright),
# para eles conectarem rápido. Não segura o início da sessão e falhas são ignoradas.
( uvx markitdown-mcp --help || true ) >/dev/null 2>&1 &
( npx -y @playwright/mcp@latest --help || true ) >/dev/null 2>&1 &

# 4. Dependências do projeto, só quando package.json ou package-lock.json mudarem
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # Apaga os hashes antigos antes: se a instalação falhar, ela roda de novo na próxima vez
  rm -f "$hashes"
  npm install --no-audit --no-fund --no-update-notifier
  sha256sum .claude/hooks/session-start.sh package.json package-lock.json > "$hashes" || rm -f "$hashes"
fi

# 5. Deixa o graphify no PATH durante toda a sessão
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$bindir:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
