# Decodificador de QR Code Base64
# Cole o valor de "code" da resposta aqui

$base64Code = "COLE_AQUI_O_VALOR_DO_CODE_DA_RESPOSTA_DA_API"

# Remover o prefixo "data:image/png;base64," se tiver
if ($base64Code.StartsWith("data:")) {
    $base64Code = $base64Code.Split(",")[1]
}

# Converter para bytes e salvar como PNG
try {
    $bytes = [System.Convert]::FromBase64String($base64Code)
    $outputPath = "C:\temp\whatsapp_qrcode.png"
    
    # Criar pasta se não existir
    if (-not (Test-Path "C:\temp")) {
        New-Item -ItemType Directory -Path "C:\temp" | Out-Null
    }
    
    # Salvar arquivo
    [System.IO.File]::WriteAllBytes($outputPath, $bytes)
    
    Write-Host ""
    Write-Host "✅ QR Code salvo com sucesso!" -ForegroundColor Green
    Write-Host "📂 Arquivo: $outputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Abrindo arquivo..." -ForegroundColor Yellow
    
    # Abrir automaticamente
    Start-Process $outputPath
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
