@echo off
setlocal
cd /d "%~dp0"
title PIXEL STAR - Optional HD Textures
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download_hd_textures.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] HD texture download failed. Standard textures are unaffected.
  pause
  exit /b 1
)
echo.
echo HD texture tiers are ready.
pause
endlocal
