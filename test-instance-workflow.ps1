# Complete test of instance creation workflow
Write-Host "=== Testing Instance Creation Workflow ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register a test user
Write-Host "Step 1: Creating test user..." -ForegroundColor Yellow
$registerBody = @{
    email = "testuser-$(Get-Random)@test.com"
    password = "Test@12345"
    name = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $registerBody -TimeoutSec 5
    $userData = $response.Content | ConvertFrom-Json
    Write-Host "✅ User created successfully" -ForegroundColor Green
    Write-Host "User ID: $($userData.userId)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ User registration response: $($_.Exception.Response.StatusCode.Value)" -ForegroundColor Yellow
    # Continue anyway - user might already exist
}

Write-Host ""

# Step 2: Login
Write-Host "Step 2: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "testuser@test.com"
    password = "Test@12345"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $loginBody -TimeoutSec 5
    $loginData = $response.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Login error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 3: Create an instance
Write-Host "Step 3: Creating WhatsApp instance..." -ForegroundColor Yellow
$instanceBody = @{
    name = "Test-Instance-$(Get-Random)"
    phoneNumber = "5511999999999"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        } `
        -Body $instanceBody `
        -TimeoutSec 10

    $instanceData = $response.Content | ConvertFrom-Json
    Write-Host "✅ Instance created successfully" -ForegroundColor Green
    Write-Host "Instance ID: $($instanceData.id)" -ForegroundColor Green
    Write-Host "Status: $($instanceData.status)" -ForegroundColor Green
    
    if ($instanceData.qrCode) {
        Write-Host "QR Code: Available" -ForegroundColor Green
    } else {
        Write-Host "QR Code: Pending generation" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Instance creation failed: $($_.Exception.Message)" -ForegroundColor Red
    $errorBody = $_.Exception.Response.Content.ReadAsStream() | Out-String
    Write-Host "Error details: $errorBody" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
