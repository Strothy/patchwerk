@echo off
title Patchwerk (dev)
cd /d "%~dp0"
rem A fresh Rust install can be invisible to double-clicked scripts until the next sign-in. Find it ourselves.
where cargo >nul 2>nul || set "PATH=%USERPROFILE%\.cargoin;%PATH%"
echo Starting Patchwerk... the first start after changes can take a minute.
rem The devtools config adds a local debugging port (9223) so e2e checks can look at this very instance.
call npm run tauri dev -- --config tauri.devtools.json
if errorlevel 1 (
  echo.
  echo Patchwerk did not start. The message above says why.
  pause
)
