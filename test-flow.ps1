# Register and test basic workflow
Write-Host "Testing Authentication..." -ForegroundColor Cyan
Write-Host ""

# 1. Register
Write-Host "1. Registering user..." -ForegroundColor Yellow
$body = @{
    email = "admin@test.com"
    password = "Admin@123456"
    fullName = "Admin"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
    Write-Host "[OK] User registered" -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.Value
    if ($code -eq 409) {
        Write-Host "[OK] User already exists" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $code" -ForegroundColor Red
    }
}

Write-Host ""

# 2. Login
Write-Host "2. Logging in..." -ForegroundColor Yellow
$body = @{
    email = "admin@test.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    $token = $data.token
    Write-Host "[OK] Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 15))..." -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Login failed: $($_.Exception.Response.StatusCode.Value)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Create instance
Write-Host "3. Creating instance..." -ForegroundColor Yellow
$body = @{
    name = "Test-Instance"
    phoneNumber = "5511999999999"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" -Method Post -Headers @{"Content-Type" = "application/json"; "Authorization" = "Bearer $token"} -Body $body -TimeoutSec 10
    $data = $resp.Content | ConvertFrom-Json
    Write-Host "[OK] Instance created (ID: $($data.id))" -ForegroundColor Green
    Write-Host "Status: $($data.status)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Response.StatusCode.Value)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
