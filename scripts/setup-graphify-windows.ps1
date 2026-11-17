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
if (Test-Path $settingsPath) {
    $texto = [IO.File]::ReadAllText($settingsPath, $utf8)
    Copy-Item $settingsPath "$settingsPath.bak" -Force
    $settings = if ($texto.Trim()) { $texto | ConvertFrom-Json } else { New-Object PSObject }
} else {
    $settings = New-Object PSObject
}
if (-not $settings.PSObject.Properties['env']) {
    $settings | Add-Member -NotePropertyName env -NotePropertyValue (New-Object PSObject)
}
if ($settings.env.PSObject.Properties['GRAPHIFY_BACKEND']) {
    $settings.env.GRAPHIFY_BACKEND = 'none'
} else {
    $settings.env | Add-Member -NotePropertyName GRAPHIFY_BACKEND -NotePropertyValue 'none'
}
if ($settings.PSObject.Properties['language']) {
    $settings.language = 'portuguese'
} else {
    $settings | Add-Member -NotePropertyName language -NotePropertyValue 'portuguese'
}
[IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 50), $utf8)
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
