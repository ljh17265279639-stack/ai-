@echo off
setlocal
cd /d "%~dp0"
title PIXEL STAR - Local Static Server

echo [PIXEL STAR] Checking local runtime files...

set NEED_BOOTSTRAP=0
if not exist "vendor\three\three.module.js" set NEED_BOOTSTRAP=1
if not exist "vendor\three\three.core.js" set NEED_BOOTSTRAP=1
if not exist "assets\textures\standard\saturn.jpg" set NEED_BOOTSTRAP=1

if "%NEED_BOOTSTRAP%"=="1" (
  echo [PIXEL STAR] Preparing the minimum LOCAL runtime pack.
  echo [PIXEL STAR] Real ring texture is optional for startup; download failure will not block the site.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap_runtime.ps1"
  if errorlevel 1 (
    echo.
    echo [ERROR] Runtime preparation failed.
    echo The downloader never waits indefinitely. See the messages above for the failed resource.
    echo You can retry this file later; already completed downloads are kept.
    pause
    exit /b 1
  )
)

echo [PIXEL STAR] Local runtime ready. Starting site...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_static.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Local static server failed to start.
  pause
  exit /b 1
)
endlocal
