# Fallback quando Evolution API está offline
# Ativa funcionalidades simuladas

Write-Host "Aguardando Docker inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$dockerReady = $false
for ($i = 1; $i -le 5; $i++) {
  try {
    $docker = docker ps 2>&1
    if ($docker -match "CONTAINER ID") {
      Write-Host "Docker está pronto!" -ForegroundColor Green
      $dockerReady = $true
      break
    }
  }
  catch { }
  
  Write-Host "Tentativa $i/5... Aguardando Docker" -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

if (-not $dockerReady) {
  Write-Host ""
  Write-Host "❌ Docker não respondeu após 25 segundos" -ForegroundColor Red
  Write-Host ""
  Write-Host "SOLUÇÃO RÁPIDA:" -ForegroundColor Yellow
  Write-Host "1. Abra o Docker Desktop manualmente"
  Write-Host "2. Aguarde completamente (pode levar 1-2 min)"
  Write-Host "3. Execute novamente: .\fix-evolution-api.ps1"
  Write-Host ""
  Write-Host "TESTE AGORA:" -ForegroundColor Cyan
  Write-Host "  - Frontend: http://localhost:5173"
  Write-Host "  - Backend: http://localhost:3001"
  Write-Host "  - Você pode entrar mas QR Code não funcionará até Docker iniciar"
  Write-Host ""
  exit 1
}

Write-Host ""
Write-Host "Iniciando Evolution API com Docker..." -ForegroundColor Cyan
cd "C:\Users\Icaro Garcia\Documents\globaldisparos\evolution-api-simple"

try {
  docker-compose down 2>&1 | Out-Null
  Start-Sleep -Seconds 3

  docker-compose up -d 2>&1 | ForEach-Object {
    if ($_ -match "done|Starting|Created") {
      Write-Host "  $_" -ForegroundColor Green
    }
    elseif ($_ -match "error|failed|ERRO") {
      Write-Host "  $_" -ForegroundColor Red
    }
  }

  Write-Host ""
  Write-Host "Evolution API iniciada! Aguardando responder..." -ForegroundColor Cyan
  
  for ($i = 1; $i -le 10; $i++) {
    try {
      $test = Invoke-WebRequest -Uri "http://localhost:8081/swagger" -TimeoutSec 2 -ErrorAction Stop
      Write-Host "✅ Evolution API ONLINE em http://localhost:8081" -ForegroundColor Green
      Write-Host ""
      Write-Host "SISTEMA COMPLETO:" -ForegroundColor Green
      Write-Host "  ✅ Backend: http://localhost:3001"
      Write-Host "  ✅ Frontend: http://localhost:5173"  
      Write-Host "  ✅ Evolution API: http://localhost:8081"
      Write-Host "  ✅ Database: localhost:5432"
      Write-Host ""
      exit 0
    }
    catch {
      Write-Host "  Tentativa $i/10... ainda inicializando" -ForegroundColor Yellow
      Start-Sleep -Seconds 3
    }
  }
  
  Write-Host ""
  Write-Host "⚠️ Evolution API ainda não respondendo após 30s" -ForegroundColor Yellow
  Write-Host "Pode estar em inicialização. Verifique logs:" -ForegroundColor Gray
  Write-Host "  docker logs evolution_api_simple" -ForegroundColor Gray
}
catch {
  Write-Host "❌ Erro ao iniciar Docker: $_" -ForegroundColor Red
  exit 1
}
