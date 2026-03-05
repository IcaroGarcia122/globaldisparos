$BaseUrl = "http://localhost:3001"
$ApiUrl = "$BaseUrl/api"

Write-Host "===== TESTE DE ROTAS DO BACKEND =====" -ForegroundColor Green

# Test Health
Write-Host "`nTest 1: /health..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "OK Status: $($resp.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test Login
Write-Host "`nTest 2: Login..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin@gmail.com"
        password = "vip2026"
    }
    $body = $loginData | ConvertTo-Json
    $resp = Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $data = $resp.Content | ConvertFrom-Json
    $token = $data.token
    Write-Host "OK - Login successful" -ForegroundColor Green
} catch {
    Write-Host "ERRO Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errBody = $reader.ReadToEnd()
    Write-Host "Error body: $errBody" -ForegroundColor Gray
    exit 1
}

# Test Get Instances
Write-Host "`nTest 3: GET /instances..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token" }
try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/instances" -Method GET -Headers $headers -UseBasicParsing -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    Write-Host "OK Status: $($resp.StatusCode), Count: $($data.instances.Count)" -ForegroundColor Green
    
    if ($data.instances.Count -gt 0) {
        $InstanceId = $data.instances[0].id
        Write-Host "Instance ID: $InstanceId" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: No instances found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test GET QR
Write-Host "`nTest 4: GET /instances/$InstanceId/qr..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/instances/$InstanceId/qr" -Method GET -Headers $headers -UseBasicParsing -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    Write-Host "OK Status: $($resp.StatusCode), QR Status: $($data.status)" -ForegroundColor Green
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Test POST Connect
Write-Host "`nTest 5: POST /instances/$InstanceId/connect..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/instances/$InstanceId/connect" -Method POST -Headers $headers -Body "{}" -UseBasicParsing -TimeoutSec 5
    $data = $resp.Content | ConvertFrom-Json
    Write-Host "OK Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($data | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.Value__
        Write-Host "ERRO Status: $code" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Body: $body" -ForegroundColor Gray
    } else {
        Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Green
