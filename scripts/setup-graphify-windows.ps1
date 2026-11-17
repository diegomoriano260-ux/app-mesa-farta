# Instala e configura o Graphify no Windows, sem gastar tokens.
# Rode na pasta do projeto:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-graphify-windows.ps1
# Pode rodar de novo quantas vezes quiser: nada é duplicado.
# O arquivo é salvo em UTF-8 com BOM para o Windows PowerShell 5.1 ler os acentos.

$ErrorActionPreference = 'Stop'
$projeto  = Split-Path -Parent $PSScriptRoot
$claudeDir = Join-Path $env:USERPROFILE '.claude'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # UTF-8 sem BOM

function Passo($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

# Garante que a pasta de ferramentas do uv esteja no PATH desta janela
$binUv = Join-Path $env:USERPROFILE '.local\bin'
if (($env:Path -split ';') -notcontains $binUv) { $env:Path = "$binUv;$env:Path" }

# 1. uv
Passo '1/6 uv'
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Host "uv já instalado: $(uv --version)"
} else {
    Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { throw 'uv não foi encontrado depois da instalação.' }
}

# 2. graphifyy (o pacote oficial, com dois y)
Passo '2/6 graphifyy'
uv tool install graphifyy
if ($LASTEXITCODE -ne 0) { uv tool upgrade graphifyy }
uv tool update-shell | Out-Null   # deixa o comando graphify no PATH das próximas janelas
if (-not (Get-Command graphify -ErrorAction SilentlyContinue)) { throw 'O comando graphify não foi encontrado.' }

# 3. Skill do graphify no Claude Code
Passo '3/6 graphify install (skill no Claude Code)'
graphify install

# 4. GRAPHIFY_BACKEND=none e idioma português nas configurações gerais do Claude
Passo '4/6 GRAPHIFY_BACKEND=none e idioma português em ~/.claude/settings.json'
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
$settingsPath = Join-Path $claudeDir 'settings.json'
# A cópia só é feita uma vez, para guardar sempre o arquivo original
if ((Test-Path $settingsPath) -and -not (Test-Path "$settingsPath.bak")) { Copy-Item $settingsPath "$settingsPath.bak" }
# O JSON é editado com o Python que veio junto com o graphify, e não com
# ConvertFrom-Json: no Windows PowerShell ele confunde chaves que só diferem
# em maiúsculas/minúsculas (como NO_PROXY e no_proxy) e se recusa a ler o arquivo.
$pastaGraphify = Join-Path ((uv tool dir) | Select-Object -Last 1).Trim() 'graphifyy'
$python = @('Scripts\python.exe', 'bin/python') |
    ForEach-Object { Join-Path $pastaGraphify $_ } |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $python) { throw "Python do graphify não encontrado em $pastaGraphify." }
$codigo = @'
import json, sys
caminho = sys.argv[1]
try:
    texto = open(caminho, encoding="utf-8-sig").read()
except FileNotFoundError:
    texto = ""
dados = json.loads(texto) if texto.strip() else {}
dados.setdefault("env", {})["GRAPHIFY_BACKEND"] = "none"
dados["language"] = "portuguese"
with open(caminho, "w", encoding="utf-8", newline="\n") as f:
    json.dump(dados, f, indent=2, ensure_ascii=False)
    f.write("\n")
'@
$codigo | & $python - $settingsPath
if ($LASTEXITCODE -ne 0) { throw "Não consegui atualizar $settingsPath. O original continua em settings.json.bak." }
Write-Host "ok: $settingsPath (cópia do original em settings.json.bak)"

# 5. Regras de economia de tokens no CLAUDE.md geral (copiadas do CLAUDE.md do projeto)
Passo '5/6 regras de economia de tokens em ~/.claude/CLAUDE.md'
$titulo = '## graphify: economia de tokens'
$claudeProjeto = [IO.File]::ReadAllText((Join-Path $projeto 'CLAUDE.md'), $utf8)
$inicio = $claudeProjeto.IndexOf($titulo)
if ($inicio -lt 0) { throw "Seção '$titulo' não encontrada no CLAUDE.md do projeto." }
$secao = $claudeProjeto.Substring($inicio).Trim()
$claudeGeral = Join-Path $claudeDir 'CLAUDE.md'
$atual = if (Test-Path $claudeGeral) { [IO.File]::ReadAllText($claudeGeral, $utf8) } else { '' }
if ($atual.Contains($titulo)) {
    Write-Host 'já estava lá, nada mudou.'
} else {
    [IO.File]::WriteAllText($claudeGeral, ($atual.TrimEnd() + "`r`n`r`n" + $secao + "`r`n"), $utf8)
    Write-Host "ok: $claudeGeral"
}

# 6. Atualiza o grafo do projeto (só leitura do código, custo zero)
Passo '6/6 graphify update . (custo zero)'
$env:GRAPHIFY_BACKEND = 'none'
Push-Location $projeto
try { graphify update . } finally { Pop-Location }

Write-Host "`nPronto. Feche e abra o terminal (e o Claude Code) para tudo valer." -ForegroundColor Green
