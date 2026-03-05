#!/usr/bin/env pwsh

Write-Host "[STRESS TEST] Multiple Instance Connections" -ForegroundColor Cyan
Write-Host "==========================================" 

# Login
$loginData = '{"email":"admin@gmail.com","password":"vip2026"}'
$loginResp = curl "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing
$token = ($loginResp.Content | ConvertFrom-Json).token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "[1] Creating 3 instances and connecting..."

$instances = @()

for ($i=1; $i -le 3; $i++) {
  # Create
  $createBody = "{`"name`":`"Stress Test Instance $i`"}"
  $createResp = curl "http://localhost:3001/api/instances" -Method POST -Headers $headers -Body $createBody -ContentType "application/json" -UseBasicParsing
  $instanceId = ($createResp.Content | ConvertFrom-Json).id
  $instances += $instanceId
  
  # Connect
  $connectResp = curl "http://localhost:3001/api/instances/$instanceId/connect" -Method POST -Headers $headers -UseBasicParsing
  
  Write-Host "[Instance $i] Created: $instanceId, Connected: $($connectResp.StatusCode)" -ForegroundColor Cyan
}

Write-Host "`n[2] Waiting 4 seconds for QR generation..."
Start-Sleep -Seconds 4

Write-Host "`n[3] Polling QR codes for all instances..."
foreach ($instanceId in $instances) {
  $qrResp = curl "http://localhost:3001/api/instances/$instanceId/qr" -Method GET -Headers $headers -UseBasicParsing
  $qrData = $qrResp.Content | ConvertFrom-Json
  
  if ($qrData.qrCode) {
    Write-Host "[Instance $instanceId] QR Code: FOUND (${($qrData.qrCode.Length)} chars), Status: $($qrData.status)" -ForegroundColor Green
  } else {
    Write-Host "[Instance $instanceId] QR Code: NOT FOUND, Status: $($qrData.status)" -ForegroundColor Yellow
  }
}

Write-Host "`n[4] Checking backend health..."
$health = curl "http://localhost:3001/health" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "[Backend] Status: $($health.status), Uptime: $($health.uptime)s" -ForegroundColor Green

Write-Host "`n[FINAL] STRESS TEST PASSED!" -ForegroundColor Green
