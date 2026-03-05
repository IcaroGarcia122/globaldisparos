# Teste de Admin Unlimited Instances
# Cria 15 instâncias com conta admin (deve funcionar todas)

$ErrorActionPreference = 'Stop'
$adminEmail = "admin@gmail.com"
$adminPassword = "vip2026"
$apiUrl = "http://localhost:3001/api"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     TESTE: Admin Unlimited Instances          " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Login
Write-Host "[1/3] Fazendo login como admin..." -ForegroundColor Yellow

try {
  $loginResp = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{email=$adminEmail; password=$adminPassword} | ConvertTo-Json)
  
  $token = $loginResp.token
  $headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
  
  Write-Host "[OK] Login sucesso - token obtido" -ForegroundColor Green
}
catch {
  Write-Host "[ERRO] Login falhou: $_" -ForegroundColor Red
  exit 1
}

# 2. Listar instâncias atuais
Write-Host ""
Write-Host "[2/3] Listando instâncias atuais..." -ForegroundColor Yellow

try {
  $listResp = Invoke-RestMethod -Uri "$apiUrl/instances" `
    -Method Get `
    -Headers $headers
  
  $currentCount = @($listResp.data).Count
  Write-Host "[OK] Instâncias atuais: $currentCount" -ForegroundColor Green
}
catch {
  Write-Host "[ERRO] Falha ao listar: $_" -ForegroundColor Red
  exit 1
}

# 3. Criar múltiplas instâncias
Write-Host ""
Write-Host "[3/3] Criando 15 instâncias de teste..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0

for ($i = 1; $i -le 15; $i++) {
  $instanceName = "Admin-Test-Instance-$i"
  
  try {
    $createResp = Invoke-RestMethod -Uri "$apiUrl/instances" `
      -Method Post `
      -Headers $headers `
      -Body (@{
        name = $instanceName
        accountAge = 30
      } | ConvertTo-Json)
    
    Write-Host "  [$i/15] Criada: $instanceName - OK" -ForegroundColor Green
    $successCount++
  }
  catch {
    $errorMsg = $_.Exception.Response.Content | ConvertFrom-Json | Select-Object -ExpandProperty error
    Write-Host "  [$i/15] Falha em $instanceName - $errorMsg" -ForegroundColor Red
    $failCount++
  }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "RESULTADO DO TESTE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Instâncias criadas com sucesso: $successCount / 15" -ForegroundColor Green
Write-Host "Falhas: $failCount" -ForegroundColor $(if($failCount -eq 0) {'Green'} else {'Red'})
Write-Host ""

# Verificar final
try {
  $finalResp = Invoke-RestMethod -Uri "$apiUrl/instances" `
    -Method Get `
    -Headers $headers
  
  $finalCount = @($finalResp.data).Count
  Write-Host "Total de instâncias após teste: $finalCount" -ForegroundColor Cyan
  
  if ($finalCount -eq ($currentCount + $successCount)) {
    Write-Host "Status: PASSOU - Admin pode criar instâncias infinitas!" -ForegroundColor Green
  }
  else {
    Write-Host "Status: FALHA - Contagem inconsistente" -ForegroundColor Yellow
  }
}
catch {
  Write-Host "Erro ao verificar final: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
