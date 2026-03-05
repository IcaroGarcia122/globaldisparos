# Detailed instance check
Write-Host "Checking instance 104 details..." -ForegroundColor Cyan

# Login first
$body = @{
    email = "final-test-admin@test.com"
    password = "Admin@123456"
} | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post `
    -Headers @{"Content-Type" = "application/json"} -Body $body -TimeoutSec 5
$token = ($resp.Content | ConvertFrom-Json).token

Write-Host "Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
Write-Host ""

# Get instance 104
Write-Host "Fetching instance 104..." -ForegroundColor Yellow
$resp = Invoke-WebRequest -Uri "http://localhost:3001/api/instances/104" -Method Get `
    -Headers @{"Authorization" = "Bearer $token"} -TimeoutSec 5
$instance = $resp.Content | ConvertFrom-Json

Write-Host "Instance Details:" -ForegroundColor Green
Write-Host "- ID: $($instance.id)"
Write-Host "- Name: $($instance.name)"
Write-Host "- Status: $($instance.status)"
Write-Host "- QR Code Present: $(if ($instance.qrCode) { 'YES' } else { 'NO' })"

if ($instance.qrCode) {
    Write-Host "- QR Code Length: $($instance.qrCode.Length) characters"
    Write-Host "- QR Code Format: $(if ($instance.qrCode.StartsWith('data:')) { 'Data URL' } else { 'Other' })"
    Write-Host "- First 100 chars: $($instance.qrCode.Substring(0, [Math]::Min(100, $instance.qrCode.Length)))"
} else {
    Write-Host "- No QR Code"
}

Write-Host ""

# Also get full object
Write-Host "Full JSON Response:" -ForegroundColor Gray
$instance | ConvertTo-Json
