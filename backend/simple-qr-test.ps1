$ErrorActionPreference = 'Stop'

try {
  Write-Output "Starting QR Code Integration Test..."
  
  # 1. Login
  Write-Output "`n📝 Step 1: Logging in..."
  $loginUrl = "http://localhost:3001/api/auth/login"
  $loginBody = '{"email":"admin@gmail.com","password":"vip2026"}'
  
  $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody -TimeoutSec 10
  $token = ($loginResponse.Content | ConvertFrom-Json).token
  
  if (-not $token) {
    Write-Output "❌ Failed to get token"
    exit 1
  }
  
  Write-Output "✅ Login successful"
  Write-Output "   Token: $($token.Substring(0, 30))..."
  
  # 2. Create Instance
  Write-Output "`n📝 Step 2: Creating WhatsApp instance..."
  $timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $instanceName = "TestQR-$timestamp"
  $instanceUrl = "http://localhost:3001/api/instances"
  $instanceBody = @{
    name = $instanceName
  } | ConvertTo-Json
  
  $instanceResponse = Invoke-WebRequest -Uri $instanceUrl -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $instanceBody -TimeoutSec 10
  $instanceData = $instanceResponse.Content | ConvertFrom-Json
  $instanceId = $instanceData.id
  
  Write-Output "✅ Instance created"
  Write-Output "   Instance ID: $instanceId"
  Write-Output "   Name: $instanceName"
  
  # 3. Wait for QR generation
  Write-Output "`n⏳ Step 3: Waiting 20 seconds for QR code generation..."
  for ($i = 20; $i -gt 0; $i--) {
    Write-Output "   $i seconds remaining..."
    Start-Sleep -Seconds 1
  }
  
  # 4. Get QR Code
  Write-Output "`n📝 Step 4: Fetching QR code..."
  $qrUrl = "http://localhost:3001/api/instances/$instanceId/qr"
  $qrResponse = Invoke-WebRequest -Uri $qrUrl -Method GET -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
  $qrData = $qrResponse.Content | ConvertFrom-Json
  
  Write-Output "`n✅ QR Code Response Received:"
  Write-Output "   Status: $($qrData.status)"
  Write-Output "   Message: $($qrData.message)"
  
  if ($qrData.qrCode) {
    Write-Output "   Has QR Code: Yes"
    Write-Output "   QR Code Size: $($qrData.qrCode.Length) bytes"
    Write-Output "   QR Code Type: $(if ($qrData.qrCode.StartsWith('data:')) { 'Data URL (Base64)' } else { 'Unknown' })"
  } else {
    Write-Output "   Has QR Code: No"
  }
  
  Write-Output "`n🎉 Test completed successfully!"
  
} catch {
  Write-Output "`n❌ Error occurred:"
  Write-Output "   $($_.Exception.Message)"
  exit 1
}
