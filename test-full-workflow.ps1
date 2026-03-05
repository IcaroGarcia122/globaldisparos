# Register and test instance creation
Write-Host "=== Testing Complete Workflow ===" -ForegroundColor Cyan
Write-Host ""

# 1. Register admin user
Write-Host "Step 1: Registering admin user..." -ForegroundColor Yellow
$registerBody = @{
    email = "admin@globaldisparos.com"
    password = "Admin@123456"
    fullName = "Global Admin"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $registerBody `
        -TimeoutSec 5
    
    $userData = $response.Content | ConvertFrom-Json
    Write-Host "✅ Admin user registered" -ForegroundColor Green
    Write-Host "User ID: $($userData.userId)" -ForegroundColor Green
    $userId = $userData.userId
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value
    if ($statusCode -eq 409) {
        Write-Host "ℹ️ User already exists (409)" -ForegroundColor Yellow
        $userId = "existing"
    } else {
        Write-Host "❌ Error: $statusCode" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 2. Login
Write-Host "Step 2: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@globaldisparos.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $loginBody `
        -TimeoutSec 5
    
    $loginData = $response.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Create instance
Write-Host "Step 3: Creating WhatsApp instance..." -ForegroundColor Yellow
$instanceBody = @{
    name = "Test-Instance"
    phoneNumber = "5511999999999"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        } `
        -Body $instanceBody `
        -TimeoutSec 10
    
    $instanceData = $response.Content | ConvertFrom-Json
    Write-Host "✅ Instance created" -ForegroundColor Green
    Write-Host "Instance ID: $($instanceData.id)" -ForegroundColor Green
    Write-Host "Status: $($instanceData.status)" -ForegroundColor Green
    
    if ($instanceData.qrCode) {
        Write-Host "✅ QR Code available" -ForegroundColor Green
    } else {
        Write-Host "⏳ QR Code pending" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Instance creation failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error: $errorBody" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
