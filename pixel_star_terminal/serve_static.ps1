$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8123
$Prefix = "http://127.0.0.1:$Port/"

$Mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.png'='image/png'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.ttf'='font/ttf'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'
}

$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)
try {
  $Listener.Start()
} catch {
  Write-Host "Cannot bind $Prefix" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

Write-Host "PIXEL STAR is running at $Prefix" -ForegroundColor Cyan
Write-Host 'Keep this window open while using the site. Press Ctrl+C or close it to stop.' -ForegroundColor DarkGray
Start-Process ($Prefix + 'index.html')

try {
  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $RequestPath = [Uri]::UnescapeDataString($Context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($RequestPath)) { $RequestPath = 'index.html' }

    $Candidate = [IO.Path]::GetFullPath((Join-Path $Root $RequestPath.Replace('/', [IO.Path]::DirectorySeparatorChar)))
    $RootFull = [IO.Path]::GetFullPath($Root + [IO.Path]::DirectorySeparatorChar)
    if (-not $Candidate.StartsWith($RootFull, [StringComparison]::OrdinalIgnoreCase)) {
      $Context.Response.StatusCode = 403
      $Context.Response.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
      $Context.Response.StatusCode = 404
      $Context.Response.Close()
      continue
    }

    $Bytes = [IO.File]::ReadAllBytes($Candidate)
    $Ext = [IO.Path]::GetExtension($Candidate).ToLowerInvariant()
    $ContentType = $Mime[$Ext]
    if (-not $ContentType) { $ContentType = 'application/octet-stream' }

    $Context.Response.StatusCode = 200
    $Context.Response.ContentType = $ContentType
    $Context.Response.ContentLength64 = $Bytes.Length
    $Context.Response.Headers['Cache-Control'] = 'no-store'
    $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    $Context.Response.OutputStream.Close()
  }
} finally {
  $Listener.Stop()
  $Listener.Close()
}
