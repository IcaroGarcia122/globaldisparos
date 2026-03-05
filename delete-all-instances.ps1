# Script para deletar TODAS as instancias (ADMIN ONLY)
# Este script limpa o banco de dados deletando todas as instancias de todos os usuarios

Write-Host "Fazendo login como admin..." -ForegroundColor Cyan

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{
    email = "admin@gmail.com"
    password = "vip2026"
  })

$token = $loginResponse.token

if (-not $token) {
  Write-Host "Falha ao fazer login. Verifique as credenciais." -ForegroundColor Red
  exit 1
}

Write-Host "Login bem sucedido!" -ForegroundColor Green
Write-Host "Token obtido" -ForegroundColor Gray

Write-Host ""
Write-Host "Deletando TODAS as instancias de TODOS os usuarios..." -ForegroundColor Yellow
Write-Host "AVISO: Esta acao e IRREVERSIVEL!" -ForegroundColor Red

$confirm = Read-Host "Digite 'SIM' para confirmar"
if ($confirm -ne "SIM") {
  Write-Host "Operacao cancelada" -ForegroundColor Red
  exit 0
}

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3001/api/instances/admin/delete-all-instances" `
    -Method Delete `
    -Headers @{
      "Authorization" = "Bearer $token"
      "Content-Type" = "application/json"
    }

  Write-Host ""
  Write-Host "Operacao bem-sucedida!" -ForegroundColor Green
  Write-Host "Instancias deletadas: $($response.deletedCount)" -ForegroundColor Cyan
  Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Resposta completa:" -ForegroundColor Cyan
  Write-Host ($response | ConvertTo-Json)
}
catch {
  Write-Host "Erro ao deletar instancias:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
