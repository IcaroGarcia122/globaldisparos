# Mapa de Localização: Erro "Instância não está conectada"

## 📍 DISTRIBUIÇÃO DE ERROS NO CODEBASE

### 1. **BaileysAdapter.ts** - 3 Erros Diretos + Métodos de Validação

```
backend/src/adapters/BaileysAdapter.ts
│
├─ Linhas 50-250: connect() method
│  └─ Inicializa WebSocket e armazena em this.connections ✅
│
├─ Linhas 260-300: disconnect() method
│  └─ Remove de memória e banco ✅
│
├─ Linhas 320-340: sendMessage() method ❌ ERRO 1
│  │
│  ├─ const connection = this.connections.get(instanceId);
│  ├─ if (!connection) {
│  └─ throw new Error('Instância não está conectada');
│
├─ Linhas 345-365: getGroups() method ❌ ERRO 2
│  │
│  ├─ const connection = this.connections.get(instanceId);
│  ├─ if (!connection) {
│  └─ throw new Error('Instância não está conectada');
│
├─ Linhas 370-385: getGroupParticipants() method ❌ ERRO 3
│  │
│  ├─ const connection = this.connections.get(instanceId);
│  ├─ if (!connection) {
│  └─ throw new Error('Instância não está conectada');
│
├─ Linhas 392-398: isConnected() method
│  │
│  └─ return this.connections.has(instanceId);
│     └─ Simples, apenas verifica memória ✅
│
├─ Linhas 400-432: isConnectedOrStored() method ⚠️ SUB-ÓTIMO
│  │
│  ├─ Se em memória → return true ✅
│  ├─ Se não em memória:
│  │  ├─ Busca no banco
│  │  ├─ Checa isActive flag
│  │  └─ Retorna instance.status === 'connected' ⚠️ PROBLEMA
│  │      (Não valida se socket realmente ativo)
│  │
│  └─ IMPACTO: Pode retornar TRUE quando deveria FALSE
│
├─ Linhas 453-500: reconnectAllInstances() method
│  │
│  └─ Executa ao iniciar servidor
│     ├─ Procura status='disconnected' + phoneNumber != null
│     ├─ Chama this.connect() para cada
│     └─ Se falha, apenas loga (sem retry)
│
└─ Linhas 505-525: removeConnection() method
   └─ Remove da memória quando instância é deletada ✅
```

---

### 2. **baileysService.ts** - Código Duplicado (3 Erros Idênticos)

```
backend/src/services/baileysService.ts
│
├─ AVISO: Este arquivo duplica BaileysAdapter
│  └─ Mesma lógica, mesmo código
│  └─ Resultado: Erros repetidos
│
├─ Linhas 300-320: sendMessage() method ❌ ERRO 1 (DUPLICADO)
│  └─ throw new Error('Instância não está conectada');
│
├─ Linhas 325-345: getGroups() method ❌ ERRO 2 (DUPLICADO)
│  └─ throw new Error('Instância não está conectada');
│
└─ Linhas 350-370: getGroupParticipants() method ❌ ERRO 3 (DUPLICADO)
   └─ throw new Error('Instância não está conectada');
```

**⚠️ PROBLEMA:** Duas implementações simultâneas
- Difícil manter sincronizadas
- Mudança em uma não propaga
- Confusão qual usar em qual contexto

---

### 3. **WhatsAppService.ts** - Wrapper/Proxy

```
backend/src/adapters/WhatsAppService.ts
│
├─ Linhas 10-15: constructor
│  └─ Inicia com adapter (BaileysAdapter ou EvolutionAdapter)
│
├─ Linhas 21-22: connect()
│  └─ delegate → this.adapter.connect()
│
├─ Linhas 70-71: isConnected()
│  └─ delegate → this.adapter.isConnected()
│
├─ Linhas 77-78: isConnectedOrStored()
│  └─ delegate → this.adapter.isConnectedOrStored()
│  └─ ⚠️ Mesmo problema do adapter
│
└─ Linhas 99-107: reconnectAllInstances()
   └─ delegate → this.adapter.reconnectAllInstances()
```

**Função:** Abstração para suportar múltiplos adapters
- BaileysAdapter (atual)
- EvolutionAdapter (alternativa)

---

### 4. **campaignService.ts** - Validações Duplas

```
backend/src/services/campaignService.ts
│
├─ Linha 138-141: startCampaign() - VALIDAÇÃO 1
│  │
│  ├─ const isConnected = await
│  │ whatsappService.isConnectedOrStored(campaign.instanceId);
│  │
│  ├─ if (!isConnected) {
│  │  throw new Error('Instância WhatsApp não está conectada...');
│  │ }
│  │
│  └─ ⚠️ PROBLEMA: isConnectedOrStored() é otimista
│
├─ Linhas 175-235: processCampaign() (executado em background)
│  │
│  ├─ ┌─── VALIDAÇÃO 2 (Linha 226) ──┐
│  │ │                               │
│  │ │ if (instance.status !==       │
│  │ │     'connected') {            │
│  │ │   logger.error(               │
│  │ │     '❌ Instância não está    │
│  │ │     conectada...'             │
│  │ │   );                          │
│  │ │   return; // STOP silenciosamente
│  │ │ }                             │
│  │ │                               │
│  │ │ ✅ Mais rigorosa              │
│  │ └───────────────────────────────┘
│  │
│  └─ Linhas 280-320: Envio de mensagens
│     └─ Chama whatsappService.sendMessage()
│        └─ ❌ Pode falhar com erro aqui
```

**FLUXO:**
1. `startCampaign()`: Valida com `isConnectedOrStored()` (otimista)
2. `processCampaign()`: Valida novamente com status (rigorosa)
3. `sendMessage()`: Tenta usar, erro se memória vazia

**PROBLEMA:** Duas validações, inconsistência entre elas

---

### 5. **routes/campaigns.ts** - Endpoint

```
backend/src/routes/campaigns.ts
│
├─ Linhas 25-32: POST /campaigns
│  └─ Cria campanha (sem validação de instance)
│
├─ Linhas 34-40: POST /campaigns/:id/start
│  │
│  └─ await campaignService.startCampaign(req.params.id)
│     └─ Propagates error se isConnectedOrStored() falha
│
└─ Linhas 42-48: POST /campaigns/:id/pause
   └─ Pausa campanha

**HTTP Responses:**
├─ 201 Created: Campanha criada
├─ 500 Internal: startCampaign falha
│  └─ Retorna error.message ao cliente
└─ Outras...
```

---

### 6. **routes/instances.ts** - Creação/Conexão

```
backend/src/routes/instances.ts
│
├─ Linhas 8-37: POST /instances (criar)
│  │
│  └─ WhatsAppInstance.create({
│     status: 'disconnected',
│     isActive: true
│  })
│
├─ Linhas 39-60: GET /instances (listar)
│  └─ Filtra por userId + isActive
│
├─ Linhas 62-68: GET /instances/:id/qr
│  └─ whatsappService.getQRCode(instanceId)
│
├─ Linhas 70-77: POST /instances/:id/connect
│  │
│  └─ await whatsappService.connect(instanceId)
│     └─ Inicia WebSocket connection
│
├─ Linhas 79-95: POST /instances/cleanup/inactive
│  └─ Delete hard de instâncias inativas
│
└─ Linhas 97-167: DELETE /instances/:id
   │
   ├─ await whatsappService.removeConnection(instanceId)
   ├─ await whatsappService.disconnect(instanceId)
   └─ instance.update({ isActive: false }) // Soft delete
```

---

### 7. **server.ts** - Inicialização

```
backend/src/server.ts
│
├─ Linhas 115-140: resetStaleConnections()
│  │
│  ├─ Procura: status='connected' + isActive=true
│  ├─ Update: status → 'disconnected'
│  └─ ✅ Reseta instâncias "fantasma" após restart
│
├─ Linhas 143-150: startServer()
│  │
│  ├─ await testConnection() // BD
│  ├─ await syncDatabase()   // Models
│  ├─ await resetStaleConnections() // Cleanup
│  ├─ await whatsappService.reconnectAllInstances() // Reconectar
│  │  └─ ⚠️ Se falha, apenas warning, não retry
│  │
│  └─ server.listen() // Start HTTP
│
└─ Linhas 157-172: Error handlers
   ├─ process.on('unhandledRejection')
   └─ process.on('uncaughtException')
```

**TIMELINE:**
1. Server inicia
2. Reset stale connections ✅
3. Tenta reconectar instâncias (pode FALHAR silenciosamente) ⚠️
4. Server fica rodando mesmo se reconexão falhou

---

### 8. **WhatsAppInstance Model** - Estado da Instância

```
backend/src/models/WhatsAppInstance.ts
│
├─ Campos críticos para verificação:
│  │
│  ├─ status: 'disconnected' | 'connecting' | 'connected' | 'banned'
│  │  └─ Usado por: isConnectedOrStored(), processCampaign()
│  │
│  ├─ isActive: boolean (default: true)
│  │  └─ false = soft deleted
│  │  └─ Bloqueia: isConnectedOrStored(), operações
│  │
│  ├─ phoneNumber: string | null
│  │  └─ null = Nunca conectou
│  │  └─ != null = Já foi conectado (usado para reconectar)
│  │
│  ├─ connectedAt: Date | null
│  │  └─ Último momento de conexão bem-sucedida
│  │  └─ Poderia ser usado para timeout automático (não está)
│  │
│  └─ qrCode: string | null (DATA URL)
│     └─ Armazenado aqui para cliente buscar via API
│
└─ Problema: Sem timestamp de "última atividade confirmada"
   └─ Não há como saber se socket ainda está ativo
```

---

## 🔴 MAPA DE RISCO: Funções que Podem Falhar

```
┌─────────────────────────────────────────────────────────────┐
│ STACK TRACE TÍPICO DO ERRO                                  │
└─────────────────────────────────────────────────────────────┘

1️⃣  campaignService.startCampaign(campaignId)
    ↓
    isConnectedOrStored() → TRUE ⚠️ (banco diz ok)
    ↓
2️⃣  setImmediate(() => processCampaign())
    ↓
3️⃣  campaignService.processCampaign(campaignId)
    ↓
    findByPk() → instance.status === 'connected' ? ⚠️
    ↓
4️⃣  for (message of messages) {
        whatsappService.sendMessage()
    }
    ↓
5️⃣  BaileysAdapter.sendMessage(instanceId)
    ↓
    const connection = this.connections.get(instanceId)
    if (!connection) {
        throw new Error('Instância não está conectada') ❌ CRASH
    }

RESULTADO: Campanha silenciosamente falha, user não vê erro
          (só aparece em logs backend se backend está observando)
```

---

## 📊 MATRIZ: Qual Função Checa O Quê

```
┌──────────────────────────┬────────┬────────┬────────┬──────────┐
│ Função                   │ Memory │ Bank   │ Socket │ Valid?   │
├──────────────────────────┼────────┼────────┼────────┼──────────┤
│ isConnected()            │ ✅     │ ❌     │ ❌     │ Unsafe   │
│ isConnectedOrStored()     │ ✅     │ ✅     │ ❌     │ Partial  │
│ sendMessage()            │ ✅     │ ❌     │ ❌     │ Unsafe   │
│ getGroups()              │ ✅     │ ❌     │ ❌     │ Unsafe   │
│ getGroupParticipants()   │ ✅     │ ❌     │ ❌     │ Unsafe   │
│ processCampaign()        │ ❌     │ ✅     │ ❌     │ Partial  │
│ startCampaign()          │ ❌     │ ✅     │ ❌     │ Partial  │
└──────────────────────────┴────────┴────────┴────────┴──────────┘

LEGENDA:
✅ = Checa
❌ = Não checa
```

---

## 🎯 PONTOS DE FALHA

### **Ponto 1: isConnectedOrStored() Otimista**
```
Status: 🔴 CRÍTICO
Arquivo: BaileysAdapter.ts:400-432
Problema: Retorna TRUE se banco diz 'connected'
          Mas não valida se socket realmente ativo
Impacto: ALTO - Faz todo código downstream falhar
```

### **Ponto 2: reconnectAllInstances() Sem Retry**
```
Status: 🔴 CRÍTICO
Arquivo: BaileysAdapter.ts:453-500
Problema: Se reconexão falha, não tenta novamente
          Só executa no server startup
Impacto: ALTO - Instâncias ficam "presas" offline
```

### **Ponto 3: Sem Heartbeat/Ping**
```
Status: 🟡 ALTO
Problema: Nenhum mecanismo para detectar socket morto
          Banco pode ficar desatualizado
Impacto: ALTO - Detecta erro só quando tenta usar
```

### **Ponto 4: Código Duplicado**
```
Status: 🟡 MÉDIO
Arquivo: baileysService.ts vs BaileysAdapter.ts
Problema: Mesma lógica em dois lugares
Impacto: MÉDIO - Difícil manter sincronizado
```

### **Ponto 5: Erro Silencioso em Campanha**
```
Status: 🟡 MÉDIO
Arquivo: campaignService.ts:processCampaign()
Problema: Se falha, apenas retorna, não notifica user
          Status atualizado para 'completed' mesmo com erro
Impacto: MÉDIO - User pensa que funcionou mas não funcionou
```

---

## 🧭 NAVEGAÇÃO RÁPIDA PELO CODEBASE

**Para Entender Problema:**
1. Start: `backend/src/adapters/BaileysAdapter.ts:400` (isConnectedOrStored)
2. Then: `backend/src/adapters/BaileysAdapter.ts:325` (sendMessage)
3. Compare: `backend/src/services/campaignService.ts:138` (startCampaign)

**Para Debugar:**
1. Check: `backend/src/models/WhatsAppInstance.ts` (Model definition)
2. Trace: `backend/src/server.ts:143` (Server init)
3. Monitor: logs em `logger.error()` com "Instância não está conectada"

**Para Fixar:**
1. Edit: `BaileysAdapter.isConnectedOrStored()` → mais rigorosa
2. Edit: `BaileysAdapter.reconnectAllInstances()` → com retry
3. Remove: `baileysService.ts` ou sync com adapter
4. Add: Heartbeat/ping mechanism

---

## 📈 Resumo Visual

```
┌──────────────────────────────────────────────────┐
│ VALIDAÇÃO (Otimista)                             │
│ ↓                                                │
│ isConnectedOrStored() = TRUE                     │
│ (Banco diz 'connected', memória pode estar vazia)│
├──────────────────────────────────────────────────┤
│ EXECUÇÃO (Rigorosa)                              │
│ ↓                                                │
│ sendMessage() tenta acessar this.connections     │
│ ✅ OK se em memória                              │
│ ❌ ERRO se memória vazia                         │
└──────────────────────────────────────────────────┘

RESULTADO: Mismatch → Erro "Instância não está conectada"
```
