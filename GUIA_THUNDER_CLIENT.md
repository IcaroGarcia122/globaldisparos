# 🚀 Guia Completo - Criar, Conectar e Obter QR Code

## Informações da API

**URL Base:** `http://localhost:8081`  
**API Key:** `myfKey123456789`  
**Porta:** 8081  
**Tipo de Autenticação:** Header `apikey`

---

## Passo 1: Criar Instância WhatsApp

No **Thunder Client**, crie uma requisição com:

**Método:** POST  
**URL:** `http://localhost:8081/instance/create`

**Headers:**
```
apikey: myfKey123456789
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "instanceName": "meu_whatsapp",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true
}
```

**Esperado:** Status 201 com resposta contendo ID da instância

---

## Passo 2: Conectar a Instância

**Método:** GET  
**URL:** `http://localhost:8081/instance/connect/meu_whatsapp`

**Headers:**
```
apikey: myfKey123456789
```

**Esperado:** Status 200 - Instância conectada

---

## Passo 3: Aguardar e Obter QR Code

Faça requisições GET repetidas até obter o QR code:

**Método:** GET  
**URL:** `http://localhost:8081/instance/qrcode/meu_whatsapp`

**Headers:**
```
apikey: myfKey123456789
```

**Polling:**
- Faça a requisição a cada 1-2 segundos
- Máximo de 60 tentativas (2 minutos)
- Quando receber `qrcode.code` com valor base64, você conseguiu!

**Resposta exemplo:**
```json
{
  "qrcode": {
    "code": "data:image/png;base64,iVBORw0KGgo...",
    "pairingStatus": "WAITING_FOR_SCAN",
    "base64": true
  }
}
```

---

## Passo 4: Ver o QR Code

O campo `qrcode.code` contém a imagem em base64. Para visualizar:

**Opção 1: Use um decodificador online**
1. Copie o valor de `code` (sem "data:image/png;base64,")
2. Acesse https://www.base64-image-decoder.com
3. Cole e clique "Decode"

**Opção 2: Salve em arquivo e abra**
```powershell
# PowerShell
$base64 = "iVBORw0KGgo..." # copiar da resposta
[System.IO.File]::WriteAllBytes("C:\temp\qr.png", [System.Convert]::FromBase64String($base64))
Start-Process "C:\temp\qr.png"
```

---

## Verificar Instâncias Criadas

Para listar todas as instâncias:

**Método:** GET  
**URL:** `http://localhost:8081/instance/fetchInstances`

**Headers:**
```
apikey: myfKey123456789
```

**Resposta:** Array com todas as instâncias criadas

---

## Resumo Rápido

| Passo | Método | Endpoint | Esperado |
|-------|--------|----------|----------|
| 1. Criar | POST | `/instance/create` | 201 Created |
| 2. Conectar | GET | `/instance/connect/meu_whatsapp` | 200 OK |
| 3. QR Code | GET | `/instance/qrcode/meu_whatsapp` | 200 com base64 |
| 4. Listar | GET | `/instance/fetchInstances` | 200 com array |

---

## Dicas

✅ **Qual instância usar?**  
Use `evolution-api-simple` na porta `8081` (está funcionando perfeitamente)

✅ **Timeout do QR Code?**  
- Reinicie a instância: GET `/instance/connect/meu_whatsapp`
- Tente novamente: GET `/instance/qrcode/meu_whatsapp`
- Máximo 2 minutos de espera

✅ **Thunder Client salva requisições?**  
Sim! Crie uma `Collection` e salve todas as requisições para reutilizar

✅ **Error "Already in use"?**  
Altere o `instanceName` para um nome diferente a cada criação

---

## Exemplo Completo em Thunder Client

```
1. POST  http://localhost:8081/instance/create
   Header: apikey: myfKey123456789
   Body: {"instanceName":"wp1","integration":"WHATSAPP-BAILEYS","qrcode":true}
   
2. GET   http://localhost:8081/instance/connect/wp1
   Header: apikey: myfKey123456789
   
3. GET   http://localhost:8081/instance/qrcode/wp1  (repetir até obter)
   Header: apikey: myfKey123456789
```

Pronto! Você tem a instância WhatsApp funcional! 🎉
