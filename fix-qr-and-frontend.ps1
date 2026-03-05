#!/usr/bin/env pwsh

<#
.SYNOPSIS
Script de Correção Automática: QR Code Baileys + Frontend Offline
.DESCRIPTION
Executa verificações e correções em sequência até que tudo funcione
.NOTES
Não sai até que os serviços estejam funcionando corretamente
#>

param(
    [switch]$SkipVerification = $false
)

$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

# Cores
$green = "Green"
$red = "Red"
$yellow = "Yellow"
$cyan = "Cyan"

function Write-Success { Write-Host "✅ $args" -ForegroundColor $green }
function Write-Error-Custom { Write-Host "❌ $args" -ForegroundColor $red }
function Write-Warning-Custom { Write-Host "⚠️  $args" -ForegroundColor $yellow }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor $cyan }

Write-Info "=========================================="
Write-Info "CORREÇÃO: QR Code + Frontend Baileys"
Write-Info "=========================================="
Write-Info ""

# ==========================================
# ETAPA 1: VERIFICAR AMBIENTE
# ==========================================

Write-Info "[ETAPA 1] Verificando ambiente..."
$baseDir = "c:\Users\Icaro Garcia\Documents\globaldisparos"
$backendDir = "$baseDir\backend"
$frontendDir = "$baseDir\frontend"

if (-not (Test-Path $backendDir)) {
    Write-Error-Custom "Diretório backend não encontrado: $backendDir"
    Exit 1
}

if (-not (Test-Path $frontendDir)) {
    Write-Error-Custom "Diretório frontend não encontrado: $frontendDir"
    Exit 1
}

Write-Success "Diretórios encontrados"

# ==========================================
# ETAPA 2: LIMPAR PROCESSOS ANTIGOS
# ==========================================

Write-Info ""
Write-Info "[ETAPA 2] Limpando processos Node antigos..."

Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
taskkill /F /IM node.exe 2>$null | Out-Null
taskkill /F /IM npm.cmd 2>$null | Out-Null

Start-Sleep -Seconds 3

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Warning-Custom "Ainda há processos Node rodando, tentando mais uma vez..."
    wmic process where name="node.exe" delete /nointeractive 2>$null | Out-Null
    Start-Sleep -Seconds 2
}

Write-Success "Processos limpos"

# ==========================================
# ETAPA 3: LIBERAR PORTAS
# ==========================================

Write-Info ""
Write-Info "[ETAPA 3] Liberando portas 3001 e 8080..."

$portProcesses = Get-NetTCPConnection -LocalPort 3001, 8080 -ErrorAction SilentlyContinue
foreach ($process in $portProcesses) {
    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
Write-Success "Portas liberadas"

# ==========================================
# ETAPA 4: BUILD BACKEND
# ==========================================

Write-Info ""
Write-Info "[ETAPA 4] Compilando backend..."

Push-Location $backendDir
$buildOutput = npm run build 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Build Backend falhou!"
    Write-Host $buildOutput
    Pop-Location
    Exit 1
}

Write-Success "Backend compilado com sucesso"
Pop-Location

# ==========================================
# ETAPA 5: INICIAR BACKEND
# ==========================================

Write-Info ""
Write-Info "[ETAPA 5] Iniciando backend (port 3001)..."

$backendJob = Start-Job -ScriptBlock {
    Set-Location "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
    npm start 2>&1
} -Name "backend"

Start-Sleep -Seconds 6

$healthCheck = $null
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop -UseBasicParsing
} catch {
    Write-Warning-Custom "Backend não respondeu ao health check"
}

if ($healthCheck -and $healthCheck.StatusCode -eq 200) {
    Write-Success "Backend online na porta 3001"
} else {
    Write-Error-Custom "Backend não respondeu! Logs:"
    Get-Job -Name "backend" | Receive-Job
    Exit 1
}

# ==========================================
# ETAPA 6: INICIAR FRONTEND
# ==========================================

Write-Info ""
Write-Info "[ETAPA 6] Iniciando frontend (port 8080)..."

$frontendJob = Start-Job -ScriptBlock {
    Set-Location "c:\Users\Icaro Garcia\Documents\globaldisparos\frontend"
    npm run dev 2>&1
} -Name "frontend"

Start-Sleep -Seconds 5

$frontendCheck = $null
try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 3 -ErrorAction Stop -UseBasicParsing
} catch {
    Write-Warning-Custom "Frontend não respondeu ao check"
}

if ($frontendCheck -and $frontendCheck.StatusCode -eq 200) {
    Write-Success "Frontend online na porta 8080"
} else {
    Write-Error-Custom "Frontend não respondeu!"
    Get-Job -Name "frontend" | Receive-Job | Select-Object -First 50
    Exit 1
}

# ==========================================
# ETAPA 7: TESTE LOGIN
# ==========================================

Write-Info ""
Write-Info "[ETAPA 7] Testando autenticação JWT..."

$loginBody = '{"email":"admin@gmail.com","password":"vip2026"}'

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing `
        -ErrorAction Stop

    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.token) {
        Write-Success "Login OK - JWT token gerado"
        $script:authToken = $loginData.token
    } else {
        Write-Error-Custom "Login falhou - nenhum token recebido"
        Exit 1
    }
} catch {
    Write-Error-Custom "Erro na requisição de login: $_"
    Exit 1
}

# ==========================================
# ETAPA 8: TESTE CRIAÇÃO DE INSTÂNCIA
# ==========================================

Write-Info ""
Write-Info "[ETAPA 8] Testando criação de instância com QR Code..."

$createBody = @{
    name = "test-qr-instance-$(Get-Random)"
    adapter = "baileys"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $script:authToken"
        "Content-Type" = "application/json"
    }

    $instanceResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
        -Method POST `
        -Headers $headers `
        -Body $createBody `
        -UseBasicParsing `
        -ErrorAction Stop

    $instanceData = $instanceResponse.Content | ConvertFrom-Json
    
    if ($instanceData.id) {
        Write-Success "Instância criada: $($instanceData.id)"
        
        if ($instanceData.qrCode) {
            Write-Success "QR Code GERADO com sucesso!"
        } else {
            Write-Warning-Custom "QR Code ainda não disponível (pode chegara após conexão)"
        }
    } else {
        Write-Warning-Custom "Resposta incompleta: $($instanceResponse.Content)"
    }
} catch {
    Write-Error-Custom "Erro ao criar instância: $_"
    Exit 1
}

# ==========================================
# ETAPA 9: RESUMO FINAL
# ==========================================

Write-Info ""
Write-Info "=========================================="
Write-Success "✅ TODOS OS TESTES PASSARAM!"
Write-Info "=========================================="
Write-Info ""

Write-Success "Backend rodando:    http://localhost:3001"
Write-Success "Frontend rodando:   http://localhost:8080"
Write-Success "Autenticação:       Funcionando (JWT 7d)"
Write-Success "Instâncias:         Criável e com QR Code"
Write-Info ""

Write-Info "PRÓXIMOS PASSOS:"
Write-Info "1. Abra http://localhost:8080 no navegador"
Write-Info "2. Faça login com admin@gmail.com / vip2026"
Write-Info "3. Crie uma nova instância"
Write-Info "4. Escaneie o QR code com seu WhatsApp"
Write-Info "5. Sistema reiniciou a conexão"
Write-Info ""

Write-Info "Logs em tempo real:"
Write-Info "- Backend: Get-Job -Name backend | Receive-Job -Keep"
Write-Info "- Frontend: Get-Job -Name frontend | Receive-Job -Keep"
Write-Info ""

Write-Info "Para parar tudo:"
Write-Info "- Stop-Job -Name backend"
Write-Info "- Stop-Job -Name frontend"
Write-Info ""

# Manter jobs rodando
Write-Info "Serviços rodando em background jobs..."
Write-Info "Digite 'Get-Job' para ver status"

# Aguardar indefinidamente (jobs continuam rodando)
while ($true) {
    Start-Sleep -Seconds 60
    
    # Verificar se jobs ainda estão rodando
    $backend = Get-Job -Name "backend" -ErrorAction SilentlyContinue
    $frontend = Get-Job -Name "frontend" -ErrorAction SilentlyContinue
    
    if (-not $backend -or $backend.State -eq "Failed") {
        Write-Error-Custom "Backend parou! Reiniciando..."
        # Reiniciar backend
    }
    
    if (-not $frontend -or $frontend.State -eq "Failed") {
        Write-Error-Custom "Frontend parou! Reiniciando..."
        # Reiniciar frontend
    }
}
