# Test with new user
Write-Host "Testing with new user..." -ForegroundColor Cyan
Write-Host ""

# 1. Register new user
Write-Host "1. Registering new user..." -ForegroundColor Yellow
$body = @{
    email = "user2@test.com"
    password = "User@123456"
    fullName = "User Two"
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
    email = "user2@test.com"
    password = "User@123456"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    $token = $data.token
    Write-Host "[OK] Login successful" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Login failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Create instance
Write-Host "3. Creating instance..." -ForegroundColor Yellow
$body = @{
    name = "Test-Instance-2"
    phoneNumber = "5511999999999"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" -Method Post -Headers @{"Content-Type" = "application/json"; "Authorization" = "Bearer $token"} -Body $body -TimeoutSec 10
    $data = $resp.Content | ConvertFrom-Json
    Write-Host "[OK] Instance created (ID: $($data.id))" -ForegroundColor Green
    Write-Host "Status: $($data.status)" -ForegroundColor Green
    $instanceId = $data.id
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Response.StatusCode.Value)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4. Check QR code
Write-Host "4. Checking QR code..." -ForegroundColor Yellow
Start-Sleep 2  # Wait for QR code generation

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances/$instanceId" -Method Get -Headers @{"Authorization" = "Bearer $token"} -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    
    if ($data.qrCode) {
        Write-Host "[OK] QR Code generated!" -ForegroundColor Green
        Write-Host "QR Code length: $($data.qrCode.Length) chars" -ForegroundColor Green
        Write-Host "First 80 chars: $($data.qrCode.Substring(0, 80))..." -ForegroundColor Gray
    } else {
        Write-Host "[ERROR] No QR code yet" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Failed to get instance" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
