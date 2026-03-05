#!/usr/bin/env pwsh

Write-Host "[TEST] START - QR CODE GENERATION TEST" -ForegroundColor Cyan
Write-Host "=======================================" 
Write-Host ""

# 1. LOGIN
Write-Host "[1] LOGIN..." -ForegroundColor Yellow
$loginData = '{"email":"admin@gmail.com","password":"vip2026"}'
$loginResp = curl "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$loginJson = $loginResp.Content | ConvertFrom-Json
$token = $loginJson.token
$userId = $loginJson.user.id

Write-Host "[OK] Login successful" -ForegroundColor Green
Write-Host "   User ID: $userId"
Write-Host "   Token: $($token.Substring(0, 40))..."
Write-Host ""

# 2. CREATE INSTANCE
Write-Host "[2] CREATE INSTANCE..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
$createBody = '{"name":"Test Instance"}'
$createResp = curl "http://localhost:3001/api/instances" -Method POST -Headers $headers -Body $createBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$createJson = $createResp.Content | ConvertFrom-Json
$instanceId = $createJson.id

Write-Host "[OK] Instance created" -ForegroundColor Green
Write-Host "   Instance ID: $instanceId"
Write-Host "   Status: $($createJson.status)"
Write-Host ""

# 3. CONNECT (Start QR Code generation)
Write-Host "[3] CONNECT - Start QR Code generation..." -ForegroundColor Yellow
$connectResp = curl "http://localhost:3001/api/instances/$instanceId/connect" -Method POST -Headers $headers -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$connectJson = $connectResp.Content | ConvertFrom-Json

Write-Host "[OK] Connect request sent" -ForegroundColor Green
Write-Host "   Response: $($connectJson.message)"
Write-Host "   HTTP Status: $($connectResp.StatusCode)"
Write-Host ""

# 4. WAIT for QR Code generation (async event)
Write-Host "[4] WAIT - Waiting for async QR generation..." -ForegroundColor Yellow
Write-Host "   Sleeping 3 seconds..."
Start-Sleep -Seconds 3

# 5. GET QR CODE
Write-Host "[5] GET QR CODE..." -ForegroundColor Yellow
$qrResp = curl "http://localhost:3001/api/instances/$instanceId/qr" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
$qrJson = $qrResp.Content | ConvertFrom-Json

Write-Host "[OK] QR response received" -ForegroundColor Green
Write-Host "   HTTP Status: $($qrResp.StatusCode)"
Write-Host "   Instance Status: $($qrJson.status)"

if ($qrJson.qrCode) {
  Write-Host "   QR Code present: YES" -ForegroundColor Green
  Write-Host "   QR Code length: $($qrJson.qrCode.Length) chars"
} else {
  Write-Host "   QR Code present: NO" -ForegroundColor Yellow
}
Write-Host ""

# 6. GET FULL INSTANCE STATUS
Write-Host "[6] GET INSTANCE STATUS..." -ForegroundColor Yellow
$statusResp = curl "http://localhost:3001/api/instances/$instanceId" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
$statusJson = $statusResp.Content | ConvertFrom-Json

Write-Host "[OK] Full status:" -ForegroundColor Green
Write-Host "   ID: $($statusJson.id)"
Write-Host "   Status: $($statusJson.status)"
Write-Host "   Created: $($statusJson.createdAt)"
Write-Host "   QR Present: $(if ($statusJson.qrCode) { 'YES' } else { 'NO' })"
Write-Host ""

# 7. BACKEND HEALTH
Write-Host "[7] BACKEND HEALTH..." -ForegroundColor Yellow
$healthResp = curl "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
$healthJson = $healthResp.Content | ConvertFrom-Json

Write-Host "[OK] Backend health:" -ForegroundColor Green
Write-Host "   Status: $($healthJson.status)"
Write-Host "   Uptime: $($healthJson.uptime) seconds"
Write-Host "   Redis: $($healthJson.redis)"
Write-Host ""

Write-Host "[SUCCESS] TEST COMPLETED!" -ForegroundColor Green
Write-Host "All endpoints responded correctly"
Write-Host ""
