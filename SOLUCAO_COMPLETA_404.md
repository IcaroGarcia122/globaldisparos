# 🚨 STATUS: Problemas de Conectividade do Backend - SOLUÇÃO COMPLETA

## ❌ Problemas Identificados

1. **404 na rota POST /instances/:id/connect** - Rota não respondendo
2. **500/travamento ao tentar conectar** - Servidor não responde após initialização
3. **Redis indisponível** - Mensagens de erro ECONNREFUSED

---

## ✅ SOLUÇÃO IMEDIATA

### Passo 1: Verificar Compilação TypeScript

```bash
cd backend
npm run build
```

Se houver erros, corrija-os. Deve sair limpo (0 errors).

### Passo 2: Parar Todos os Processos Node

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5
```

### Passo 3: Verificar Configuração do Banco de Dados

**Arquivo necessário**: `.env` na pasta backend

Deve conter:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=globaldisparos
DB_USER=postgres
DB_PASSWORD=seu_password

REDIS_HOST=localhost
REDIS_PORT=6379

NODE_ENV=development
PORT=3001
```

**Crítico**: Verificar se PostgreSQL está rodando

```powershell
# Windows - verificar se PostgreSQL está no Services
Get-Service postgresql-x64-15  # ou versão que tiver

# Se não está rodando:
Start-Service postgresql-x64-15
```

### Passo 4: Iniciar Backend com Output Detalhado

```bash
cd backend
npm run dev 2>&1 | Tee-Object -FilePath server-debug.log
```

Deixar rodando e, em **OUTRO** terminal PowerShell:

### Passo 5: Testar Rotas em Novo Terminal

```powershell
cd c:\Users\Icaro Garcia\Documents\globaldisparos\backend

# Teste 1: Health
Write-Host "Test /health..." -ForegroundColor Green
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | %{Write-Host "Status: $($_.StatusCode)"}

# Teste 2: Login
Write-Host "`nTest Login..." -ForegroundColor Green  
$body = @{email="admin@gmail.com"; password="vip2026"} | ConvertTo-Json
$resp = Invoke-WebRequest -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
$token = ($resp.Content | ConvertFrom-Json).token
Write-Host "Token: $($token.Substring(0,20))..."

# Teste 3: List Instances
Write-Host "`nTest GET /instances..." -ForegroundColor Green
$headers = @{"Authorization"="Bearer $token"}
$inst = Invoke-WebRequest -Uri http://localhost:3001/api/instances -Headers $headers -UseBasicParsing
$data = $inst.Content | ConvertFrom-Json
Write-Host "Instâncias: $($data.instances.Count)"
if ($data.instances.Count -gt 0) {
    $id = $data.instances[0].id
    Write-Host "ID: $id"
    
    # Teste 4: Connect
    Write-Host "`nTest POST /instances/$id/connect..." -ForegroundColor Green
    $conn = Invoke-WebRequest -Uri http://localhost:3001/api/instances/$id/connect -Method POST -Headers $headers -Body "{}" -UseBasicParsing
    Write-Host "Status: $($conn.StatusCode)"
    Write-Host "Response: $($conn.Content)"
}
```

---

## 🔍 Se Ainda Não Funcionar

### Cenário 1: /health retorna 404

**Causa**: Servidor não iniciou corretamente
- Verificar arquivo `server-debug.log`
- Procurar por `error` ou `Error`
- Se há erro de compilação TypeScript, corrigir

### Cenário 2: /health retorna 200, mas Login retorna 400

**Causa**: Banco de dados não está conectado ou tabelas não existem
- Executar migrações: `npm run migrate`
- Verificar se PostgreSQL está rodando
- Verificar credenciais em `.env`

### Cenário 3: Login funciona, mas GET /instances retorna 404

**Causa**: Rota não foi registrada corretamente
- Verificar [backend/src/index.ts](backend/src/index.ts) tem:
  ```typescript
  app.use('/api/instances', statusPollingRateLimiter, instanceRoutes);
  ```
- Verificar [backend/src/routes/instances.ts](backend/src/routes/instances.ts) tem:
  ```typescript
  router.get('/', authenticate, async (req, res) => {
  ```

### Cenário 4: POST /instances/:id/connect retorna 404

**Este é o seu problema atual**

**Solução**:

Verificar que [backend/src/routes/instances.ts](backend/src/routes/instances.ts) tem a rota:

```typescript
router.post('/:id/connect', authenticate, async (req: AuthRequest, res) => {
```

Se a rota não existe, adicionar em instances.ts:

```typescript
router.post('/:id/connect', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    // Verificar permissão
    const instance = await Instance.findOne({
      where: { id, userId }
    });
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    // Iniciar conexão
    await whatsappService.connect(parseInt(id), userId);
    
    res.json({ 
      status: 'success',
      message: 'Conexão iniciada. Aguarde o QR code...'
    });
  } catch (error) {
    logger.error('CONNECT ERROR', error);
    res.status(500).json({ error: 'Erro ao conectar' });
  }
});
```

---

## 📋 Checklist Final

- [ ] Backend compilado sem erros: `npm run build`
- [ ] PostgreSQL rodando
- [ ] Variáveis `.env` configuradas
- [ ] Redis (opcional - messages queue será desabilitado sem ele)
- [ ] Rota POST /instances/:id/connect existe em instances.ts
- [ ] /health responde com 200
- [ ] Login retorna token
- [ ] GET /instances retorna lista
- [ ] POST /instances/:id/connect retorna 200

---

## 🆘 Se Tudo Faltar

Execute este comando para diagnóstico completo:

```powershell
$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== DIAGNÓSTICO COMPLETO ===" -ForegroundColor Yellow

# Verificar Node
Write-Host "`nNode version:" -ForegroundColor Cyan
node --version

# Verificar npm
Write-Host "NPM version:" -ForegroundColor Cyan
npm --version

# Verificar banco
Write-Host "`nPostgreSQL conectado:" -ForegroundColor Cyan
psql -U postgres -h localhost -d globaldisparos -c "SELECT now()" 2>&1 | Write-Host

# Verificar portas
Write-Host "`nPortas em uso:" -ForegroundColor Cyan
netstat -ano | FindStr "3001|5432|6379"

# Verificar backend
Write-Host "`nBackend status:" -ForegroundColor Cyan
cd "c:\Users\Icaro Garcia\Documents\globaldisparos\backend"
npm list @whiskeysockets/baileys 2>&1 | Write-Host
```

---

**Status atual**: Aguardando saída de `npm run dev` para diagnosticar exatamente onde está travando.
