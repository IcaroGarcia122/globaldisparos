# 📱 Passo a Passo: Criar Instância + Gerar QR Code

## ✅ Passo 1: Verificar se a API está rodando

```powershell
curl -s http://localhost:8081/instance/fetchInstances -H "apikey: myfKey123456789" | ConvertFrom-Json | Select-Object -ExpandProperty instances | Format-Table
```

**Resultado esperado:** Lista de instâncias (pode estar vazia)

---

## ✅ Passo 2: Abrir Thunder Client

1. Em VS Code: Clique em **Thunder Client** (ou Ctrl+Alt+L)
2. Crie uma **Nova Requisição** (New Request)
3. Defina como **POST**

---

## ✅ Passo 3: Criar Instância via Thunder Client

### URL:
```
http://localhost:8081/instance/create
```

### Headers:
```
apikey: myfKey123456789
Content-Type: application/json
```

### Body (JSON):
```json
{
  "instanceName": "whatsapp_novo",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true
}
```

**Clique em SEND (Enviar)**

**Resposta esperada (201 Created):**
```json
{
  "status": "success",
  "message": "Instance created successfully",
  "instance": {
    "instanceId": "xxx-xxx-xxx",
    "instanceName": "whatsapp_novo",
    "integration": "WHATSAPP-BAILEYS",
    "connectionStatus": "disconnected"
  }
}
```

---

## ✅ Passo 4: Conectar à Instância

### URL:
```
http://localhost:8081/instance/connect/whatsapp_novo
```

### Headers:
```
apikey: myfKey123456789
```

### Method: GET

**Clique em SEND**

**Resposta esperada (200 OK):**
```json
{
  "status": "success",
  "message": "Instance connected",
  "qrcode": {
    "code": "..."
  }
}
```

---

## ✅ Passo 5: Obter QR Code em Base64

### URL:
```
http://localhost:8081/instance/qrcode/whatsapp_novo
```

### Headers:
```
apikey: myfKey123456789
```

### Method: GET

**Clique em SEND**

**Resposta esperada (200 OK):**
```json
{
  "status": "success",
  "qrcode": {
    "code": "iVBORw0KGgoAAAANSUh..."
  }
}
```

⚠️ **IMPORTANTE:** Copie **EXATAMENTE** o valor de `"code"` (sem o `"code": ` e sem as aspas externas)

---

## ✅ Passo 6: Visualizar o QR Code

### Opção A: Usar Script PowerShell

1. Copie o valor de `"code"` da resposta anterior
2. Crie um arquivo `decode-qr.ps1`:

```powershell
# Cole o base64 aqui (SEM o "data:image/png;base64," se tiver)
$base64String = "iVBORw0KGgoAAAANSUh..."

if (!(Test-Path "C:\temp")) { 
    New-Item -ItemType Directory -Path "C:\temp" -Force | Out-Null 
}

$bytes = [Convert]::FromBase64String($base64String)
[IO.File]::WriteAllBytes("C:\temp\qr_novo.png", $bytes)

Write-Host "✅ QR Code salvo!" 
Write-Host "📊 Tamanho: $($bytes.Length) bytes"
Start-Process "C:\temp\qr_novo.png"
```

3. Execute:
```powershell
powershell -ExecutionPolicy Bypass -File decode-qr.ps1
```

### Opção B: Verificar o Tamanho da String

Antes de converter, verifique se a string tem o tamanho adequado:

```powershell
$base64String = "iVBORw0KGgoAAAANSUh..."
Write-Host "Tamanho: $($base64String.Length) caracteres"
```

**Esperado:** Mínimo 1000 caracteres (QR codes são geralmente 2000-10000 caracteres)

---

## 🔍 Checklist de Validação

- [ ] API está respondendo em `http://localhost:8081`
- [ ] Headers incluem `apikey: myfKey123456789`
- [ ] Base64 começa com `iVBORw0KGgo`
- [ ] Base64 tem > 1000 caracteres
- [ ] Arquivo PNG foi criado (> 500 bytes)
- [ ] QR Code abre e é visível (não está preto)

---

## ❌ Se o QR Code ainda estiver preto:

1. **Verifique o tamanho:** Deve ter > 800 bytes
2. **Teste novamente:** Delete a instância e crie une nova
3. **Verificar logs:**
```powershell
docker-compose logs evolution-api
```

4. **Reiniciar API:**
```powershell
docker-compose restart evolution-api
```

---

## 🧪 Teste de Instâncias Existentes

Para listar todas as instâncias:

```powershell
curl -s http://localhost:8081/instance/fetchInstances -H "apikey: myfKey123456789" | ConvertFrom-Json
```

Para deletar uma instância:

```powershell
curl -X DELETE http://localhost:8081/instance/delete/whatsapp_novo `
  -H "apikey: myfKey123456789"
```
