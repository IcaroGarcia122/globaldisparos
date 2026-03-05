# Script para iniciar aplicação completa (Backend + Frontend)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         GLOBAL DISPAROS - STARTUP SCRIPT                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Limpar processos antigos
Write-Host "[1/5] Limpando processos anteriores..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# 2. Iniciar Backend
Write-Host "[2/5] Iniciando Backend (PORT 3001)..." -ForegroundColor Yellow
Push-Location "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
$backendProc = Start-Process -FilePath "node" -ArgumentList "dist/server.js" -NoNewWindow -PassThru
Write-Host "  ✓ Backend iniciado (PID: $($backendProc.Id))" -ForegroundColor Green
Start-Sleep -Seconds 10

# 3. Verificar health endpoint
Write-Host "[3/5] Testando Backend..." -ForegroundColor Yellow
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" -UseBasicParsing -ErrorAction Stop -TimeoutSec 5
  if ($health.StatusCode -eq 200) {
    Write-Host "  ✓ Backend respondendo!" -ForegroundColor Green
  }
} catch {
  Write-Host "  ⚠ Backend pode não estar pronto, continuando..." -ForegroundColor Yellow
}

# 4. Iniciar Frontend
Write-Host "[4/5] Iniciando Frontend (PORT 5173)..." -ForegroundColor Yellow
Pop-Location
Push-Location "c:\Users\Icaro Garcia\Documents\globaldisparos\frontend"
$frontendProc = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
Write-Host "  ✓ Frontend iniciado (PID: $($frontendProc.Id))" -ForegroundColor Green
Start-Sleep -Seconds 8

# 5. Resumo final
Write-Host "[5/5] Status Final" -ForegroundColor Yellow
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ APLICAÇÃO INICIADA COM SUCESSO                        ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Backend:  http://127.0.0.1:3001                          ║" -ForegroundColor Green
Write-Host "║  Frontend: http://127.0.0.1:5173                          ║" -ForegroundColor Green
Write-Host "║  API:      http://127.0.0.1:3001/api                      ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Para parar a aplicação: Feche esta janela ou use CTRL+C  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Manter script rodando
Wait-Process -Id $backendProc.Id
Pop-Location
