# Simple registration test with error handling
Write-Host "Testing User Registration..." -ForegroundColor Cyan
Write-Host ""

$email = "testadmin@test.com"
$password = "Test@123456"

$registerBody = @{
    email = $email
    password = $password
    name = "Test Admin"
} | ConvertTo-Json

Write-Host "Request body:" -ForegroundColor Gray
Write-Host $registerBody -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $registerBody `
        -TimeoutSec 5

    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $response.Content | ConvertFrom-Json | ConvertTo-Json

} catch {
    Write-Host "❌ Error Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:"
        Write-Host $responseBody
    } catch {
        Write-Host "Could not read response body"
    }
}

Write-Host ""
Write-Host "Now trying login with same credentials..." -ForegroundColor Cyan

$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method Post `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $loginBody `
        -TimeoutSec 5

    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $response.Content | ConvertFrom-Json | ConvertTo-Json

} catch {
    Write-Host "❌ Error Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
