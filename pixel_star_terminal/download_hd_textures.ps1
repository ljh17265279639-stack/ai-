$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Ensure-Dir([string]$Path) { if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null } }
function Test-UsableFile([string]$Path, [int64]$MinBytes = 64) { return (Test-Path -LiteralPath $Path -PathType Leaf) -and ((Get-Item -LiteralPath $Path).Length -ge $MinBytes) }
function Download-One([string]$Name,[string]$Url,[string]$OutFile,[int64]$MinBytes) {
  if (Test-UsableFile $OutFile $MinBytes) { Write-Host "[OK] $Name already local." -ForegroundColor DarkGreen; return }
  Ensure-Dir (Split-Path -Parent $OutFile)
  $temp="$OutFile.download"; if(Test-Path $temp){Remove-Item -Force $temp}
  Write-Host "[HD] $Name" -ForegroundColor Cyan
  & curl.exe -fL --silent --show-error --connect-timeout 8 --max-time 180 --retry 2 --retry-delay 2 --output $temp $Url
  if($LASTEXITCODE -ne 0 -or -not (Test-UsableFile $temp $MinBytes)){ if(Test-Path $temp){Remove-Item -Force $temp}; throw "Failed: $Name" }
  Move-Item -Force $temp $OutFile
}
function Resize-Image([string]$InputFile,[string]$OutputFile,[int]$TargetWidth) {
  Add-Type -AssemblyName System.Drawing
  $src=[System.Drawing.Image]::FromFile((Resolve-Path $InputFile))
  try {
    $ratio=$TargetWidth/[double]$src.Width; $h=[Math]::Max(1,[int][Math]::Round($src.Height*$ratio))
    $bmp=New-Object System.Drawing.Bitmap($TargetWidth,$h)
    try {
      $g=[System.Drawing.Graphics]::FromImage($bmp)
      try { $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($src,0,0,$TargetWidth,$h) } finally {$g.Dispose()}
      Ensure-Dir (Split-Path -Parent $OutputFile)
      if([IO.Path]::GetExtension($OutputFile).ToLowerInvariant() -eq '.png'){$bmp.Save($OutputFile,[System.Drawing.Imaging.ImageFormat]::Png)}
      else {$codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|Where-Object{$_.MimeType -eq 'image/jpeg'}; $p=New-Object System.Drawing.Imaging.EncoderParameters(1); $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]94); $bmp.Save($OutputFile,$codec,$p);$p.Dispose()}
    } finally {$bmp.Dispose()}
  } finally {$src.Dispose()}
}

Download-One 'Saturn 8K' 'https://www.solarsystemscope.com/textures/download/8k_saturn.jpg' 'assets/textures/8k/saturn.jpg' 500000
Download-One 'Saturn ring 8K' 'https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png' 'assets/textures/8k/saturn_ring.png' 100000
Write-Host 'Creating local 4K tier from authentic 8K source...' -ForegroundColor White
Resize-Image 'assets/textures/8k/saturn.jpg' 'assets/textures/4k/saturn.jpg' 4096
Resize-Image 'assets/textures/8k/saturn_ring.png' 'assets/textures/4k/saturn_ring.png' 4096
Write-Host 'HD tiers ready.' -ForegroundColor Green
