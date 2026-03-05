# teste-rotas.ps1 - Script para testar rotas do backend

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧪 TESTE DE ROTAS E CONECTIVIDADE                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "http://localhost:3001"
$API_URL = "$BACKEND_URL/api"

# Testar 1: Backend rodando
Write-Host "1️⃣  Verificando se backend está rodando..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend respondendo em $BACKEND_URL" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend NÃO está rodando em $BACKEND_URL" -ForegroundColor Red
    Write-Host "Inicie com: cd backend && npm run dev" -ForegroundColor Yellow
    exit 1
}

# Testar 2: Login
Write-Host ""
Write-Host "2️⃣  Fazendo login..." -ForegroundColor Cyan
try {
    $loginBody = @{
        email = "admin@gmail.com"
        password = "vip2026"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "$API_URL/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    
    Write-Host "✅ Login bem-sucedido" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Yellow
} catch {
    Write-Host "❌ Erro ao fazer login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Testar 3: Listar instâncias
Write-Host ""
Write-Host "3️⃣  Listando instâncias..." -ForegroundColor Cyan
try {
    $listResponse = Invoke-WebRequest -Uri "$API_URL/instances" `
        -Headers @{ Authorization = "Bearer $token" } `
        -ErrorAction Stop
    
    $instances = $listResponse.Content | ConvertFrom-Json
    Write-Host "✅ Resposta recebida" -ForegroundColor Green
    Write-Host "   Quantas instâncias: $($instances.Count)" -ForegroundColor Yellow
    
    if ($instances.Count -gt 0) {
        $instanceId = $instances[0].id
        Write-Host "   Primeira instância ID: $instanceId" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  Nenhuma instância encontrada, criando..." -ForegroundColor Yellow
        
        $createBody = @{
            name = "test_$(Get-Random)"
            accountAge = 30
        } | ConvertTo-Json
        
        $createResponse = Invoke-WebRequest -Uri "$API_URL/instances" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $token" } `
            -ContentType "application/json" `
            -Body $createBody `
            -ErrorAction Stop
        
        $newInstance = $createResponse.Content | ConvertFrom-Json
        $instanceId = $newInstance.id
        Write-Host "   ✅ Instância criada com ID: $instanceId" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro ao listar instâncias: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Testar 4: GET /instances/:id/qr
Write-Host ""
Write-Host "4️⃣  Testando GET /instances/$instanceId/qr..." -ForegroundColor Cyan
try {
    $qrResponse = Invoke-WebRequest -Uri "$API_URL/instances/$instanceId/qr" `
        -Headers @{ Authorization = "Bearer $token" } `
        -ErrorAction Stop
    
    $qrData = $qrResponse.Content | ConvertFrom-Json
    Write-Host "✅ Resposta recebida" -ForegroundColor Green
    Write-Host "   Status: $($qrData.status)" -ForegroundColor Yellow
    Write-Host "   Tem QR code: $(if ($qrData.qrCode) { 'SIM' } else { 'NÃO' })" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Erro ao buscar QR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Testar 5: POST /instances/:id/connect
Write-Host ""
Write-Host "5️⃣  Testando POST /instances/$instanceId/connect..." -ForegroundColor Cyan
try {
    $connectResponse = Invoke-WebRequest -Uri "$API_URL/instances/$instanceId/connect" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType "application/json" `
        -Body "{}" `
        -ErrorAction Stop
    
    $connectData = $connectResponse.Content | ConvertFrom-Json
    Write-Host "✅ POST /connect funcionando!" -ForegroundColor Green
    Write-Host "   Resposta: $($connectData.message)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Erro na rota /connect" -ForegroundColor Red
    Write-Host "   HTTP Status: $statusCode" -ForegroundColor Yellow
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($statusCode -eq 404) {
        Write-Host "   ⚠️  ERRO 404: Instância ou rota não encontrada!" -ForegroundColor Red
        Write-Host "   - Instance ID testado: $instanceId" -ForegroundColor Yellow
        Write-Host "   - URL tentada: $API_URL/instances/$instanceId/connect" -ForegroundColor Yellow
        Write-Host "   - Solução: Verifique se instância existe e se backend está compilado" -ForegroundColor Yellow
    } elseif ($statusCode -eq 403) {
        Write-Host "   ⚠️  ERRO 403: Acesso negado (problema de autenticação)" -ForegroundColor Red
    } elseif ($statusCode -eq 500) {
        Write-Host "   ⚠️  ERRO 500: Erro interno do servidor" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Teste concluído!                                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
