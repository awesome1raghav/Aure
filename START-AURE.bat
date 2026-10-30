@echo off
title AURE
cd /d "%~dp0"
where node >/dev/null 2>/dev/null || (echo Node.js is not installed. Get it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install --no-fund --no-audit || (pause & exit /b 1)
)
start "" http://localhost:3000
call npm run dev
