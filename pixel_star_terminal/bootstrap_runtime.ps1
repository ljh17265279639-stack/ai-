$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null }
}

function Test-UsableFile([string]$Path, [int64]$MinBytes = 64) {
  return (Test-Path -LiteralPath $Path -PathType Leaf) -and ((Get-Item -LiteralPath $Path).Length -ge $MinBytes)
}

function Download-FromMirrors {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string[]]$Urls,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [int64]$MinBytes = 64
  )

  if (Test-UsableFile $OutFile $MinBytes) {
    Write-Host "[OK] $Name already local." -ForegroundColor DarkGreen
    return
  }

  Ensure-Dir (Split-Path -Parent $OutFile)
  $temp = "$OutFile.download"
  if (Test-Path $temp) { Remove-Item -Force $temp }

  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curl) { throw 'curl.exe was not found. Windows 10/11 normally includes it.' }

  $index = 0
  foreach ($url in $Urls) {
    $index++
    Write-Host "[$Name] mirror $index/$($Urls.Count)" -ForegroundColor Cyan
    Write-Host "  $url" -ForegroundColor DarkGray

    & curl.exe -fL --silent --show-error --connect-timeout 7 --max-time 35 --retry 1 --retry-delay 1 --output $temp $url
    $code = $LASTEXITCODE

    if ($code -eq 0 -and (Test-UsableFile $temp $MinBytes)) {
      Move-Item -Force $temp $OutFile
      Write-Host "[OK] $Name" -ForegroundColor Green
      return
    }

    if (Test-Path $temp) { Remove-Item -Force $temp }
    Write-Host "  mirror failed quickly; trying next..." -ForegroundColor DarkYellow
  }

  throw "Unable to download $Name from all configured mirrors."
}

Write-Host 'PIXEL STAR - preparing minimum offline runtime...' -ForegroundColor White
Write-Host 'No single network request can block indefinitely.' -ForegroundColor DarkGray

Download-FromMirrors -Name 'Three.js module' -OutFile 'vendor/three/three.module.js' -MinBytes 300000 -Urls @(
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.0/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js',
  'https://unpkg.com/three@0.186.0/build/three.module.js',
  'https://raw.githubusercontent.com/mrdoob/three.js/r186/build/three.module.js'
)

Download-FromMirrors -Name 'Three.js core' -OutFile 'vendor/three/three.core.js' -MinBytes 800000 -Urls @(
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.0/three.core.js',
  'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.core.js',
  'https://unpkg.com/three@0.186.0/build/three.core.js',
  'https://raw.githubusercontent.com/mrdoob/three.js/r186/build/three.core.js'
)

Download-FromMirrors -Name 'Three.js license' -OutFile 'vendor/three/LICENSE' -MinBytes 500 -Urls @(
  'https://cdn.jsdelivr.net/npm/three@0.186.0/LICENSE',
  'https://unpkg.com/three@0.186.0/LICENSE',
  'https://raw.githubusercontent.com/mrdoob/three.js/r186/LICENSE'
)

Download-FromMirrors -Name 'Saturn 2K texture' -OutFile 'assets/textures/standard/saturn.jpg' -MinBytes 100000 -Urls @(
  'https://www.simplespacedata.org/texture/solarsystemscope/saturn/latest/2k_saturn.jpg',
  'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg'
)

# The ring texture improves fidelity, but it must NEVER block the whole website.
# Try the public Simple Space Data mirror first, then the original publisher.
try {
  Download-FromMirrors -Name 'Saturn ring 2K texture' -OutFile 'assets/textures/standard/saturn_ring.png' -MinBytes 8000 -Urls @(
    'https://www.simplespacedata.org/texture/solarsystemscope/saturn_ring_alpha/latest/2k_saturn_ring_alpha.png',
    'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',
    'https://www.solarsystemscope.com/textures/download/2k_saturn_rings.png'
  )
} catch {
  Write-Host '[WARN] Real Saturn ring texture is temporarily unavailable.' -ForegroundColor Yellow
  Write-Host '       PIXEL STAR will still start using its local geometry fallback.' -ForegroundColor DarkYellow
  Write-Host '       Re-run START_PIXEL_STAR.cmd later to retry, or install the PNG manually.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Minimum runtime is ready. The website can now start from local files.' -ForegroundColor Green
Write-Host 'If the real ring PNG was unavailable, the renderer will use a non-blocking fallback.' -ForegroundColor DarkGray
Write-Host '4K/8K textures are optional and can be installed later with DOWNLOAD_HD_TEXTURES.cmd.' -ForegroundColor DarkGray
