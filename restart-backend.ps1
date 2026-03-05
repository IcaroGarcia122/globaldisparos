#!/usr/bin/env powershell
Write-Host "🔄 Iniciando rebuild e restart..." -ForegroundColor Cyan

# 1. Kill all Node processes
Write-Host "1️⃣  Matando todos os processos Node..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    taskkill /PID $_.Id /F /T 2>$null | Out-Null
}
Get-Process -Name npm -ErrorAction SilentlyContinue | ForEach-Object {
    taskkill /PID $_.Id /F /T 2>$null | Out-Null
}

# 2. Wait for cleanup
Write-Host "⏳ Aguardando cleanup (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Navigate and build
Write-Host "2️⃣  Recompilando backend..." -ForegroundColor Yellow
Push-Location
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"

# Remove old dist
if (Test-Path dist) {
    Remove-Item -Path dist -Recurse -Force | Out-Null
}

npm run build 2>&1 | Out-Null

Write-Host "✅ Build complete!" -ForegroundColor Green

# 4. Start backend
Write-Host "3️⃣  Iniciando backend na porta 3001..." -ForegroundColor Yellow
npm start 2>&1 | Out-Null &

# 5. Wait for startup
Write-Host "⏳ Aguardando inicialização (3s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 6. Test health
Write-Host "4️⃣  Testando health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend online! Status 200" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend not responding yet" -ForegroundColor Yellow
}

Pop-Location
Write-Host "✅ DONE!" -ForegroundColor Green
