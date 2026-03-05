# Quick delete all instances - ADMIN ONLY
$ErrorActionPreference = 'Continue'

Write-Host "[ 1/3 ] Fazendo login como admin..." -ForegroundColor Cyan

$login = @{
  email = "admin@gmail.com"
  password = "vip2026"
}

$loginResp = $null
$attempts = 0
$maxAttempts = 3

while ($attempts -lt $maxAttempts -and -not $loginResp) {
  $attempts++
  try {
    $loginResp = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body ($login | ConvertTo-Json) `
      -TimeoutSec 10
    
    $token = $loginResp.token
    Write-Host "[ OK ] Login bem-sucedido" -ForegroundColor Green
    break
  }
  catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    
    if ($statusCode -eq 429) {
      Write-Host "[ AGUARDANDO ] Rate limit ativo. Tentativa $attempts/$maxAttempts. Aguardando 15 segundos..." -ForegroundColor Yellow
      Start-Sleep -Seconds 15
    }
    else {
      Write-Host "[ ERRO ] Falha no login (código $statusCode): $($_.Exception.Message)" -ForegroundColor Red
      exit 1
    }
  }
}

if (-not $loginResp) {
  Write-Host "[ ERRO ] Nao conseguiu fazer login apos $maxAttempts tentativas" -ForegroundColor Red
  exit 1
}

Write-Host "[ 2/3 ] Deletando TODAS as instancias..." -ForegroundColor Yellow

try {
  $headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }
  
  $deleteResp = Invoke-RestMethod -Uri "http://localhost:3001/api/instances/admin/delete-all-instances" `
    -Method Delete `
    -Headers $headers `
    -TimeoutSec 10
  
  Write-Host "[ OK ] Instancias deletadas com sucesso!" -ForegroundColor Green
}
catch {
  $statusCode = $_.Exception.Response.StatusCode.Value__
  $errorMsg = $_.Exception.Message
  
  Write-Host "[ ERRO ] Falha na delecao (codigo $statusCode)" -ForegroundColor Red
  Write-Host "Mensagem: $errorMsg" -ForegroundColor Red
  
  try {
    $errorBody = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Host "Detalhes: $($errorBody.error)" -ForegroundColor Yellow
  }
  catch { }
  
  exit 1
}

Write-Host ""
Write-Host "[ RESULTADO ]" -ForegroundColor Cyan
Write-Host "Mensagem: $($deleteResp.message)" -ForegroundColor Yellow
Write-Host "Deletadas: $($deleteResp.deletedCount) instancias" -ForegroundColor Green
Write-Host "Timestamp: $($deleteResp.timestamp)" -ForegroundColor Gray
Write-Host "[ 3/3 ] Concluido!" -ForegroundColor Green
