@echo off
cd /d "%~dp0"
title PIXEL STAR - Retry Real Saturn Ring
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0retry_real_ring.ps1"
echo.
echo You can close this window now.
pause
