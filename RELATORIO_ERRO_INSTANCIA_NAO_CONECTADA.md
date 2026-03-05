# Relatório de Análise: Erro "Instância não está conectada"

## 📋 Sumário Executivo

O erro **"Instância não está conectada"** é disparado quando código tenta usar uma instância do WhatsApp que não existe em **memória** (conexão WebSocket ativa). O projeto possui uma validação em múltiplos pontos que falha quando a instância não está em `this.connections` (Map em memória).

---

## 1️⃣ LOCAIS EXATOS ONDE O ERRO É DISPARADO

### **Erro 1: BaileysAdapter.ts - Envio de Mensagens**
- **Arquivo:** `backend/src/adapters/BaileysAdapter.ts` (linha 325)
- **Método:** `sendMessage()`
- **Código:**
```typescript
public async sendMessage(instanceId: string, phoneNumber: string, message: string): Promise<any> {
  const connection = this.connections.get(instanceId);
  if (!connection) {
    throw new Error('Instância não está conectada');  // ❌ ERRO AQUI
  }
  // ... envia mensagem
}
```

### **Erro 2: BaileysAdapter.ts - Obter Grupos**
- **Arquivo:** `backend/src/adapters/BaileysAdapter.ts` (linha 349)
- **Método:** `getGroups()`
- **Código:**
```typescript
public async getGroups(instanceId: string): Promise<any[]> {
  const connection = this.connections.get(instanceId);
  if (!connection) {
    throw new Error('Instância não está conectada');  // ❌ ERRO AQUI
  }
  // ... busca grupos
}
```

### **Erro 3: BaileysAdapter.ts - Obter Participantes**
- **Arquivo:** `backend/src/adapters/BaileysAdapter.ts` (linha 374)
- **Método:** `getGroupParticipants()`
- **Código:**
```typescript
public async getGroupParticipants(instanceId: string, groupId: string): Promise<any[]> {
  const connection = this.connections.get(instanceId);
  if (!connection) {
    throw new Error('Instância não está conectada');  // ❌ ERRO AQUI
  }
  // ... busca participantes
}
```

### **Erro 4: baileysService.ts - Métodos Duplicados**
- **Arquivo:** `backend/src/services/baileysService.ts` (linhas 307, 331, 356)
- **Métodos:** `sendMessage()`, `getGroups()`, `getGroupParticipants()`
- **Problema:** Mesmo erro replicado em serviço separado

### **Log de Erro: campaignService.ts**
- **Arquivo:** `backend/src/services/campaignService.ts` (linha 226)
- **Contexto:** Durante processamento de campanha
- **Log:** `logger.error('❌ Instância não está conectada. Status: ${instance.status}')`

---

## 2️⃣ CONTEXTOS ONDE O ERRO APARECE

### ✅ **Contexto 1: Envio de Mensagens em Campanha**
**Fluxo:** User → API `/api/campaigns/:id/start` → `campaignService.startCampaign()` → `campaignService.processCampaign()`

**O que acontece:**
1. Campanha inicia, checa `isConnectedOrStored()`
2. Se retorna `true`, tenta enviar mensagens
3. Chama `whatsappService.sendMessage()` que verifica `this.connections.get(instanceId)`
4. Se instância não está em memória → **ERRO**

**Problema:**
```
isConnectedOrStored() pode retornar TRUE (banco tem status='connected')
MAS
isConnected() retorna FALSE (conexão não em memória)
```

### ✅ **Contexto 2: Obter Grupos**
**Fluxo:** User → API `/api/groups` → `whatsappService.getGroups()`

**Problema:** Método tenta acessar `this.connections.get(instanceId)` mas instância pode estar:
- No banco de dados como `'connected'`
- Mas não em memória (servidor reiniciou, conexão perdida)

### ✅ **Contexto 3: Validações Antes de Operações**
**Arquivo:** `backend/src/routes/campaigns.ts` → `campaignService.startCampaign()`

**Validação:**
```typescript
const isConnected = await whatsappService.isConnectedOrStored(campaign.instanceId);
if (!isConnected) {
  throw new Error('Instância WhatsApp não está conectada. Por favor, escaneie o QR code primeiro.');
}
```

---

## 3️⃣ FLUXO ESPERADO vs FLUXO REAL

### 🎯 **FLUXO ESPERADO** (Cenário Ideal)

```
1. User cria instância
   ↓
2. POST /api/instances → WhatsAppInstance criada no banco (status='disconnected')
   ↓
3. User clica "Conectar"
   ↓
4. POST /api/instances/:id/connect → whatsappService.connect()
   ↓
5. BaileysAdapter.connect() → Cria WebSocket, armazena em this.connections
   ↓
6. Gera QR Code → User escaneia
   ↓
7. WhatsApp confirma conexão → Status = 'connected' (banco + memória)
   ↓
8. User can iniciar campanha
   ↓
9. isConnectedOrStored() = TRUE ✅
   isConnected() = TRUE ✅
   → Mensagens enviadas com sucesso
```

### 🚨 **FLUXO REAL** (Com Problema)

#### **Problema A: Servidor Reinicia**
```
1. Instância estava conectada (status='connected' no banco)
   ↓
2. Servidor sofre RESTART → Todas as conexões em memória são perdidas
   ↓
3. resetStaleConnections() executa:
   - Procura instâncias com status='connected'
   - Reseta para status='disconnected'
   ✅ Correto
   ↓
4. reconnectAllInstances() intenta reconectar
   - Procura instâncias com phoneNumber != null E status='disconnected'
   - Chama this.connect() para cada uma
   ✅ Tenta reconectar
   ↓
5. MAS se reconexão FALHA silenciosamente:
   - Banco fica com status='disconnected'
   - Memória vazia (nenhuma conexão)
   - isConnectedOrStored() = FALSE ✅ (correto)
   ↓
6. User não consegue enviar mensagens
```

#### **Problema B: Verificação Inconsistente**
```
1. isConnected() verifica APENAS memória:
   return this.connections.has(instanceId)
   
2. isConnectedOrStored() verifica banco:
   - Se não em memória
   - Procura no banco
   - Retorna instance.status === 'connected'
   
3. DISCREPÂNCIA:
   Banco diz: "status='connected', isActive=true"
   Memória diz: "não tenho essa conexão"
   
   isConnectedOrStored() retorna: TRUE ❌ (banco)
   Mas sendMessage() tenta acessar memória → ERRO
```

#### **Problema C: Validação Dupla**
```
campaignService.processCampaign():

if (instance.status !== 'connected') {
  logger.error('❌ Instância não está conectada');
  await campaign.update({ status: 'completed' });
  return; ✅ PARA AQUI
}

MAS antes disso:

campaignService.startCampaign():
const isConnected = await whatsappService.isConnectedOrStored(campaign.instanceId);
if (!isConnected) {
  throw new Error('Instância WhatsApp não está conectada');
}
```

Então há **DUAS** validações, mas a segunda é menos rigorosa (valida banco, não memória).

---

## 4️⃣ ANÁLISE DO MÉTODO `isConnected()` vs `isConnectedOrStored()`

### **`isConnected()` - Arquivo: BaileysAdapter.ts:392**
```typescript
public isConnected(instanceId: string): boolean {
  // Verifica se está em memória
  return this.connections.has(instanceId);
}
```
- ✅ Rápido (sem consulta ao banco)
- ❌ Retorna FALSE se memória está vazia
- ❌ Não funciona após restart do servidor

### **`isConnectedOrStored()` - Arquivo: BaileysAdapter.ts:400**
```typescript
public async isConnectedOrStored(instanceId: string): Promise<boolean> {
  // Se está em memória, está conectada
  if (this.connections.has(instanceId)) {
    logger.info(`✅ Instância ${instanceId} encontrada em memória - CONECTADA`);
    return true;
  }

  // Se não está em memória, verifica no banco
  try {
    const instance = await WhatsAppInstance.findByPk(instanceId);
    if (!instance) {
      logger.warn(`⚠️ Instância ${instanceId} NÃO encontrada no banco`);
      return false;
    }
    
    // ⚠️ PROBLEMA: Não verifica se conexão está REALMENTE ativa
    if (!instance.isActive) {
      logger.warn(`⚠️ Instância foi deletada (isActive=false)`);
      return false;
    }
    
    // AQUI está o problema: Retorna TRUE baseado APENAS no status do banco
    const isConnected = instance.status === 'connected';
    logger.info(`🔍 Instância ${instanceId} - Status: ${instance.status}, isActive: ${instance.isActive} (conectada: ${isConnected})`);
    return isConnected; // ❌ Pode ser TRUE mas memória está vazia!
  } catch (error) {
    logger.error(`❌ Erro ao verificar instância no banco:`, error);
    return false;
  }
}
```

### 🚨 **CRÍTICO: O Problema Real**

`isConnectedOrStored()` retorna `true` se:
- ✅ Está em memória, OU
- ✅ Banco diz `status='connected'` + `isActive=true`

**MAS** depois que retorna `true`, o código tenta:
```typescript
const connection = this.connections.get(instanceId);
if (!connection) {
  throw new Error('Instância não está conectada'); // BOOM!
}
```

**Não há proteção contra:**
- WebSocket ter caído silenciosamente
- Conexão ter expirado
- Servidor ter reiniciado
- Credenciais terem expirado

---

## 5️⃣ VALIDAÇÕES QUE BLOQUEIAM A INSTÂNCIA

### **Validação 1: isActive Flag**
**Arquivo:** `BaileysAdapter.ts:421`
```typescript
if (!instance.isActive) {
  logger.warn(`⚠️ Instância deletada (isActive=false)`);
  return false;
}
```
- Quando usuário **deleta** uma instância, `isActive=false`
- Bloqueia todas as operações ✅ Correto
- Problema: Pode ficar bloqueado mesmo depois de delete (soft delete)

### **Validação 2: Status = 'connected'**
**Arquivo:** `BaileysAdapter.ts:426`
```typescript
const isConnected = instance.status === 'connected';
```
- Bloqueia operações se status não é 'connected'
- Possíveis valores: `'disconnected' | 'connecting' | 'connected' | 'banned'`
- Problema: Não há timeout para resetar automático

### **Validação 3: Memory Check em Operações**
**Arquivo:** `BaileysAdapter.ts:325`
```typescript
const connection = this.connections.get(instanceId);
if (!connection) {
  throw new Error('Instância não está conectada');
}
```
- Último check, quando tenta fazer operação
- Mais rigoroso que `isConnectedOrStored()`
- Problema: Inconsistência

### **Validação 4: Campaign Status Check**
**Arquivo:** `campaignService.ts:226`
```typescript
if (instance.status !== 'connected') {
  logger.error(`❌ Instância não está conectada. Status: ${instance.status}`);
  await campaign.update({ status: 'completed' });
  return;
}
```
- Verifica status direto do banco
- Mais rigoroso que `isConnectedOrStored()`
- Bloqueia processamento de campanha

---

## 🔴 POSSÍVEIS CAUSAS DO ERRO PERSISTIR

### **Causa 1: Reconexão Automática Falha Silenciosa**
```
reconnectAllInstances() tenta reconectar ao iniciar servidor:
- Procura instâncias com status='disconnected'
- Chama this.connect()
- Se falha, apenas loga erro
- NÃO marca como permanentemente desconectado
```

**Sintoma:** Instância fica em estado "fantasma":
- Banco: `status='disconnected'`
- Memória: vazia
- Nunca reconecta

### **Causa 2: Credenciais Expiradas ou Revogadas**
```
WhatsApp pode revogar credenciais automaticamente:
- Session expirada
- Usuário fez logout no app do celular
- Credenciais corrompidas

BaileysAdapter tenta reconectar:
- Carrega credenciais do arquivo (session/)
- Se expiradas, WebSocket falha
- Socket fecha
- Status = 'disconnected'

Mas usuário não sabe que precisa escanear QR novamente
```

### **Causa 3: Banco Desincronizado da Memória**
```
Server A: Status = 'connected' (em memória)
Server B: Status = 'disconnected' (reiniciou, perdeu conexão)

Requisição chega em Server B:
- Checa banco: 'connected' ✅
- Checa memória: vazio ❌
- isConnectedOrStored() = TRUE
- sendMessage() = ERRO
```

### **Causa 4: Handler de Desconexão Falha**
```
socket.ev.on('connection.update', async (update) => {
  if (connection === 'close') {
    // Tenta atualizar banco
    await instance.update({ status: 'disconnected' });
    // Se falha, banco fica com status='connected'
    // Mas socket já fechou
  }
})
```

### **Causa 5: isConnectedOrStored() é Too Optimistic**
```
Retorna TRUE se banco diz 'connected'
MAS não verifica:
✗ Se socket realmente está aberto
✗ Se há conexão WebSocket ativa
✗ Se credenciais estão válidas
✗ Se WhatsApp ainda aceita o socket
```

---

## 📊 TABELA DE CENÁRIOS

| Cenário | Banco | Memória | isConnected() | isConnectedOrStored() | Result |
|---------|-------|---------|---------------|-----------------------|--------|
| **Normal** | connected | ✅ Socket | TRUE | TRUE | Obras ✅ |
| **Server Reinicia 1** | disconnected | ❌ Vazio | FALSE | FALSE | Falha esperada ✅ |
| **Server Reinicia 2** | connecting | ❌ Vazio | FALSE | FALSE | Esperando QR ✅ |
| **Reconexão Falha** | disconnected | ❌ Vazio | FALSE | FALSE | Ok, do user pov |
| **Bug: Banco Desatualizado** | **connected** | ❌ Vazio | **FALSE** | **TRUE** ❌ | **ERRO** 🚨 |
| **Credenciais Expiradas** | connected | ❌ Vazio | FALSE | **TRUE** ❌ | **ERRO** 🚨 |
| **Socket Caiu** | connected | ❌ Vazio | FALSE | **TRUE** ❌ | **ERRO** 🚨 |

---

## ✅ PROBLEMAS IDENTIFICADOS (5 Total)

### 1. **Inconsistência entre `isConnectedOrStored()` e operações reais**
- `isConnectedOrStored()` retorna TRUE
- Mas `sendMessage()`, `getGroups()`, etc retornam erro
- Mismatch entre validação e execução

### 2. **Falta de verificação de heartbeat**
- Banco pode estar desatualizado
- Conexão WebSocket pode ter caído silenciosamente
- Nenhuma tentativa de ping/verificar se socket está vivo

### 3. **Reconexão automática unreliable**
- `reconnectAllInstances()` executa ao iniciar
- Se falha, nada tenta reconectar depois
- Usuário fica bloqueado até manual reconnect

### 4. **Arquivo multiplicate (BaileysAdapter vs baileysService)**
- Mesmo código em dois lugares
- Duplicação de lógica
- Difícil manter sincronizado

### 5. **Sem cache/persistência de WebSocket**
- Conexões WebSocket são em-memória
- Não sobrevivem restart
- Requer reconexão manual após restart

---

## 🔧 RECOMENDAÇÕES (Priority Order)

### **P0 - CRÍTICO**
1. **Fixar `isConnectedOrStored()` para ser mais rigoroso**
   - Adicionar verificação de heartbeat
   - Tentar ping antes de retornar TRUE

2. **Adicionar retry logic para operações**
   - Se falha com "Instância não está conectada"
   - Tentar reconectar automaticamente
   - Retried operação

### **P1 - ALTO**
3. **Adicionar timeout para reset automático**
   - Se status='connected' mas sem atividade por 24h
   - Reset para 'disconnected'
   - Force reconexão

4. **Consolidar código duplicado**
   - Remove `baileysService.ts` ou use como wrapper
   - Manter apenas `BaileysAdapter.ts`

### **P2 - MÉDIO**
5. **Melhorar logging de desconexão**
   - Log sempre quando socket fecha
   - Log quando reconexão falha
   - Log quando credenciais expiram

6. **Implementar health check endpoint**
   - GET `/api/instances/:id/health`
   - Verifica status real in-memory + banco
   - Retorna mismatch se encontrado

---

## 📝 Conclusão

O erro **"Instância não está conectada"** ocorre por **mismatch entre o estado do banco de dados e o estado da memória**. O método `isConnectedOrStored()` é muito otimista (apenas checa banco) enquanto operações reais são rígidas (requerem memória). Isso cria a situação onde:

```
✅ Validação passa: isConnectedOrStored() = TRUE (banco diz 'connected')
❌ Operação falha: sendMessage() = ERRO (memória vazia)
```

A solução principal é **remover a inconsistência** entre validação e execução.
