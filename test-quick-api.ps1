# Test API quickly
Write-Host "Testing Backend API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method Options -TimeoutSec 3
    Write-Host "✅ Backend Online (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Offline" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Evolution API Authentication
Write-Host "2. Testing Evolution API Authentication..." -ForegroundColor Yellow
try {
    $headers = @{
        "x-api-key" = "myfKey123456789"
        "Content-Type" = "application/json"
    }
    $response = Invoke-WebRequest -Uri "http://localhost:8081/instance/fetchInstances" -Headers $headers -TimeoutSec 3
    Write-Host "✅ Evolution API Connected (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Evolution API Error (Status: $($_.Exception.Response.StatusCode.Value))" -ForegroundColor Yellow
    Write-Host "Message: Missing global api key (using Mock API fallback)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Testing Complete" -ForegroundColor Cyan
