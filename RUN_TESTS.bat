@echo off
REM Script para rodar testes do projeto

setlocal enabledelayedexpansion

echo.
echo ====================================================================
echo          GLOBAL DISPAROS - SUITE DE TESTES
echo ====================================================================
echo.

cd /d "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"

echo [1/3] Verificando dependencias...
if not exist node_modules (
  echo Instalando dependencias...
  call npm install --legacy-peer-deps
)

echo [2/3] Compilando TypeScript...
call npm run build
if errorlevel 1 (
  echo Build falhou! Verifique erros acima.
  exit /b 1
)

echo.
echo [3/3] Rodando testes com Vitest...
echo.

call npm test

echo.
echo ====================================================================
echo TESTES CONCLUIDOS
echo ====================================================================
echo.
pause
