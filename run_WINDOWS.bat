@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org and run this again.
  goto :fail
)

if not exist .env (
  copy /y .env-Example .env >nul
  echo Created .env from .env-Example. Fill in the values and run this again.
  goto :fail
)

set "stamp="
for /f "usebackq delims=" %%S in (`node -p "process.platform+'-'+process.arch+'-'+require('crypto').createHash('sha1').update(require('fs').readFileSync('package-lock.json')).digest('hex')"`) do set "stamp=%%S"

set "installed="
if exist node_modules\.run-stamp set /p installed=<node_modules\.run-stamp

if not "%stamp%"=="%installed%" (
  call npm install
  if errorlevel 1 goto :fail
  >node_modules\.run-stamp echo %stamp%
)

node src\index.js
if errorlevel 1 goto :fail
exit /b 0

:fail
pause
exit /b 1
