# QR Code Monitor para Evolution API
param(
    [string]$Instance = "test_simple",
    [string]$ApiKey = "myfKey123456789",
    [string]$ApiUrl = "http://localhost:8081",
    [int]$MaxRetries = 60,
    [int]$DelaySeconds = 1
)

Write-Host "🔍 Monitorando QR Code..." -ForegroundColor Cyan
Write-Host "  Instância: $Instance"
Write-Host "  API: $ApiUrl"
Write-Host "  Máximo de tentativas: $MaxRetries"
Write-Host ""

$endpoints = @(
    "/instance/qrcode/$Instance",
    "/instance/$Instance/qrcode",
    "/instances/$Instance/qrcode"
)

for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    $found = $false
    
    foreach ($endpoint in $endpoints) {
        try {
            Write-Host "Tentativa $attempt/$MaxRetries - Testando $endpoint..." -ForegroundColor Gray -NoNewline
            $response = Invoke-WebRequest -Uri "$ApiUrl$endpoint" `
                -Method GET `
                -Headers @{apikey=$ApiKey} `
                -ErrorAction Stop `
                -TimeoutSec 5
            
            Write-Host " ✓" -ForegroundColor Green
            $data = $response.Content | ConvertFrom-Json
            
            if ($data.qrcode -and $data.qrcode.code) {
                Write-Host ""
                Write-Host "✅ QR CODE OBTIDO!" -ForegroundColor Green
                Write-Host "   Pairing Status: $($data.qrcode.pairingStatus)"
                Write-Host ""
                
                # Salvar base64 em arquivo
                $qrBase64 = $data.qrcode.code
                if ($qrBase64.StartsWith("data:")) {
                    $qrBase64 = $qrBase64.Split(",")[1]
                }
                
                $bytes = [System.Convert]::FromBase64String($qrBase64)
                $outputPath = "C:\temp\qrcode_$Instance.png"
                [System.IO.File]::WriteAllBytes($outputPath, $bytes)
                
                Write-Host "📁 QR Code salvo em: $outputPath"
                Write-Host ""
                Write-Host "Para escanear:"
                Write-Host "  1. Abra o arquivo PNG"
                Write-Host "  2. Escaneie com seu WhatsApp"
                Write-Host ""
                exit 0
            } elseif ($data.message) {
                Write-Host " ⏳" -ForegroundColor Yellow
            }
            
            $found = $true
            break
        } catch {
            # Próximo endpoint
        }
    }
    
    if (-not $found) {
        Write-Host " ✗" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $DelaySeconds
}

Write-Host ""
Write-Host "❌ QR Code não obtido após $MaxRetries tentativas" -ForegroundColor Red
Write-Host "Tente executar novamente ou verifique a instância" -ForegroundColor Yellow
exit 1
