# PROMPT DE CORREÇÃO - QR CODE E PÁGINA OFFLINE

## PROBLEMA
1. QR code da instância Baileys NÃO está gerando
2. A página frontend está fora do ar (localhost:8080)
3. Sistema não está totalmente funcional

## CRITÉRIO DE SUCESSO - DEVE ATENDER TODOS ANTES DE CONCLUIR:
- ✅ Frontend online em http://localhost:8080 (VITE respondendo)
- ✅ Backend online em http://localhost:3001 (respondendo /health)
- ✅ QR code gera quando cria nova instância Baileys
- ✅ WebSocket conecta corretamente
- ✅ Login funciona com JWT v7d
- ✅ Sem erros no console do navegador
- ✅ Sem erros no backend logs

---

## INVESTIGAÇÃO NECESSÁRIA

### 1. STATUS ATUAL DOS SERVIÇOS
```powershell
# Verificar se backend está rodando
curl http://localhost:3001/health

# Verificar se frontend está rodando  
curl http://localhost:8080

# Verificar processos Node
Get-Process -Name node -ErrorAction SilentlyContinue
```

### 2. VERIFICAR CAMINHO DO QR CODE
- [ ] Confirmar arquivo: `backend/src/services/whatsappService.ts`
- [ ] Verificar método: `generateQRCode()` 
- [ ] Verificar emit do evento QR para frontend
- [ ] Confirmar WebSocket está enviando QR code para cliente

### 3. VERIFICAR FRONTEND RECEBENDO QR CODE
- [ ] Arquivo: `frontend/src/pages/Instances.tsx`
- [ ] Verificar listener WebSocket para evento "qr"
- [ ] Confirmar estado React está atualizando com QR code
- [ ] Verificar se QR code está sendo renderizado no UI

### 4. VERIFICAR INICIALIZAÇÃO BAILEYS
- [ ] Arquivo: `backend/src/adapters/BaileysAdapter.ts`
- [ ] Verificar se `makeWASocket()` está configurado corretamente
- [ ] Confirmar handlers de eventos estão registrados:
  - `connection.update`
  - `message.new`
  - `message.upsert`
  - `qr` event

### 5. VERIFICAR CONFIGURAÇÃO WEBSOCKET
- [ ] Arquivo: `backend/src/server.ts`
- [ ] Confirmar Socket.IO está inicializado
- [ ] Verificar auth middleware
- [ ] Confirmar emissão de eventos para frontend

---

## PASSOS DE CORREÇÃO

### Passo 1: Limpar e Reiniciar Serviços
```powershell
# Parar tudo
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Rebuild backend
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
npm run build

# Verificar se compilou
if ($LASTEXITCODE -eq 0) { 
  Write-Host "✅ Build OK" 
} else { 
  Write-Host "❌ Build falhou - PARAR AQUI"
}
```

### Passo 2: Iniciar Backend em Background
```powershell
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
npm start 2>&1 &

Start-Sleep -Seconds 5

# Verificar se respondeu
$health = $null
try {
  $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop
} catch {}

if ($health) {
  Write-Host "✅ Backend online na porta 3001"
} else {
  Write-Host "❌ Backend NÃO respondeu - REVISAR LOGS"
  Exit
}
```

### Passo 3: Iniciar Frontend
```powershell
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\frontend"
npm run dev 2>&1 &

Start-Sleep -Seconds 5

# Verificar se Vite started
$test = curl http://localhost:8080 2>&1
if ($test -match "200|html") {
  Write-Host "✅ Frontend online na porta 8080"
} else {
  Write-Host "❌ Frontend NÃO respondeu"
  Exit
}
```

### Passo 4: Testar Login
```powershell
$body = '{"email":"admin@gmail.com","password":"vip2026"}'
$result = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing

$data = $result.Content | ConvertFrom-Json
if ($data.token) {
  Write-Host "✅ Login OK - Token gerado"
  $token = $data.token
} else {
  Write-Host "❌ Login falhou"
  Exit
}
```

### Passo 5: Testar Criação de Instância
```powershell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  name = "test-qr-instance"
  adapter = "baileys"
} | ConvertTo-Json

$result = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -UseBasicParsing

$instance = $result.Content | ConvertFrom-Json
if ($instance.id -or $instance.qrCode) {
  Write-Host "✅ Instância criada: $($instance.id)"
  Write-Host "✅ QR Code gerado: $($instance.qrCode -ne $null)"
} else {
  Write-Host "❌ Falha ao criar instância"
  Write-Host $result.Content
  Exit
}
```

### Passo 6: Verificar Frontend consegue ver QR Code
- [ ] Abrir http://localhost:8080 no navegador
- [ ] Fazer login com admin@gmail.com / vip2026
- [ ] Clicar em "Nova Instância"
- [ ] DEVE aparecer QR code para escanear com WhatsApp
- [ ] Se não aparecer, EXAMINAR console do navegador (F12)

---

## ARQUIVOS CRÍTICOS A VERIFICAR

### Backend - WhatsApp Service
```
backend/src/services/whatsappService.ts
- Método: createInstance()
- Método: generateQRCode()
- Emissão: socket.emit('qr', qrData)
```

### Backend - Baileys Adapter  
```
backend/src/adapters/BaileysAdapter.ts
- Função: initialize()
- Handler: connection.update
- Handler: qr event
- Configuração de socket
```

### Frontend - Instances Page
```
frontend/src/pages/Instances.tsx
- useEffect para WebSocket listener
- Handler: 'qr' event
- State para armazenar QR code
- Componente para renderizar QR code
```

### Backend - Server WebSocket
```
backend/src/server.ts
- Socket.IO initialization
- Auth middleware
- Event handlers setup
```

---

## CHECKLIST DE DEBUG

### Logs a procurar no Backend:
- [ ] "WhatsAppService inicializado"
- [ ] "BaileysAdapter [instance-id] inicializado"
- [ ] "QR Code gerado para" 
- [ ] Nenhum erro de WebSocket/Socket.IO
- [ ] Nenhum erro de conexão Baileys

### Logs a procurar no Frontend:
- [ ] "Instâncias carregadas"
- [ ] WebSocket conectado
- [ ] Evento 'qr' recebido
- [ ] QR code renderizado no UI
- [ ] Nenhum erro de CORS

### Portas e Processos:
- [ ] Port 3001 está em use (backend)
- [ ] Port 8080 está em use (frontend)
- [ ] Apenas 2 processos Node.js rodando (backend + frontend)
- [ ] Nenhum processo orfão ou pendurado

---

## CONDIÇÃO PARA CONCLUSÃO

✅ **NÃO concluir até que**:
1. Frontend abra em http://localhost:8080 sem erros
2. Login funcione com JWT válido
3. Ao criar nova instância, QR code apareça na tela
4. QR code seja escaneável com WhatsApp real
5. Instância conecte ao WhatsApp com sucesso
6. Console do navegador (F12) e logs backend sem erros críticos

❌ **Se falhar em qualquer ponto**:
- Parar o processo
- Debugar o erro específico
- Corrigir código se necessário
- Fazer build completo
- Reiniciar tudo
- Testar novamente
- Repetir até funcionar

---

## COMANDOS RÁPIDOS DEBUG

```powershell
# Terminal 1 - Ver logs backend em tempo real
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
npm start 2>&1 | Tee-Object backend.log

# Terminal 2 - Monitorar instâncias criadas
curl http://localhost:3001/api/instances -H "Authorization: Bearer YOUR_TOKEN"

# Terminal 3 - Ver eventos WebSocket
# (Abrir DevTools no navegador e monitorar Network > WS)

# Terminal 4 - Limpar tudo se travar
Get-Process -Name node | Stop-Process -Force
taskkill /F /IM npm.cmd 2>$null
```

---

## RESULTADO ESPERADO

### Terminal Backend (npm start):
```
✅ WhatsAppService inicializado com adaptador: BaileysAdapter
✅ Queue event listeners configured
✅ Server running on http://0.0.0.0:3001
✅ BaileysAdapter [instance-1] initialized
✅ QR Code gerado para instância test-instance
```

### Frontend (navegador):
```
✅ Login page acessível
✅ Após login, lista de instâncias
✅ Botão "Nova Instância" funciona
✅ QR code aparece em modal/card
✅ QR code é escaneável
```

### Sem erros em lugar nenhum:
```
✅ Console do navegador limpo (F12)
✅ Logs backend sem "ERROR" ou "❌"
✅ WebSocket conectado
✅ Nenhuma requisição com status 4xx ou 5xx
```

---

## SUCESSO ✅
Quando TODOS os critérios acima forem atendidos, o problema está resolvido.
Caso contrário, continue debugando usando os guias acima.
