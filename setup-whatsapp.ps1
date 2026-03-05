# Setup Completo - Criar Instância + Conectar + Obter QR Code
param(
    [string]$InstanceName = "meus_whatsapp",
    [string]$ApiKey = "myfKey123456789",
    [string]$ApiUrl = "http://localhost:8081"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" -ForegroundColor Cyan
Write-Host "┃   ⚙️  Setup Evolution API - WhatsApp Instância  ┃" -ForegroundColor Cyan
Write-Host "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" -ForegroundColor Cyan
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
    Write-Host "✅ Instância criada com sucesso!" -ForegroundColor Green
    Write-Host "   ID: $($createData.instance.instanceId)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar instância:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "⚠️  Aviso ao conectar (pode ser normal):" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
}

# Passo 3: Aguardar QR Code
Write-Host "📱 PASSO 3: Aguardando QR Code..." -ForegroundColor Yellow
Write-Host ""

$endpoints = @(
    "/instance/qrcode/$InstanceName",
    "/instance/$InstanceName/qrcode"
)

$qrFound = $false

for ($attempt = 1; $attempt -le 60; $attempt++) {
    foreach ($endpoint in $endpoints) {
        try {
            Write-Host -NoNewline "  [$attempt/60] Tentando... "
            $qrResponse = Invoke-WebRequest -Uri "$ApiUrl$endpoint" `
                -Method GET `
                -Headers @{apikey=$ApiKey} `
                -ErrorAction Stop `
                -TimeoutSec 3

            $qrData = $qrResponse.Content | ConvertFrom-Json
            
            if ($qrData.qrcode -and $qrData.qrcode.code) {
                Write-Host "✅ QR Code obtido!" -ForegroundColor Green
                Write-Host ""
                
                # Salvar QR Code
                $qrBase64 = $qrData.qrcode.code
                if ($qrBase64.StartsWith("data:")) {
                    $qrBase64 = $qrBase64.Split(",")[1]
                }
                
                $filePath = "C:\temp\whatsapp_qr_$InstanceName.png"
                $bytes = [System.Convert]::FromBase64String($qrBase64)
                [System.IO.File]::WriteAllBytes($filePath, $bytes)
                
                Write-Host "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" -ForegroundColor Green
                Write-Host "┃   ✅ QR CODE PRONTO PARA ESCANEAR!           ┃" -ForegroundColor Green
                Write-Host "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" -ForegroundColor Green
                Write-Host ""
                Write-Host "📂 QR Code salvo: $filePath"
                Write-Host "📸 Pairing Status: $($qrData.qrcode.pairingStatus)"
                Write-Host ""
                Write-Host "▶ Use o arquivo PNG acima para escanear com seu WhatsApp" -ForegroundColor Cyan
                Write-Host ""
                
                $qrFound = $true
                break
            } else {
                Write-Host "⏳" -ForegroundColor Gray
            }
            break
        } catch {
            Write-Host "." -ForegroundColor Gray -NoNewline
        }
    }
    
    if ($qrFound) {
        break
    }
    
    Start-Sleep -Seconds 2
}

if (-not $qrFound) {
    Write-Host ""
    Write-Host "⚠️  QR Code não obtido (timeout)" -ForegroundColor Yellow
    Write-Host "Verifique se a instância está conectada" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 Resumo:" -ForegroundColor Cyan
Write-Host "  - Instância: $InstanceName"
Write-Host "  - API: $ApiUrl"
Write-Host "  - Próximos passos:"
Write-Host "    1. Escaneie o QR code com seu WhatsApp"
Write-Host "    2. Aguarde a conexão ser estabelecida"
Write-Host "    3. Use a instância para enviar mensagens"
Write-Host ""
