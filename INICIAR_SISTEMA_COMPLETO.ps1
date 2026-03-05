#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script para iniciar todo o sistema do Disparador Elite
    
.DESCRIPTION
    Inicia: Docker (Evolution API), Backend, Frontend
    Verifica conexões e exibe status
    
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File INICIAR_SISTEMA_COMPLETO.ps1
#>

param(
    [switch]$SkipVerification = $false,
    [switch]$NoBackground = $false
)

# Cores para output
$colors = @{
    success = "Green"
    error = "Red"
    warning = "Yellow"
    info = "Cyan"
}

function Write-Banner {
    param([string]$Text)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Text.PadRight(62))║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status {
    param(
        [string]$Message,
        [string]$Status,
        [string]$Color = "info"
    )
    
    if ($Status -eq "OK") {
        Write-Host "✅ $Message" -ForegroundColor Green
    } elseif ($Status -eq "WAIT") {
        Write-Host "⏳ $Message" -ForegroundColor Yellow
    } elseif ($Status -eq "ERROR") {
        Write-Host "❌ $Message" -ForegroundColor Red
    } else {
        Write-Host "ℹ️  $Message" -ForegroundColor Cyan
    }
}

function Test-Port {
    param([int]$Port)
    
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $asyncResult = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $asyncResult.AsyncWaitHandle.WaitOne(2000) | Out-Null
        
        if ($tcp.Connected) {
            $tcp.Close()
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Start-Service {
    param(
        [string]$Name,
        [string]$WorkDir,
        [string]$Command
    )
    
    Write-Status "Iniciando $Name..." "WAIT"
    
    try {
        if ($NoBackground) {
            # Executar no foreground para debug
            Push-Location $WorkDir
            Invoke-Expression $Command
            Pop-Location
        } else {
            # Executar em background
            Start-Job -Name $Name -ScriptBlock {
                param($dir, $cmd)
                Push-Location $dir
                Invoke-Expression $cmd
                Pop-Location
            } -ArgumentList $WorkDir, $Command | Out-Null
        }
        
        return $true
    } catch {
        Write-Status "$Name falhou: $_" "ERROR"
        return $false
    }
}

# INICIO DO SCRIPT
Clear-Host
Write-Banner "DISPARADOR ELITE - Iniciando Sistema Completo"

# Verificações iniciais
Write-Host "🔍 Realizando verificações iniciais..." -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Status "Verificando Docker..." "WAIT"
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Status "Docker encontrado: $dockerVersion" "OK"
    } else {
        Write-Status "Docker não encontrado!" "ERROR"
        exit 1
    }
} catch {
    Write-Status "Erro ao verificar Docker!" "ERROR"
    exit 1
}

# Verificar Node
Write-Status "Verificando Node.js..." "WAIT"
try {
    $nodeVersion = node --version
    Write-Status "Node.js encontrado: $nodeVersion" "OK"
} catch {
    Write-Status "Node.js não encontrado!" "ERROR"
    exit 1
}

# Verificar diretórios
Write-Host ""
Write-Host "📁 Verificando estrutura de diretórios..." -ForegroundColor Cyan

if (Test-Path "backend") {
    Write-Status "Pasta backend encontrada" "OK"
} else {
    Write-Status "Pasta backend não encontrada!" "ERROR"
    exit 1
}

if (Test-Path "frontend") {
    Write-Status "Pasta frontend encontrada" "OK"
} else {
    Write-Status "Pasta frontend não encontrada!" "ERROR"
    exit 1
}

# Iniciar Docker
Write-Banner "Iniciando Evolution API (Docker)"
Write-Status "Iniciando containers..." "WAIT"

try {
    docker-compose up -d 2>&1 | ForEach-Object {
        if ($_ -match "done|created|already") {
            Write-Host "  ✓ $_" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Status "Aguardando Evolution API inicializar (30s)..." "WAIT"
    Start-Sleep -Seconds 30
    
    if (Test-Port 8081) {
        Write-Status "Evolution API rodando em http://localhost:8081" "OK"
    } else {
        Write-Status "Evolution API ainda está iniciando..." "WAIT"
        Start-Sleep -Seconds 15
    }
} catch {
    Write-Status "Erro ao iniciar Docker!" "ERROR"
}

# Compilar Backend
Write-Banner "Compilando Backend (TypeScript)"

if (-not (Test-Path "backend/dist")) {
    Write-Status "Compilando TypeScript..." "WAIT"
    Push-Location backend
    
    npm run build 2>&1 | ForEach-Object {
        if ($_ -match "error") {
            Write-Host "  ❌ $_" -ForegroundColor Red
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Backend compilado com sucesso!" "OK"
    } else {
        Write-Status "Erro na compilação do backend!" "ERROR"
        Pop-Location
        exit 1
    }
    
    Pop-Location
} else {
    Write-Status "Backend já compilado (usando cache)" "OK"
}

# Iniciar Backend
Write-Banner "Iniciando Backend (Express)"
if (Start-Service "backend" "backend" "npm run start") {
    Write-Status "Backend iniciado em background" "OK"
    
    # Aguardar backend iniciar
    Write-Status "Aguardando backend inicializar..." "WAIT"
    $backed_ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-Port 3001) {
            Write-Status "Backend rodando em http://localhost:3001" "OK"
            $backed_ready = $true
            break
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
    
    if (-not $backed_ready) {
        Write-Status "Backend não respondeu após 30 segundos" "ERROR"
    }
    Write-Host ""
} else {
    Write-Status "Falha ao iniciar backend!" "ERROR"
}

# Iniciar Frontend
Write-Banner "Iniciando Frontend (Vite + React)"
if (Start-Service "frontend" "frontend" "npm run dev") {
    Write-Status "Frontend iniciado em background" "OK"
    
    # Aguardar frontend iniciar
    Write-Status "Aguardando frontend inicializar..." "WAIT"
    $frontend_ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        if (Test-Port 5173) {
            Write-Status "Frontend rodando em http://localhost:5173" "OK"
            $frontend_ready = $true
            break
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
    
    if (-not $frontend_ready) {
        Write-Status "Frontend não respondeu após 20 segundos" "ERROR"
    }
    Write-Host ""
} else {
    Write-Status "Falha ao iniciar frontend!" "ERROR"
}

# Status Final
Write-Banner "Status dos Serviços"

$services = @(
    @{Name = "Evolution API"; Port = 8081; URL = "http://localhost:8081" }
    @{Name = "Backend"; Port = 3001; URL = "http://localhost:3001" }
    @{Name = "Frontend"; Port = 5173; URL = "http://localhost:5173" }
)

$allRunning = $true
foreach ($service in $services) {
    if (Test-Port $service.Port) {
        Write-Status "$($service.Name) ✓ $($service.URL)" "OK"
    } else {
        Write-Status "$($service.Name) ✗ Não respondendo na porta $($service.Port)" "ERROR"
        $allRunning = $false
    }
}

# Mensagem final
Write-Host ""
if ($allRunning) {
    Write-Banner "Sistema Iniciado com Sucesso!"
    Write-Host "🎉 Todos os serviços estão rodando:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  🌐 Frontend:     http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  📡 Backend:      http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  🔌 Evolution:    http://localhost:8081" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Acesse http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  2. Faça login: admin@gmail.com / vip2026" -ForegroundColor Yellow
    Write-Host "  3. Vá para: /disparador" -ForegroundColor Yellow
    Write-Host "  4. Siga o CHECKLIST_PRE_IMPLEMENTACAO.md" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📚 Documentação:" -ForegroundColor Cyan
    Write-Host "  - README_DISPARADOR_FINAL.md" -ForegroundColor Cyan
    Write-Host "  - IMPLEMENTACAO_DISPARADOR_ELITE.md" -ForegroundColor Cyan
    Write-Host "  - GUIA_TESTE_DISPARADOR.md" -ForegroundColor Cyan
    Write-Host "  - RESUMO_IMPLEMENTACAO.json" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Banner "Aviso: Alguns Serviços Não Iniciaram"
    Write-Host "⚠️  Verifique os logs acima para detalhes." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  1. Verificar se as portas não estão em uso" -ForegroundColor Yellow
    Write-Host "  2. Executar: docker-compose logs" -ForegroundColor Yellow
    Write-Host "  3. Reiniciar Docker Desktop" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⌨️  Pressione Enter para continuar (a janela se fechará)" -ForegroundColor Gray
Read-Host | Out-Null
