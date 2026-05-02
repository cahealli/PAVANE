@echo off
title Pavane
cd /d "%~dp0"

echo.
echo  ==========================================
echo   PAVANE - Agentic Orchestration
echo  ==========================================
echo.

:: Load .env vars
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%B"=="" (
        set "%%A=%%B"
    )
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo Instale em: https://nodejs.org
    pause
    exit /b 1
)

:: Ensure pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo Instalando pnpm...
    call npm install -g pnpm >nul 2>&1
)

:: Install deps if needed
if not exist "node_modules\.pnpm" (
    echo Instalando dependencias ^(primeira vez, pode demorar um pouco^)...
    call pnpm install
    echo Compilando melhor-sqlite3...
    cd node_modules\.pnpm\better-sqlite3@9.6.0\node_modules\better-sqlite3
    call npx node-gyp rebuild >nul 2>&1
    cd /d "%~dp0"
    echo.
)

:: Write launcher scripts
echo cd /d "%~dp0apps\api" > "%TEMP%\pavane-api.bat"
echo set PORT=3001 >> "%TEMP%\pavane-api.bat"
echo set DEEPSEEK_API_KEY=%DEEPSEEK_API_KEY% >> "%TEMP%\pavane-api.bat"
echo npx tsx src/index.ts >> "%TEMP%\pavane-api.bat"

echo cd /d "%~dp0apps\web" > "%TEMP%\pavane-web.bat"
echo set PORT=3000 >> "%TEMP%\pavane-web.bat"
echo npx next dev -p 3000 >> "%TEMP%\pavane-web.bat"

echo [1/2] Iniciando API em http://localhost:3001 ...
start "Pavane API" /min "%TEMP%\pavane-api.bat"

timeout /t 5 /nobreak >nul

echo [2/2] Iniciando UI em http://localhost:3000 ...
start "Pavane UI" /min "%TEMP%\pavane-web.bat"

timeout /t 6 /nobreak >nul

echo.
echo  Abrindo http://localhost:3000 ...
start "" "http://localhost:3000"

echo.
echo  ==========================================
echo   Pavane esta rodando!
echo   API : http://localhost:3001
echo   UI  : http://localhost:3000
echo  ==========================================
echo.
echo  Pressione qualquer tecla para fechar este
echo  launcher (API e UI continuam rodando nas
echo  suas proprias janelas).
echo.
pause >nul
