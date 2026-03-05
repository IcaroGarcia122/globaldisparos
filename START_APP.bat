@echo off
REM Script para iniciar aplicação completa

echo.
echo ====================================================================
echo          GLOBAL DISPAROS - STARTUP SCRIPT
echo ====================================================================
echo.

REM 1. Limpar processos antigos
echo [1/4] Limpando processos anteriores...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.cmd 2>nul
timeout /t 3 /nobreak

REM 2. Iniciar Backend
echo [2/4] Iniciando Backend (PORT 3001)...
cd /d "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
start "Backend" node dist/server.js
timeout /t 10 /nobreak

REM 3. Iniciar Frontend  
echo [3/4] Iniciando Frontend (PORT 5173)...
cd /d "c:\Users\Icaro Garcia\Documents\globaldisparos\frontend"
start "Frontend" npm run dev
timeout /t 5 /nobreak

REM 4. Resumo
echo.
echo ====================================================================
echo  APLICACAO INICIADA COM SUCESSO!
echo.
echo  Abra seu navegador em:
echo    Frontend: http://127.0.0.1:5173
echo    Backend:  http://127.0.0.1:3001/health
echo.
echo ====================================================================
echo.
