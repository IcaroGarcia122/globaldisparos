# Script to test backend routes
$BaseUrl = "http://localhost:3001"
$ApiUrl = "$BaseUrl/api"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TESTANDO ROTAS DO BACKEND" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Health endpoint
Write-Host "`n[1/5] Testando /health..." -ForegroundColor Yellow
try {
    $HealthTest = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ /health - Status: $($HealthTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ /health - Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n[2/5] Fazendo login..." -ForegroundColor Yellow
try {
    $LoginBody = @{
        email = "admin@gmail.com"
        password = "vip2026"
    } | ConvertTo-Json
    
    $LoginResponse = Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method POST -Body $LoginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $LoginData = $LoginResponse.Content | ConvertFrom-Json
    $Token = $LoginData.token
    
    Write-Host "✅ Login bem-sucedido" -ForegroundColor Green
    Write-Host "   Token: $($Token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login falhou: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Setup headers
$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

# Test 3: List instances
Write-Host "`n[3/5] Listando instâncias..." -ForegroundColor Yellow
try {
    $InstancesResponse = Invoke-WebRequest -Uri "$ApiUrl/instances" -Method GET -Headers $Headers -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $InstancesData = $InstancesResponse.Content | ConvertFrom-Json
    Write-Host "✅ GET /instances - Status: $($InstancesResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   Instâncias encontradas: $($InstancesData.instances.Count)" -ForegroundColor Gray
    
    if ($InstancesData.instances.Count -gt 0) {
        $FirstInstance = $InstancesData.instances[0]
        Write-Host "   Primeira instância ID: $($FirstInstance.id)" -ForegroundColor Gray
        $InstanceId = $FirstInstance.id
    } else {
        Write-Host "⚠️  Nenhuma instância encontrada" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "❌ GET /instances falhou: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Get QR code
Write-Host "`n[4/5] Obtendo QR code da instância $InstanceId..." -ForegroundColor Yellow
try {
    $QRResponse = Invoke-WebRequest -Uri "$ApiUrl/instances/$InstanceId/qr" -Method GET -Headers $Headers -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $QRData = $QRResponse.Content | ConvertFrom-Json
    Write-Host "✅ GET /instances/$InstanceId/qr - Status: $($QRResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   Status: $($QRData.status)" -ForegroundColor Gray
    if ($QRData.qr) {
        Write-Host "   QR code presente: Sim" -ForegroundColor Gray
    } else {
        Write-Host "   QR code presente: Não (aguardando)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ GET QR code falhou: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: POST Connect
Write-Host "`n[5/5] Testando POST /instances/$InstanceId/connect..." -ForegroundColor Yellow
try {
    $ConnectResponse = Invoke-WebRequest -Uri "$ApiUrl/instances/$InstanceId/connect" -Method POST -Headers $Headers -Body "{}" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $ConnectData = $ConnectResponse.Content | ConvertFrom-Json
    Write-Host "✅ POST /instances/$InstanceId/connect - Status: $($ConnectResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   Resposta: $(ConvertTo-Json $ConnectData -Compress)" -ForegroundColor Gray
} catch {
    $ErrResp = $_.Exception.Response
    if ($ErrResp) {
        Write-Host "❌ POST /instances/$InstanceId/connect falhou: Status $($ErrResp.StatusCode)" -ForegroundColor Red
        Write-Host "   Erro detalhado:" -ForegroundColor Gray
        $reader = New-Object System.IO.StreamReader($ErrResp.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   $errorBody" -ForegroundColor Gray
    } else {
        Write-Host "❌ POST /instances/$InstanceId/connect falhou: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
