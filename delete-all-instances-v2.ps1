# Delete all instances - IMPROVED
# Stores token to avoid multiple login attempts
# This avoids the 429 rate limit error

$ErrorActionPreference = 'Continue'
$tokenFile = "$env:TEMP\admin-token-cache.txt"
$apiUrl = "http://localhost:3001/api"

function Get-AdminToken {
  param([int]$retries = 0)
  
  # Check if we have a cached token
  if (Test-Path $tokenFile) {
    $cached = Get-Content $tokenFile | ConvertFrom-Json
    if ($cached.expiry -gt [DateTime]::Now.ToUniversalTime().Ticks) {
      Write-Host "[ OK ] Usando token em cache" -ForegroundColor Green
      return $cached.token
    }
    else {
      Remove-Item $tokenFile -Force
    }
  }
  
  Write-Host "[ LOGIN ] Fazendo login como admin..." -ForegroundColor Yellow
  
  try {
    $loginResp = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body (ConvertTo-Json @{email="admin@gmail.com"; password="vip2026"}) `
      -TimeoutSec 10
    
    # Cache the token (expires in 24 hours)
    @{
      token = $loginResp.token
      expiry = ([DateTime]::Now.AddHours(24)).ToUniversalTime().Ticks
    } | ConvertTo-Json | Out-File -FilePath $tokenFile -Force
    
    Write-Host "[ OK ] Login bem-sucedido" -ForegroundColor Green
    return $loginResp.token
  }
  catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__ 2>$null
    
    if ($statusCode -eq 429 -and $retries -lt 2) {
      Write-Host "[ AGUARDANDO ] Rate limit. Tentando novamente em 30 segundos..." -ForegroundColor Yellow
      Start-Sleep -Seconds 30
      return Get-AdminToken -retries ($retries + 1)
    }
    
    Write-Host "[ ERRO ] Falha no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

function Delete-AllInstances {
  param([string]$token)
  
  Write-Host "[ DELETAR ] Deletando TODAS as instancias..." -ForegroundColor Yellow
  
  try {
    $headers = @{
      "Authorization" = "Bearer $token"
      "Content-Type" = "application/json"
    }
    
    $deleteResp = Invoke-RestMethod -Uri "$apiUrl/instances/admin/delete-all-instances" `
      -Method Delete `
      -Headers $headers `
      -TimeoutSec 10
    
    Write-Host "[ OK ] Delecao bem-sucedida!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[ RESULTADO ]" -ForegroundColor Cyan
    Write-Host "Operacao: $($deleteResp.message)" -ForegroundColor Green
    Write-Host "Instancias deletadas: $($deleteResp.deletedCount)" -ForegroundColor Yellow
    Write-Host "Timestamp: $($deleteResp.timestamp)" -ForegroundColor Gray
    Write-Host "[ CONCLUIDO ]" -ForegroundColor Green
  }
  catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__ 2>$null
    $errorMsg = $_.Exception.Message
    
    Write-Host "[ ERRO ] Falha na delecao (codigo $statusCode)" -ForegroundColor Red
    Write-Host "Mensagem: $errorMsg" -ForegroundColor Red
    
    try {
      $errorBody = $_.Exception.Response.Content | ConvertFrom-Json 2>$null
      if ($errorBody.error) {
        Write-Host "Detalhes: $($errorBody.error)" -ForegroundColor Yellow
      }
    }
    catch { }
    
    exit 1
  }
}

# Main
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DELETE ALL INSTANCES - ADMIN ONLY          " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$token = Get-AdminToken
Delete-AllInstances -token $token
