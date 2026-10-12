$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$OutFile = 'assets/textures/standard/saturn_ring.png'
$Temp = "$OutFile.download"
if (-not (Test-Path (Split-Path -Parent $OutFile))) { New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null }
$Urls = @(
  'https://www.simplespacedata.org/texture/solarsystemscope/saturn_ring_alpha/latest/2k_saturn_ring_alpha.png',
  'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',
  'https://www.solarsystemscope.com/textures/download/2k_saturn_rings.png'
)
if (Test-Path $Temp) { Remove-Item -Force $Temp }
$ok = $false
foreach ($url in $Urls) {
  Write-Host "Trying: $url" -ForegroundColor Cyan
  & curl.exe -fL --silent --show-error --connect-timeout 7 --max-time 30 --retry 1 --retry-delay 1 --output $Temp $url
  if ($LASTEXITCODE -eq 0 -and (Test-Path $Temp) -and ((Get-Item $Temp).Length -ge 8000)) {
    Move-Item -Force $Temp $OutFile
    $ok = $true
    break
  }
  if (Test-Path $Temp) { Remove-Item -Force $Temp }
}
if ($ok) {
  Write-Host '[OK] Real Saturn ring texture installed locally.' -ForegroundColor Green
  exit 0
}
Write-Host '[WARN] Real ring texture is still unavailable. The site remains usable with the local fallback.' -ForegroundColor Yellow
exit 0
