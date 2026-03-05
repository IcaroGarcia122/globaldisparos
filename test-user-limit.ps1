# Teste de Limite de Instãncias - Usuário Normal
# Cria instâncias até atingir o limite do plano

$ErrorActionPreference = 'Continue'
$apiUrl = "http://localhost:3001/api"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  TESTE: Limite de Instâncias - Usuário Normal  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Primeiro, criar um novo usuário "basic" (limite de 1 instância)
Write-Host "[1/3] Criando usuário teste com plano BASIC..." -ForegroundColor Yellow

$testEmail = "test-basic-$(Get-Random)@test.com"
$testPassword = "TestPassword123!"

try {
  $registerResp = Invoke-RestMethod -Uri "$apiUrl/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{
      email = $testEmail
      password = $testPassword
      name = "Test User Basic"
    } | ConvertTo-Json)
  
  Write-Host "[OK] Usuário criado: $testEmail" -ForegroundColor Green
}
catch {
  Write-Host "[ERRO] Falha ao registrar: $_" -ForegroundColor Red
  exit 1
}

# 2. Login com o novo usuário
Write-Host ""
Write-Host "[2/3] Fazendo login com usuário BASIC..." -ForegroundColor Yellow

try {
  $loginResp = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{email=$testEmail; password=$testPassword} | ConvertTo-Json)
  
  $token = $loginResp.token
  $userPlan = $loginResp.user.plan
  $headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
  
  Write-Host "[OK] Login sucesso - Plano: $userPlan" -ForegroundColor Green
}
catch {
  Write-Host "[ERRO] Login falhou: $_" -ForegroundColor Red
  exit 1
}

# 3. Tentar criar 3 instâncias (limite é 1)
Write-Host ""
Write-Host "[3/3] Tentando criar 3 instâncias (limite: 1)..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$blockedCount = 0

for ($i = 1; $i -le 3; $i++) {
  $instanceName = "Test-Basic-Instance-$i"
  
  try {
    $createResp = Invoke-RestMethod -Uri "$apiUrl/instances" `
      -Method Post `
      -Headers $headers `
      -Body (@{
        name = $instanceName
        accountAge = 30
      } | ConvertTo-Json)
    
    Write-Host "  [$i/3] Criada: $instanceName - OK" -ForegroundColor Green
    $successCount++
  }
  catch {
    $errorMsg = $_.Exception.Response.Content | ConvertFrom-Json | Select-Object -ExpandProperty error
    Write-Host "  [$i/3] Bloqueada: $instanceName" -ForegroundColor Red
    Write-Host "       Motivo: $errorMsg" -ForegroundColor Yellow
    $blockedCount++
  }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "RESULTADO DO TESTE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Plano do usuário: $userPlan" -ForegroundColor Cyan
Write-Host "Instâncias criadas: $successCount" -ForegroundColor Green
Write-Host "Instâncias bloqueadas: $blockedCount" -ForegroundColor Yellow
Write-Host ""

if ($successCount -eq 1 -and $blockedCount -eq 2) {
  Write-Host "Status: PASSOU - Limite funciona corretamente!" -ForegroundColor Green
}
else {
  Write-Host "Status: VERIFICAR - Resultado inesperado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
