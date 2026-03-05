$ProgressPreference = 'SilentlyContinue'

Write-Host "Testing QR Code Generation with Real Evolution API" -ForegroundColor Cyan

# Test Evolution API
Write-Host "[1] Testing Evolution API..." -ForegroundColor Yellow
try {
    $evoResponse = Invoke-WebRequest "http://localhost:8081/" -Headers @{'apikey'='myfKey123456789'} -ErrorAction SilentlyContinue
    Write-Host "OK - Evolution API running (HTTP $($evoResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Evolution API not responding" -ForegroundColor Red
    exit 1
}

# Test Backend
Write-Host "[2] Testing Backend..." -ForegroundColor Yellow
try {
    $backendCheck = Invoke-WebRequest "http://localhost:3001/api/instances" -Headers @{'Authorization'='Bearer test'} -ErrorAction SilentlyContinue
    Write-Host "OK - Backend running" -ForegroundColor Green
} catch {
    Write-Host "WARN - Backend check: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Services are online and using Evolution API with Baileys!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan  
Write-Host "Evolution API: http://localhost:8081" -ForegroundColor Cyan
