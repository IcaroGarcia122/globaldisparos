# Final comprehensive test
Write-Host "=== FINAL COMPREHENSIVE TEST ===" -ForegroundColor Cyan
Write-Host "" 

# Step 1: Verify Backend Online
Write-Host "1. Checking Backend..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method Options -TimeoutSec 3 | Out-Null
    Write-Host "[PASS] Backend is online" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend is offline" -ForegroundColor Red
    exit 1
}

# Step 2: Verify Frontend Online  
Write-Host "2. Checking Frontend..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:5173/" -TimeoutSec 3 | Out-Null
    Write-Host "[PASS] Frontend is online" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Frontend is offline" -ForegroundColor Red
}

# Step 3: Test Evolution API
Write-Host "3. Testing Evolution API..." -ForegroundColor Yellow
try {
    $headers = @{"x-api-key" = "myfKey123456789"}
    $resp = Invoke-WebRequest -Uri "http://localhost:8081/instance/fetchInstances" -Headers $headers -TimeoutSec 3
    Write-Host "[FAIL] Should get 403, not success" -ForegroundColor Yellow
} catch {
    $code = $_.Exception.Response.StatusCode.Value
    if ($code -eq 403) {
        Write-Host "[EXPECTED] Evolution API returns 403" -ForegroundColor Yellow
        Write-Host "Message: Missing global api key (fallback to Mock API)" -ForegroundColor Gray
    } else {
        Write-Host "[INFO] Evolution API status: $code" -ForegroundColor Gray
    }
}

# Step 4: Register admin user for testing
Write-Host ""
Write-Host "4. Registering test admin..." -ForegroundColor Yellow
$body = @{
    email = "final-test-admin@test.com"
    password = "Admin@123456"
    fullName = "Test Admin"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method Post `
        -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
    Write-Host "[PASS] User registered" -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.Value
    if ($code -eq 409) {
        Write-Host "[INFO] User already exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Registration error: $code" -ForegroundColor Red
    }
}

# Step 5: Login
Write-Host ""
Write-Host "5. Testing authentication..." -ForegroundColor Yellow
$body = @{
    email = "final-test-admin@test.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post `
        -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    $token = $data.token  
    Write-Host "[PASS] Login successful" -ForegroundColor Green
    Write-Host "Token received: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Login failed" -ForegroundColor Red
    exit 1
}

# Step 6: Create instance
Write-Host ""
Write-Host "6. Creating WhatsApp instance..." -ForegroundColor Yellow
$body = @{
    name = "FinalTest-Instance"
    phoneNumber = "5511999999999"
} | ConvertTo-Json

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" -Method Post `
        -Headers @{"Content-Type" = "application/json"; "Authorization" = "Bearer $token"} `
        -Body $body -TimeoutSec 10
    $instance = $resp.Content | ConvertFrom-Json
    Write-Host "[PASS] Instance created (ID: $($instance.id))" -ForegroundColor Green
    $instanceId = $instance.id
} catch {
    Write-Host "[FAIL] Instance creation failed: $($_.Exception.Response.StatusCode.Value)" -ForegroundColor Red
    exit 1
}

# Step 7: Check QR Code  
Write-Host ""
Write-Host "7. Checking QR code generation..." -ForegroundColor Yellow
Start-Sleep 3  # Wait for async processing

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances/$instanceId" -Method Get `
        -Headers @{"Authorization" = "Bearer $token"} -TimeoutSec 5
    $instance = $resp.Content | ConvertFrom-Json
    
    if ($instance.qrCode) {
        Write-Host "[PASS] QR Code generated!" -ForegroundColor Green
        $qrLength = $instance.qrCode.Length
        Write-Host "QR Code: $qrLength characters (data URL format)" -ForegroundColor Green
        Write-Host "Status: $($instance.status)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] QR Code not generated yet" -ForegroundColor Yellow
        Write-Host "Status: $($instance.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Unable to get instance details" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
