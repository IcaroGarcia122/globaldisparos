## 🔧 DIAGNÓSTICO DE PROBLEMAS - BACKEND NÃO RESPONDE

Se você está vendo timeouts nos testes, este guia vai ajudar! ⚡

---

## 🚨 Sintoma
```
❌ [1/7] Health Check...
Falha ao conectar ao backend: Timeout...
```

---

## 🔍 Diagnóstico 1: Verifique se Backend está REALMENTE Rodando

### Windows PowerShell:
```powershell
# Ver todos os processos Node
Get-Process node | Format-Table Id, ProcessName, Memory, CPU

# Ver porta 3001 específica
netstat -ano | findstr ":3001"
```

**Esperado:**
```
TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       12345
```

Se nada aparecer → **Backend NÃO está rodando!** ❌

---

## ⚙️ Solução 1: Reiniciar Backend

### Passo 1: Matar todos os processos Node
```powershell
Get-Process node | Stop-Process -Force
```

### Passo 2: Limpar portas
```powershell
# Liberar porta 3001
[System.Diagnostics.Process]::Start('cmd.exe', '/c netstat -ano | findstr :3001')
```

### Passo 3: Ir ao Backend e Reiniciar
```powershell
cd C:\Users\Icaro\Documents\globaldisparos\backend
npm run dev
```

**O que procurar:**
```
✅ ts-node-dev watching...
✅ Listening on port 3001
✅ Socket.IO injected into WhatsApp service
✅ Connected to PostgreSQL (ou mock)
```

Se vir erros → **Vá para Solução 2** ↓

---

## 🛠️ Solução 2: Backend Rodando mas Lento

Se `netstat` mostra porta LISTENING mas testes dão timeout:

### Causa Comum: PostgreSQL Lento
Backend espera o banco conectar. Pode levar 3+ segundos.

### Fix Rápido: Aumentar Timeout

Editar `run-simple-tests.js`:

```javascript
// Linha ~20, procure por:
const timeout = 3000;  // ← CHANGE THIS

// Para:
const timeout = 10000;  // 10 segundos
```

Ou executar com timeout maior:
```bash
timeout /t 5 && node run-simple-tests.js
```

---

## 🗄️ Solução 3: Banco de Dados Problema

### Verificar se PostgreSQL está rodando

```powershell
# Ver todos containers (se usar Docker)
docker ps

# Ou procurar por postgres processo
Get-Process | Where {$_.ProcessName -like "*post*"}
```

**Se não está rodando:**

#### Opção A: Usar SQLite em vez de PostgreSQL
Editar `backend/.env`:
```env
# Mudar de (PostgreSQL):
DATABASE_URL=postgres://user:pass@localhost/db

# Para (SQLite):
DATABASE_URL=file:./db.sqlite
```

Depois reiniciar backend.

#### Opção B: Iniciar PostgreSQL Docker
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=123456 \
  postgres:15
```

---

## 📡 Solução 4: Verificar Conectividade Manual

### Teste direto ao backend

Abra PowerShell e teste:

```powershell
# Teste 1: Conecção básica
$response = Invoke-WebRequest `
  -Uri "http://127.0.0.1:3001/health" `
  -TimeoutSec 5 `
  -ErrorAction Ignore

if ($response.StatusCode -eq 200) {
  Write-Host "✅ Backend respondendo!"
} else {
  Write-Host "❌ Backend não respondeu"
}
```

**Se mesmo assim falhar:**

```powershell
# Teste 2: Conecção TCP (nível mais baixo)
$tcp = New-Object System.Net.Sockets.TcpClient
try {
  $tcp.Connect("127.0.0.1", 3001)
  Write-Host "✅ Porta 3001 conectando..."
  $tcp.Close()
} catch {
  Write-Host "❌ Não consegue conectar na porta"
}
```

**Resultado:**
- ✅ TCP conecta, HTTP não → **Problema no express/app**
- ❌ TCP não conecta → **Porta não está ouvindo**

---

## 🔴 Solução 5: Erro Crítico no Backend

Se vir erro no terminal do backend:

### Erro: "EADDRINUSE" (Porta em uso)
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Fix:**
```powershell
Get-Process node | Stop-Process -Force
Start-Sleep -Seconds 2
# Agora reinicie backend
```

### Erro: "connection refused" (PostgreSQL não conecta)
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix:**
1. Inicie PostgreSQL (Docker: `docker run ... postgres:15`)
2. Ou mude para SQLite (editar `.env`)
3. Reinicie backend

### Erro: "Cannot find module" (npm não instalou)
```
Error: Cannot find module 'express'
```

**Fix:**
```powershell
cd backend
npm install
npm run dev
```

---

## 🎯 Checklist de Diagnóstico

Execute na ordem:

- [ ] **1. Backend rodando?**
  ```bash
  netstat -ano | findstr ":3001"
  ```
  - ✅ LISTENING → Continue
  - ❌ Não aparece → Reinicie backend

- [ ] **2. Porta responde?**
  ```bash
  curl http://127.0.0.1:3001/health
  ```
  - ✅ Retorna JSON → Continue
  - ❌ Timeout → Aumente timeout ou verifique PostgreSQL

- [ ] **3. Frontend rodando?**
  ```bash
  netstat -ano | findstr ":5173"
  ```
  - ✅ LISTENING → Continue
  - ❌ Não aparece → Reinicie frontend

- [ ] **4. Ambos conectam?**
  ```bash
  node run-simple-tests.js
  ```
  - ✅ 5+ testes passam → Sistema OK! ✨
  - ❌ Falha → Revise logs acima

---

## 🚀 RESET COMPLETO (Nuclear Option)

Se nada funcionar:

```powershell
# 1. Matar tudo
Get-Process node | Stop-Process -Force
Get-Process npm | Stop-Process -Force

# 2. Limpar cache node
cd C:\Users\Icaro\Documents\globaldisparos\backend
Remove-Item node_modules -Recurse -Force
npm cache clean --force

# 3. Reinstalar
npm install

# 4. Limpar build
npm run build -- --reset (se existir)

# 5. Reiniciar
npm run dev
```

aguarde 5-10 segundos para backend inicializar.

---

## 📊 Debug Avançado

### Ver logs detalhados do backend

Editar `backend/src/server.ts` e adicionar:

```typescript
// No início do arquivo
const DEBUG = process.env.DEBUG === 'true';

// Em vários pontos
if (DEBUG) {
  console.log('[DEBUG]', 'Conectando ao banco...');
  console.log('[DEBUG]', 'Socket.IO ready');
  console.log('[DEBUG]', 'Rota /health registrada');
}
```

Depois executar:
```bash
DEBUG=true npm run dev
```

---

## 🎯 Teste Rápido Após Fix

Após aplicar uma solução:

```bash
# Teste minimalista
curl -X GET http://127.0.0.1:3001/health

# Deve retornar (em segundos):
# {"status":"ok","uptime":1.234}
```

Se retornar em menos de 1 segundo → ✅ **Pronto!**

---

## 📞 Se Ainda Não Funciona

1. Abra novo terminal PowerShell
2. Execute:
```powershell
# Coletar info
Write-Host "=== BACKEND STATUS ===" 
Get-Process node | Format-Table Id, ProcessName, Memory
Write-Host "`n=== PORTAS ===" 
netstat -ano | findstr ":3001" 
Write-Host "`n=== LOGS BACKEND ===" 
# (Copie os últimos 20 linhas do terminal do backend aqui)
```
3. Consulte: **[README_RAPIDO.md](README_RAPIDO.md#troubleshooting)**

---

## ✨ Quando Tiver Sucesso

```bash
# Teste simples
node run-simple-tests.js

# Esperado:
# ✅ [1/7] Health Check... OK
# ✅ [2/7] Login Test... OK
# ✅ [3/7] List Instances... OK
# ✅ Todos os testes passaram!
```

Parabéns! Sistema está pronto! 🎉

