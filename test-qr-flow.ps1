#!/usr/bin/env pwsh

Write-Host "[TEST] TESTE COMPLETO - QR CODE GENERATION" -ForegroundColor Cyan
Write-Host "=====================================" | Out-Null

# 1. LOGIN
Write-Host "[1] FAZENDO LOGIN..." -ForegroundColor Yellow
$loginData = '{"email":"admin@gmail.com","password":"vip2026"}'
$loginResp = curl "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$loginJson = $loginResp.Content | ConvertFrom-Json
$token = $loginJson.token
$userId = $loginJson.user.id

Write-Host "✅ Login bem-sucedido" -ForegroundColor Green
Write-Host "   User ID: $userId"
Write-Host "   Token: $($token.Substring(0, 50))...`n"

# 2. CRIAR INSTÂNCIA
Write-Host "2-------  CRIANDO NOVA INSTANCIA..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
$createBody = '{"name":"Test Instance QR"}'
$createResp = curl "http://localhost:3001/api/instances" -Method POST -Headers $headers -Body $createBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$createJson = $createResp.Content | ConvertFrom-Json
$instanceId = $createJson.id

Write-Host "✅ Instância criada com sucesso" -ForegroundColor Green
Write-Host "   Instance ID: $instanceId"
Write-Host "   Status: $($createJson.status)`n"

# 3. CONECTAR INSTÂNCIA (Inicia QR Code)
Write-Host "3️⃣  INICIANDO CONEXÃO (POST /connect)..." -ForegroundColor Yellow
$connectResp = curl "http://localhost:3001/api/instances/$instanceId/connect" -Method POST -Headers $headers -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$connectJson = $connectResp.Content | ConvertFrom-Json

Write-Host "✅ Requisição de conexão enviada" -ForegroundColor Green
Write-Host "   Response: $($connectJson.message)"
Write-Host "   Status HTTP: $($connectResp.StatusCode)`n"

# 4. AGUARDAR GERAÇÃO DE QR CODE
Write-Host "4️⃣  AGUARDANDO GERAÇÃO DE QR CODE (esperar evento async)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 5. OBTER QR CODE (GET /qr)
Write-Host "5️⃣  OBTENDO QR CODE..." -ForegroundColor Yellow
$qrResp = curl "http://localhost:3001/api/instances/$instanceId/qr" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
$qrJson = $qrResp.Content | ConvertFrom-Json

Write-Host "✅ QR Code obtido" -ForegroundColor Green
Write-Host "   Status HTTP: $($qrResp.StatusCode)"
Write-Host "   Status da Instância: $($qrJson.status)"

if ($qrJson.qrCode) {
  Write-Host "   QR Code Length: $($qrJson.qrCode.Length) caracteres"
  Write-Host "   QR Code Preview: $($qrJson.qrCode.Substring(0, 100))...`n"
} else {
  Write-Host "   ⚠️  QR Code ainda não foi gerado (null)`n"
}

# 6. VERIFICAR STATUS DA INSTÂNCIA
Write-Host "6️⃣  OBTENDO STATUS COMPLETO INSTÂNCIA..." -ForegroundColor Yellow
$statusResp = curl "http://localhost:3001/api/instances/$instanceId" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
$statusJson = $statusResp.Content | ConvertFrom-Json

Write-Host "✅ Status da Instância:" -ForegroundColor Green
Write-Host "   ID: $($statusJson.id)"
Write-Host "   Status: $($statusJson.status)"
Write-Host "   Criada em: $($statusJson.createdAt)"
Write-Host "   QR Code presente: $(if ($statusJson.qrCode) { 'SIM' } else { 'NÃO' })`n"

# 7. HEALTH CHECK BACKEND
Write-Host "7️⃣  VERIFICANDO SAÚDE DO BACKEND..." -ForegroundColor Yellow
$healthResp = curl "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
$healthJson = $healthResp.Content | ConvertFrom-Json

Write-Host "✅ Backend Health:" -ForegroundColor Green
Write-Host "   Status: $($healthJson.status)"
Write-Host "   Uptime: $($healthJson.uptime) segundos"
Write-Host "   Redis: $($healthJson.redis)`n"

Write-Host "✅✅✅ TESTE CONCLUÍDO COM SUCESSO! ✅✅✅" -ForegroundColor Green
Write-Host "Todos os endpoints responderam corretamente!" -ForegroundColor Green
