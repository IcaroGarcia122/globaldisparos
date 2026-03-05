# Script para testar login
Write-Host "Aguardando 3 segundos para backend iniciar..."
Start-Sleep -Seconds 3

Write-Host "Testando login..."
$headers = @{"Content-Type" = "application/json"}
$body = @{email = "admin@gmail.com"; password = "vip2026"} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Login sucesso - Status: $($response.StatusCode)"
    
    $data = ConvertFrom-Json $response.Content
    $token = $data.token
    Write-Host "Token recebido: $($token.Substring(0, 40))..."
    
    Write-Host "`nTestando criação de instância..."
    $instanceBody = @{name = "Auto Test"; accountAge = 30} | ConvertTo-Json
    $authHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $instanceResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" -Method POST -Headers $authHeaders -Body $instanceBody -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Instância criada - Status: $($instanceResponse.StatusCode)"
    Write-Host "Response: $($instanceResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 1)"
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        $errorContent = $_.Exception.Response.Content.ReadAsStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody"
    }
}
