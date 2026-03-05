# Setup Completo - Criar Instância + Conectar + Obter QR Code
param(
    [string]$InstanceName = "meus_whatsapp",
    [string]$ApiKey = "myfKey123456789",
    [string]$ApiUrl = "http://localhost:8081"
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Evolution API - WhatsApp Instância Setup     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Criar Instância
Write-Host "📝 PASSO 1: Criando instância '$InstanceName'..." -ForegroundColor Yellow

$createBody = @{
    instanceName = $InstanceName
    integration = "WHATSAPP-BAILEYS"
    qrcode = $true
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "$ApiUrl/instance/create" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{apikey=$ApiKey} `
        -Body $createBody `
        -ErrorAction Stop

    $createData = $createResponse.Content | ConvertFrom-Json
    Write-Host "✅ Instância criada!" -ForegroundColor Green
    Write-Host "   ID: $($createData.instance.instanceId)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Passo 2: Conectar Instância
Write-Host "🔗 PASSO 2: Conectando instância..." -ForegroundColor Yellow

try {
    $connectResponse = Invoke-WebRequest -Uri "$ApiUrl/instance/connect/$InstanceName" `
        -Method GET `
        -Headers @{apikey=$ApiKey} `
        -ErrorAction Stop
    Write-Host "✅ Instância conectada!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

# Passo 3: Aguardar QR Code
Write-Host "📱 PASSO 3: Aguardando QR Code..." -ForegroundColor Yellow

$qrFound = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    Write-Host -NoNewline "  [$attempt/60] "
    
    try {
        $qrResponse = Invoke-WebRequest -Uri "$ApiUrl/instance/qrcode/$InstanceName" `
            -Method GET `
            -Headers @{apikey=$ApiKey} `
            -ErrorAction Stop `
            -TimeoutSec 3

        $qrData = $qrResponse.Content | ConvertFrom-Json
        
        if ($qrData.qrcode -and $qrData.qrcode.code) {
            Write-Host "✅ QR Code obtido!" -ForegroundColor Green
            
            # Salvar QR Code em arquivo
            $qrBase64 = $qrData.qrcode.code
            if ($qrBase64.StartsWith("data:")) {
                $qrBase64 = $qrBase64.Split(",")[1]
            }
            
            $bytes = [System.Convert]::FromBase64String($qrBase64)
            $filePath = "C:\temp\whatsapp_qr_$InstanceName.png"
            [System.IO.File]::WriteAllBytes($filePath, $bytes)
            
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║    QR CODE PRONTO PARA ESCANEAR!              ║" -ForegroundColor Green
            Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            Write-Host "📂 Arquivo: $filePath" -ForegroundColor Cyan
            Write-Host "📸 Status: $($qrData.qrcode.pairingStatus)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "▶ Abra o arquivo PNG com seu WhatsApp" -ForegroundColor Yellow
            
            $qrFound = $true
            break
        } else {
            Write-Host "Aguardando..." -ForegroundColor Gray
        }
    } catch {
        Write-Host "." -ForegroundColor Gray -NoNewline
    }
    
    Start-Sleep -Seconds 2
}

if (-not $qrFound) {
    Write-Host ""
    Write-Host "⏱️ Timeout - QR Code não obtido" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
