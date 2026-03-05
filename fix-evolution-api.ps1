# Script para corrigir erro de Evolution API
# Tenta Docker primeiro, depois oferece alternativas

$ErrorActionPreference = 'Continue'

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   CORRIGIR EVOLUTION API OFFLINE              " -ForegroundColor Cyan  
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "[1/4] Verificando Docker Desktop..." -ForegroundColor Yellow

$dockerRunning = $false
try {
  $dockerStatus = docker ps 2>&1
  if ($dockerStatus -match "CONTAINER ID") {
    Write-Host "[OK] Docker está rodando" -ForegroundColor Green
    $dockerRunning = $true
  }
}
catch {
  Write-Host "[ERRO] Docker não respondendo" -ForegroundColor Red
}

if ($dockerRunning) {
  # 2a. Iniciar Evolution API com Docker
  Write-Host ""
  Write-Host "[2/4] Iniciando Evolution API com Docker..." -ForegroundColor Yellow
  
  cd "C:\Users\Icaro Garcia\Documents\globaldisparos\evolution-api-simple"
  
  try {
    docker-compose down 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    
    $compose = docker-compose up -d 2>&1
    if ($compose -match "success" -or $? -eq $true) {
      Write-Host "[OK] Evolution API iniciada" -ForegroundColor Green
      
      Write-Host ""
      Write-Host "[3/4] Aguardando Evolution API inicializar..." -ForegroundColor Yellow
      Start-Sleep -Seconds 10
      
      # Verificar
      try {
        $test = Invoke-WebRequest -Uri "http://localhost:8081/swagger" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "[OK] Evolution API respondendo em http://localhost:8081" -ForegroundColor Green
      }
      catch {
        Write-Host "[AVISO] Evolution API pode estar em inicialização" -ForegroundColor Yellow
        Write-Host "Verifique logs com: docker logs evolution_api_simple" -ForegroundColor Gray
      }
    }
  }
  catch {
    Write-Host "[ERRO] Falha ao iniciar com Docker: $_" -ForegroundColor Red
  }
}
else {
  # 2b. Docker não disponível
  Write-Host ""
  Write-Host "[2/4] Docker não disponível - Oferecendo alternativas..." -ForegroundColor Yellow
  Write-Host ""
  
  Write-Host "OPÇÃO 1: Reiniciar Docker Desktop manualmente" -ForegroundColor Cyan
  Write-Host "  - Abra Docker Desktop"
  Write-Host "  - Aguarde inicializar completamente"
  Write-Host "  - Execute este script novamente"
  Write-Host ""
  
  Write-Host "OPÇÃO 2: Usar Mock Evolution API (para testes)" -ForegroundColor Cyan
  Write-Host "  - Sistema funcionará sem conexão real WhatsApp"
  Write-Host "  - Permite testar UI e fluxos"
  Write-Host ""
  
  Write-Host "OPÇÃO 3: Usar WSL ou VM Docker com Linux" -ForegroundColor Cyan
  Write-Host "  - Mais estável que Docker Desktop no Windows"
  Write-Host "  - Requer configuração WSL2"
  Write-Host ""
  
  exit 1
}

Write-Host ""
Write-Host "[4/4] Teste final..." -ForegroundColor Yellow

powershell -Command "
try {
  `$r = Invoke-WebRequest -Uri 'http://localhost:8081/swagger' -TimeoutSec 3 -ErrorAction Stop
  Write-Host 'Evolution API: ONLINE ✅' -ForegroundColor Green
}
catch {
  Write-Host 'Evolution API: Ainda inicializando... Aguarde 30 segundos' -ForegroundColor Yellow
  Write-Host 'Execute: docker logs evolution_api_simple' -ForegroundColor Gray
}
"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Tudo pronto! Acesse a página agora" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
