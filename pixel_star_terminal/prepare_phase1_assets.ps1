$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Get-FileWithRetry([string]$Url, [string]$OutFile, [int]$Attempts = 3) {
  Ensure-Dir (Split-Path -Parent $OutFile)
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      Write-Host "[$i/$Attempts] $Url"
      Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
      if ((Get-Item $OutFile).Length -le 0) { throw 'Downloaded file is empty.' }
      return
    } catch {
      if ($i -eq $Attempts) { throw }
      Start-Sleep -Milliseconds (300 * $i)
    }
  }
}

function Resize-Image([string]$InputFile, [string]$OutputFile, [int]$TargetWidth) {
  Add-Type -AssemblyName System.Drawing
  $src = [System.Drawing.Image]::FromFile((Resolve-Path $InputFile))
  try {
    $ratio = $TargetWidth / [double]$src.Width
    $targetHeight = [Math]::Max(1, [int][Math]::Round($src.Height * $ratio))
    $bmp = New-Object System.Drawing.Bitmap($TargetWidth, $targetHeight)
    try {
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.DrawImage($src, 0, 0, $TargetWidth, $targetHeight)
      } finally { $gfx.Dispose() }
      Ensure-Dir (Split-Path -Parent $OutputFile)
      $ext = [IO.Path]::GetExtension($OutputFile).ToLowerInvariant()
      if ($ext -eq '.png') {
        $bmp.Save($OutputFile, [System.Drawing.Imaging.ImageFormat]::Png)
      } else {
        $jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $enc = [System.Drawing.Imaging.Encoder]::Quality
        $pars = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $pars.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($enc, [long]94)
        $bmp.Save($OutputFile, $jpgCodec, $pars)
        $pars.Dispose()
      }
    } finally { $bmp.Dispose() }
  } finally { $src.Dispose() }
}

Write-Host 'PIXEL STAR Phase 1 - downloading local Three.js and astronomy textures...'

# Three.js r186 (MIT), runtime is fully local after this one-time preparation.
Get-FileWithRetry 'https://raw.githubusercontent.com/mrdoob/three.js/r186/build/three.module.js' 'vendor/three/three.module.js'
Get-FileWithRetry 'https://raw.githubusercontent.com/mrdoob/three.js/r186/build/three.core.js' 'vendor/three/three.core.js'
Get-FileWithRetry 'https://raw.githubusercontent.com/mrdoob/three.js/r186/LICENSE' 'vendor/three/LICENSE'

# Solar System Scope textures (CC BY 4.0; based on NASA imagery/data).
Get-FileWithRetry 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg' 'assets/textures/standard/saturn.jpg'
Get-FileWithRetry 'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png' 'assets/textures/standard/saturn_ring.png'
Get-FileWithRetry 'https://www.solarsystemscope.com/textures/download/8k_saturn.jpg' 'assets/textures/8k/saturn.jpg'
Get-FileWithRetry 'https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png' 'assets/textures/8k/saturn_ring.png'

Write-Host 'Deriving 4K tier from the authentic 8K source by high-quality downsampling...'
Resize-Image 'assets/textures/8k/saturn.jpg' 'assets/textures/4k/saturn.jpg' 4096
Resize-Image 'assets/textures/8k/saturn_ring.png' 'assets/textures/4k/saturn_ring.png' 4096

Write-Host 'Done. Runtime files are local; no CDN is used by index.html.' -ForegroundColor Green
