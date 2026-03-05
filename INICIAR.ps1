#!/usr/bin/env pwsh
# ============================================
# INICIAR DISPARADOR ELITE - VERSÃO SIMPLES
# ============================================
# Uso: .\INICIAR.ps1

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DISPARADOR ELITE v1.0                     ║" -ForegroundColor Cyan
Write-Host "║  Iniciando Sistema...                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Docker
Write-Host "1️⃣  Iniciando Docker..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 15
Write-Host ""

# 2. Backend
Write-Host "2️⃣  Backend - Compilando e Iniciando..." -ForegroundColor Yellow
Start-Job -Name "backend" -ScriptBlock {
    Push-Location "backend"
    npm run build
    npm run start
    Pop-Location
} | Out-Null
Start-Sleep -Seconds 15
Write-Host ""

# 3. Frontend
Write-Host "3️⃣  Frontend - Iniciando..." -ForegroundColor Yellow
Start-Job -Name "frontend" -ScriptBlock {
    Push-Location "frontend"
    npm run dev
    Pop-Location
} | Out-Null
Start-Sleep -Seconds 10
Write-Host ""

# 4. Status
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SISTEMA INICIADO!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "📡 Backend:     http://localhost:3001" -ForegroundColor Cyan
Write-Host "🔌 Evolution:   http://localhost:8081" -ForegroundColor Cyan
Write-Host ""
Write-Host "👤 Login:       admin@gmail.com / vip2026" -ForegroundColor Yellow
Write-Host "📍 Disparador:  http://localhost:5173/disparador" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Siga: CHECKLIST_PRE_IMPLEMENTACAO.md" -ForegroundColor Green
Write-Host ""
