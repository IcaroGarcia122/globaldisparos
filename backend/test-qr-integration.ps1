# Test QR Code generation with enhanced logging validation

# 1. Login
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"admin@gmail.com","password":"vip2026"}' `
  -TimeoutSec 5

$token = ($loginResponse.Content | ConvertFrom-Json).token
Write-Output "✅ Login: Token=$($token.Substring(0, 20))..."

# 2. Create instance  
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$createResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{`"name`":`"Test-Instance-$timestamp`"}" `
  -TimeoutSec 5

$instance = $createResponse.Content | ConvertFrom-Json
$instanceId = $instance.id
Write-Output "✅ Instance Created: ID=$instanceId"

# 3. Wait for QR generation
Write-Output "`n⏳ Waiting 15 seconds for QR generation..."
Start-Sleep -Seconds 15

# 4. Get QR
$qrResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/instances/$instanceId/qr" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -TimeoutSec 5

$qrData = $qrResponse.Content | ConvertFrom-Json

Write-Output "`n✅ QR ENDPOINT RESPONSE:"
Write-Output "   Status: $($qrData.status)"
Write-Output "   Message: $($qrData.message)"
Write-Output "   Has QR Code: $(!([string]::IsNullOrEmpty($qrData.qrCode)))"
if ($qrData.qrCode) {
  Write-Output "   QR Code Length: $($qrData.qrCode.Length) bytes"
  Write-Output "   QR Code Starts With: $($qrData.qrCode.Substring(0, 30))..."
}
