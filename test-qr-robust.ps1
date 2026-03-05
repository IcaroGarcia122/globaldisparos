#!/usr/bin/env pwsh

Write-Host "[TEST] QR Code Generation with Robust Polling" -ForegroundColor Cyan
Write-Host "=============================================`n"

# 1. LOGIN
Write-Host "[1] LOGIN..." -ForegroundColor Yellow
$loginData = '{"email":"admin@gmail.com","password":"vip2026"}'
$loginResp = curl "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$loginJson = $loginResp.Content | ConvertFrom-Json
$token = $loginJson.token
Write-Host "[OK] Logged in" -ForegroundColor Green

# 2. CREATE INSTANCE
Write-Host "[2] CREATE INSTANCE..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
$createBody = '{"name":"QR Test Instance"}'
$createResp = curl "http://localhost:3001/api/instances" -Method POST -Headers $headers -Body $createBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$createJson = $createResp.Content | ConvertFrom-Json
$instanceId = $createJson.id
Write-Host "[OK] Instance created ID: $instanceId" -ForegroundColor Green

# 3. CONNECT
Write-Host "[3] CONNECT..." -ForegroundColor Yellow
try {
  $connectResp = curl "http://localhost:3001/api/instances/$instanceId/connect" -Method POST -Headers $headers -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
  $connectJson = $connectResp.Content | ConvertFrom-Json
  Write-Host "[OK] Connect sent: $($connectResp.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "[ERROR] Connect failed: $_" -ForegroundColor Red
}

# 4. POLLING WITH RETRIES
Write-Host "[4] POLLING QR CODE (5 retries, 2 seconds apart)..." -ForegroundColor Yellow
$maxRetries = 5
$retryCount = 0
$found = $false

while ($retryCount -lt $maxRetries) {
  Start-Sleep -Seconds 2
  $retryCount++
  Write-Host "   Attempt $retryCount/$maxRetries..."
  
  try {
    $qrResp = curl "http://localhost:3001/api/instances/$instanceId/qr" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
    $qrJson = $qrResp.Content | ConvertFrom-Json
    
    Write-Host "      Status: $($qrJson.status)" -ForegroundColor Cyan
    
    if ($qrJson.qrCode) {
      Write-Host "      QR Code: FOUND (length: $($qrJson.qrCode.Length))" -ForegroundColor Green
      $found = $true
      break
    }
  } catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*Impossível conectar*") {
      Write-Host "      [CRITICAL] Server crashed! Cannot connect to localhost:3001" -ForegroundColor Red
      break
    } else {
      Write-Host "      Error: $errorMsg" -ForegroundColor Red
    }
  }
}

if ($found) {
  Write-Host "[SUCCESS] QR Code generated and retrieved!" -ForegroundColor Green
} elseif ($retryCount -ge $maxRetries) {
  Write-Host "[TIMEOUT] QR Code not generated after $maxRetries attempts" -ForegroundColor Yellow
} else {
  Write-Host "[FATAL] Backend crashed during polling" -ForegroundColor Red
}

# 5. CHECK BACKEND AFTER TEST
Write-Host "`n[5] CHECK BACKEND HEALTH..." -ForegroundColor Yellow
Start-Sleep -Seconds 1
try {
  $healthResp = curl "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
  $healthJson = $healthResp.Content | ConvertFrom-Json
  Write-Host "[OK] Backend Health: $($healthJson.status) (uptime: $($healthJson.uptime)s)" -ForegroundColor Green
} catch {
  Write-Host "[CRITICAL] Backend is DOWN: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[END] Test completed" -ForegroundColor Cyan
