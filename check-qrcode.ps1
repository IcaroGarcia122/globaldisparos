# Check instance details
Write-Host "Checking instance QR code..." -ForegroundColor Cyan

# Login
$body = @{email='admin@test.com'; password='Admin@123456'} | ConvertTo-Json
$resp = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method Post -Headers @{'Content-Type'='application/json'} -Body $body -TimeoutSec 5
$token = ($resp.Content | ConvertFrom-Json).token

# Get instance 
$resp = Invoke-WebRequest -Uri 'http://localhost:3001/api/instances/103' -Method Get -Headers @{'Authorization'="Bearer $token"} -TimeoutSec 5
$instance = $resp.Content | ConvertFrom-Json

Write-Host "ID: $($instance.id)" -ForegroundColor Green
Write-Host "Status: $($instance.status)" -ForegroundColor Green
Write-Host "QR Code Present: $(if ($instance.qrCode) { 'YES' } else { 'NO' })" -ForegroundColor Green

if ($instance.qrCode) {
    Write-Host "QR Code Length: $($instance.qrCode.Length)" -ForegroundColor Green
    Write-Host "First 100 chars: $($instance.qrCode.Substring(0, [Math]::Min(100, $instance.qrCode.Length)))" -ForegroundColor Gray
}
