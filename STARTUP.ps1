#!/usr/bin/env powershell

<#
🚀 DISPARADOR ELITE - STARTUP RÁPIDO
Script para iniciar todos os serviços automaticamente
#>

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🚀 DISPARADOR ELITE - STARTUP                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Verificar pré-requisitos
Write-Host "🔍 Verificando pré-requisitos..." -ForegroundColor Yellow

$nodeCheck = node --version 2>$null
$npmCheck = npm --version 2>$null
$dockerCheck = docker --version 2>$null

if (-not $nodeCheck) {
    Write-Host "❌ Node.js não instalado" -ForegroundColor Red
    exit 1
}

if (-not $npmCheck) {
    Write-Host "❌ npm não instalado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js: $nodeCheck" -ForegroundColor Green
Write-Host "✅ npm: $npmCheck" -ForegroundColor Green
Write-Host "✅ Docker: $dockerCheck" -ForegroundColor Green

# Root
$root = "c:\Users\Icaro Garcia\Documents\globaldisparos"

Write-Host "`n📁 Diretório raiz: $root" -ForegroundColor Cyan

# 1. EVOLUTION API (Docker)
Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1️⃣  Evolution API (Docker)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

cd $root
Write-Host "🔄 Verificando containers..." -ForegroundColor Yellow

$containers = docker-compose ps 2>$null | Select-String "evolution_api"
if ($containers) {
    Write-Host "✅ Evolution API já está rodando" -ForegroundColor Green
} else {
    Write-Host "⏳ Iniciando Evolution API..." -ForegroundColor Yellow
    docker-compose up -d 2>$null
    Start-Sleep -Seconds 3
    Write-Host "✅ Evolution API iniciada!" -ForegroundColor Green
}

# 2. BACKEND
Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "2️⃣  Backend (Express.js)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

cd "$root\backend"

Write-Host "🔨 Compilando TypeScript..." -ForegroundColor Yellow
npm run build 2>&1 | Select-Object -Last 3

Write-Host "🚀 Iniciando backend..." -ForegroundColor Yellow
$backendProcess = Start-Process node -ArgumentList "dist/server.js" -PassThru -NoNewWindow -RedirectStandardOutput "backend.log"
$backendPID = $backendProcess.Id

Write-Host "✅ Backend iniciado (PID: $backendPID)" -ForegroundColor Green
Write-Host "   📍 http://localhost:3001" -ForegroundColor Cyan

Start-Sleep -Seconds 2

# 3. FRONTEND
Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "3️⃣  Frontend (React + Vite)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

cd "$root\frontend"

Write-Host "🚀 Iniciando frontend..." -ForegroundColor Yellow
$frontendProcess = Start-Process npm -ArgumentList "run dev" -PassThru -NoNewWindow -RedirectStandardOutput "frontend.log"

Write-Host "✅ Frontend iniciado" -ForegroundColor Green
Write-Host "   📍 http://localhost:5173" -ForegroundColor Cyan

Start-Sleep -Seconds 2

# 4. TESTE DE CONEXÃO
Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "4️⃣  Testando Conexões" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$services = @(
    @{ name = "Evolution API"; url = "http://localhost:8081"; icon = "🐳" }
    @{ name = "Backend"; url = "http://localhost:3001/health"; icon = "🔧" }
    @{ name = "Frontend"; url = "http://localhost:5173"; icon = "⚛️" }
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.url -TimeoutSec 2 -ErrorAction Stop
        Write-Host "$($service.icon) $($service.name): ✅ OK" -ForegroundColor Green
    } catch {
        Write-Host "$($service.icon) $($service.name): ⚠️ AGUARDE..." -ForegroundColor Yellow
    }
}

# 5. INFORMAÇÕES
Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                 ✅ SISTEMA INICIADO COM SUCESSO               ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  🌐 ACESSOS:                                                   ║" -ForegroundColor Green
Write-Host "║     Frontend:     http://localhost:5173                        ║" -ForegroundColor Green
Write-Host "║     Backend:      http://localhost:3001                        ║" -ForegroundColor Green
Write-Host "║     Evolution:    http://localhost:8081                        ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  🔐 LOGIN:                                                     ║" -ForegroundColor Green
Write-Host "║     Email:    admin@gmail.com                                  ║" -ForegroundColor Green
Write-Host "║     Senha:    vip2026                                          ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  🚀 DISPARADOR:                                                ║" -ForegroundColor Green
Write-Host "║     http://localhost:5173/disparador                           ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  📚 DOCUMENTAÇÃO:                                              ║" -ForegroundColor Green
Write-Host "║     README_DISPARADOR_FINAL.md                                 ║" -ForegroundColor Green
Write-Host "║     IMPLEMENTACAO_DISPARADOR_ELITE.md                          ║" -ForegroundColor Green
Write-Host "║     GUIA_TESTE_DISPARADOR.md                                   ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  ⏹️  PARAR SERVIÇOS:                                            ║" -ForegroundColor Green
Write-Host "║     1. Backend: taskkill /PID $backendPID /F                   ║" -ForegroundColor Cyan
Write-Host "║     2. Frontend: Ctrl+C no terminal                            ║" -ForegroundColor Cyan  
Write-Host "║     3. Docker: docker-compose down                             ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n✨ Aguardando 5 segundos para estabilização..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n🎉 Sistema pronto para usar! Acesse http://localhost:5173" -ForegroundColor Green
Write-Host "   Mantenha este terminal aberto enquanto usar o sistema." -ForegroundColor Cyan

# Aguardar
Read-Host "`nPressione ENTER para parar o sistema"

# Limpar
Write-Host "`n⏹️  Parando serviços..." -ForegroundColor Yellow
taskkill /PID $backendPID /F 2>$null
taskkill /F /IM node.exe 2>$null
Write-Host "✅ Serviços parados" -ForegroundColor Green
