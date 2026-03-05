# Script automatizado para criar instancia + gerar QR code
param(
    [string]$NomeInstancia = "whatsapp_nova"
)

$ApiUrl = "http://localhost:8081"
$ApiKey = "myfKey123456789"
$Headers = @{
    "apikey" = $ApiKey
    "Content-Type" = "application/json"
}

Write-Host "[*] Iniciando criacao de instancia..."
Write-Host ""

# 1. Verificar se API esta rodando
Write-Host "[*] Verificando API..."
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/instance/fetchInstances" -Headers $Headers -Method Get
    Write-Host "[+] API respondendo!"
} catch {
    Write-Host "[-] API nao esta respondendo em $ApiUrl"
    Write-Host "    Execute: docker-compose up -d"
    exit 1
}

Write-Host ""

# 2. Criar instancia
Write-Host "[*] Criando instancia '$NomeInstancia'..."

$bodyCreate = @{
    instanceName = $NomeInstancia
    integration = "WHATSAPP-BAILEYS"
    qrcode = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/instance/create" `
        -Method Post `
        -Headers $Headers `
        -Body $bodyCreate
    
    Write-Host "[+] Instancia criada!"
    Write-Host "    ID: $($response.instance.instanceId)"
} catch {
    Write-Host "[-] Erro ao criar instancia: $_"
    exit 1
}

Write-Host ""

# 3. Conectar a instancia
Write-Host "[*] Conectando a instancia..."
Start-Sleep -Seconds 2

try {
    $connectResponse = Invoke-RestMethod -Uri "$ApiUrl/instance/connect/$NomeInstancia" `
        -Method Get `
        -Headers $Headers
    
    Write-Host "[+] Instancia conectada!"
    
    # Obter base64 da resposta
    if ($connectResponse.base64) {
        $base64Full = $connectResponse.base64
        Write-Host "[+] Base64 obtido da resposta!"
        Write-Host "    Tamanho: $($base64Full.Length) caracteres"
    } else {
        Write-Host "[-] Base64 nao encontrado na resposta"
        exit 1
    }
} catch {
    Write-Host "[-] Erro na conexao: $_"
    exit 1
}

Write-Host ""

# 4. Remover prefixo se tiver
Write-Host "[*] Processando base64..."
$base64String = $base64Full -replace 'data:image/png;base64,', ''

# 5. Validar tamanho
if ($base64String.Length -lt 500) {
    Write-Host "[-] Base64 muito curto: $($base64String.Length) caracteres (minimo: 500)"
    exit 1
}

Write-Host "[+] Base64 valido!"
Write-Host "    Tamanho: $($base64String.Length) caracteres"

Write-Host ""

# 6. Decodificar e salvar PNG
Write-Host "[*] Decodificando para PNG..."

if (!(Test-Path "C:\temp")) { 
    New-Item -ItemType Directory -Path "C:\temp" -Force | Out-Null 
}

try {
    $bytes = [Convert]::FromBase64String($base64String)
    $pngPath = "C:\temp\qr_$NomeInstancia.png"
    
    [IO.File]::WriteAllBytes($pngPath, $bytes)
    
    Write-Host "[+] PNG decodificado com sucesso!"
    Write-Host "    Arquivo: $pngPath"
    Write-Host "    Tamanho: $($bytes.Length) bytes"
} catch {
    Write-Host "[-] Erro ao decodificar: $_"
    exit 1
}

Write-Host ""

# 7. Abrir imagem
Write-Host "[*] Abrindo QR code..."
Start-Process $pngPath

Write-Host ""
Write-Host "=================================================="
Write-Host "[+] PROCESSO COMPLETO!"
Write-Host "=================================================="
Write-Host ""
Write-Host "Resumo:"
Write-Host "  * Instancia: $NomeInstancia"
Write-Host "  * QR Code: $pngPath"
Write-Host "  * API URL: $ApiUrl"
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  1. Escaneie o QR code com WhatsApp"
Write-Host "  2. Confirme a conexao no celular"
Write-Host "  3. A instancia estara pronta para testes"
Write-Host ""
