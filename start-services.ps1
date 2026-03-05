# Startup script for both backend and frontend services

Write-Host "🔄 Limpando processos Node antigos..." -ForegroundColor Yellow

# Kill any existing node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 3

Write-Host "✅ Processos limpós" -ForegroundColor Green
Write-Host ""

#==================== BACKEND ====================
Write-Host "🚀 Iniciando BACKEND..." -ForegroundColor Cyan

cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"

# Build
npm run build | Out-Null

# Start in background
npm start 2>&1 | Out-Null &

Write-Host "⏳ Aguardando backend iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verify backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ BACKEND ONLINE (porta 3001, status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ BACKEND OFFLINE (tentar novamente em alguns segundos)" -ForegroundColor Red
}

Write-Host ""

#==================== FRONTEND ====================
Write-Host "🚀 Iniciando FRONTEND..." -ForegroundColor Cyan

cd "c:\Users\Icaro Garcia\Documents\globaldisparos\frontend"

# Start in background  
npm run dev 2>&1 | Out-Null &

Write-Host "⏳ Aguardando frontend iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

# Verify frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ FRONTEND ONLINE (porta 8080, status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ FRONTEND OFFLINE - verificar npm run dev" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Magenta
