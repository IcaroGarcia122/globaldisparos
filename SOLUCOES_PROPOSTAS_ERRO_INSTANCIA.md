# Guia de Soluções: Fixar "Instância não está conectada"

## 🚀 PLANO DE AÇÃO

### **Priority P0 - CRÍTICO (Fix Primeiro)**

#### **1. Sincronizar isConnectedOrStored() com sendMessage()**

**Problema:**
- `isConnectedOrStored()` retorna TRUE se banco diz 'connected'
- `sendMessage()` requer socket em memória
- Mismatch causa erro

**Solução:**
Fazer `isConnectedOrStored()` verificar memória + banco, não apenas banco.

**Arquivo:** `backend/src/adapters/BaileysAdapter.ts` - Linhas 400-432

**Código Atual (PROBLEMA):**
```typescript
public async isConnectedOrStored(instanceId: string): Promise<boolean> {
  if (this.connections.has(instanceId)) {
    return true; // Em memória ✅
  }

  // Se não em memória, checa banco ⚠️ PROBLEMA
  const instance = await WhatsAppInstance.findByPk(instanceId);
  if (!instance) return false;
  if (!instance.isActive) return false;
  
  // ❌ Retorna TRUE só pelo banco, não valida se socket ativo
  const isConnected = instance.status === 'connected';
  return isConnected;
}
```

**Código Proposto (SOLUÇÃO):**
```typescript
public async isConnectedOrStored(instanceId: string): Promise<boolean> {
  // Step 1: Check MEMORY (fastest, most reliable)
  if (this.connections.has(instanceId)) {
    logger.info(`✅ Instância ${instanceId} encontrada em memória - CONECTADA`);
    return true;
  }

  // Step 2: Check DATABASE (fallback)
  try {
    const instance = await WhatsAppInstance.findByPk(instanceId);
    if (!instance) {
      logger.warn(`⚠️ Instância ${instanceId} NÃO encontrada no banco`);
      return false;
    }
    
    // Step 3: Validate soft delete
    if (!instance.isActive) {
      logger.warn(`⚠️ Instância foi deletada (isActive=false)`);
      return false;
    }
    
    // Step 4: Check status
    const isConnected = instance.status === 'connected';
    
    // ⭐ NEW: Se banco diz 'connected' mas não em memória,
    // pode indicar problema. Log como warning.
    if (isConnected && !this.connections.has(instanceId)) {
      logger.warn(
        `⚠️ DISCREPÂNCIA: Instância ${instanceId} está 'connected' no banco ` +
        `mas NÃO em memória. Socket pode ter caído. ` +
        `Sugerindo reconexão automática.`
      );
      
      // ⭐ NEW: Tenta reconectar automaticamente
      try {
        logger.info(`🔄 Tentando reconectar instância ${instanceId}...`);
        await this.connect(instanceId);
        logger.info(`✅ Reconexão bem-sucedida para ${instanceId}`);
        return true; // Sucesso!
      } catch (reconnectError) {
        logger.error(
          `❌ Reconexão falhou para ${instanceId}: ${reconnectError}. ` +
          `Retornando false.`
        );
        
        // ⭐ NEW: Atualiza banco para refletir realidade
        await instance.update({ status: 'disconnected' });
        return false;
      }
    }
    
    logger.info(
      `🔍 Instância ${instanceId} - Status: ${instance.status}, ` +
      `isActive: ${instance.isActive} (conectada: ${isConnected})`
    );
    return isConnected;
    
  } catch (error) {
    logger.error(`❌ Erro ao verificar instância ${instanceId} no banco:`, error);
    return false;
  }
}
```

**Benefícios:**
- ✅ Detecta discrepância banco-memória
- ✅ Tenta reconectar automaticamente
- ✅ Atualiza banco se socket caiu
- ✅ Mais confiável para código downstream

**Risco:**
- ⚠️ Pode adicionar latência (chama `this.connect()`)
- ⚠️ Pode disparar muitas reconexões se problema persistir

**Mitigation:**
- Add cooldown (não reconectar mesma instância 2x em 30s)
- Add max retry counter

---

#### **2. Implementar Retry com Fallback**

**Problema:**
- `sendMessage()` falha imediatamente se socket não em memória
- Nenhuma tentativa de recuperação

**Solução:**
Adicionar retry com tentativa de reconexão.

**Arquivo:** `backend/src/adapters/BaileysAdapter.ts` - Linhas 320-340

**Código Actual (PROBLEMA):**
```typescript
public async sendMessage(instanceId: string, phoneNumber: string, message: string): Promise<any> {
  const connection = this.connections.get(instanceId);
  if (!connection) {
    throw new Error('Instância não está conectada'); // ❌ FALHA IMEDIATA
  }
  // ... rest
}
```

**Código Proposto (SOLUÇÃO):**
```typescript
public async sendMessage(
  instanceId: string,
  phoneNumber: string,
  message: string,
  retries: number = 1
): Promise<any> {
  try {
    let connection = this.connections.get(instanceId);
    
    if (!connection && retries > 0) {
      // ⭐ NEW: Tenta reconectar antes de falhar
      logger.warn(
        `⚠️ Conexão não encontrada para ${instanceId}. ` +
        `Tentando reconectar (tentativas restantes: ${retries})...`
      );
      
      try {
        await this.connect(instanceId);
        connection = this.connections.get(instanceId);
        
        if (!connection) {
          throw new Error('Reconexão não criou conexão válida');
        }
        
        logger.info(`✅ Reconexão bem-sucedida para ${instanceId}`);
      } catch (reconnectError) {
        logger.error(`❌ Falha na reconexão: ${reconnectError}`);
        
        if (retries > 0) {
          // ⭐ NEW: Retry recursivo com delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.sendMessage(instanceId, phoneNumber, message, retries - 1);
        }
      }
    }
    
    if (!connection) {
      throw new Error(
        `Instância ${instanceId} não está conectada e não foi possível ` +
        `reconectar após ${retries} tentativas`
      );
    }

    const jid = phoneNumber.includes('@s.whatsapp.net') 
      ? phoneNumber 
      : `${phoneNumber}@s.whatsapp.net`;

    const result = await connection.socket.sendMessage(jid, { text: message });

    logger.info(`✅ Mensagem enviada para ${phoneNumber} via ${instanceId}`);
    return result;
    
  } catch (error) {
    logger.error(`❌ Erro ao enviar mensagem:`, error);
    throw error;
  }
}
```

**Benefícios:**
- ✅ Trata falhas transitórias
- ✅ Automaticamente tenta reconectar
- ✅ Usuário vê o erro real se persistir

**Risco:**
- ⚠️ Pode aumentar latência para operações
- ⚠️ Pode sobrecarregar se muitas instâncias tentam reconectar

---

### **Priority P1 - ALTO**

#### **3. Implementar Health Check Periódico**

**Problema:**
- Nenhum mecanismo para detectar socket morto
- Banco fica desatualizado automaticamente

**Solução:**
Adicionar verificação periódica de socket com ping.

**Arquivo:** Nova função em `BaileysAdapter.ts` ou `server.ts`

**Código Proposto:**
```typescript
/**
 * Health check periódico para todas as conexões
 * Executa a cada 5 minutos
 */
private async healthCheckConnections(): Promise<void> {
  const connections = Array.from(this.connections.entries());
  
  for (const [instanceId, connection] of connections) {
    try {
      // ⭐ Testa se socket está respondendo
      const socketOpen = connection.socket?.sock?.connected === true;
      
      if (!socketOpen) {
        logger.warn(
          `⚠️ Health Check: Socket desconectado para ${instanceId}. ` +
          `Removendo de memória.`
        );
        
        this.connections.delete(instanceId);
        
        // ⭐ Atualiza banco
        const instance = await WhatsAppInstance.findByPk(instanceId);
        if (instance) {
          await instance.update({ status: 'disconnected' });
        }
      } else {
        logger.debug(`✅ Health Check: ${instanceId} OK`);
      }
    } catch (error) {
      logger.error(`❌ Health Check error para ${instanceId}:`, error);
    }
  }
}

// No startServer(), add:
// setInterval(() => this.healthCheckConnections(), 5 * 60 * 1000);
```

**Benefícios:**
- ✅ Detecta socket morto
- ✅ Banco sempre sincronizado
- ✅ Previne "instâncias fantasma"

---

#### **4. Remover Código Duplicado (baileysService.ts)**

**Problema:**
- Mesma lógica em `BaileysAdapter.ts` e `baileysService.ts`
- Difícil manter sincronizado

**Solução:**
Usar apenas `BaileysAdapter.ts` através de wrapper `WhatsAppService.ts`.

**Ação:**
1. Delete `backend/src/services/baileysService.ts`
2. Verify todas as imports estão usando `whatsappService` (que usa adapter)
3. Se alguém importa `baileysService` diretamente, mudar para `whatsappService`

**Search:**
```bash
grep -r "baileysService" backend/src
grep -r "from.*baileysService" backend/
```

---

### **Priority P2 - MÉDIO**

#### **5. Melhorar Logging de Desconexão**

**Problema:**
- Quando socket cai, pode não ficar claro por quê
- Difícil debugar da perspectiva do usuário

**Solução:**
Adicionar logs mais detalhados em `connection.update` handler.

**Arquivo:** `backend/src/adapters/BaileysAdapter.ts` - Linhas 140-210

**Código Adicional:**
```typescript
socket.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr, isNewLogin } = update;

  // ⭐ NOVO: Log detalhado de status
  logger.info(`📡 Connection update para ${instanceId}:`, {
    connection: connection || 'unknown',
    isNewLogin,
    hasQR: !!qr,
    hasError: !!lastDisconnect?.error,
    errorCode: (lastDisconnect?.error as any)?.code,
    statusCode: (lastDisconnect?.error as Boom)?.output?.statusCode,
    errorMessage: lastDisconnect?.error?.message || 'N/A',
    timestamp: new Date().toISOString(),
  });

  // ... existing handlers

  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const shouldReconnect = 
      statusCode !== DisconnectReason.loggedOut && 
      statusCode !== 403;

    // ⭐ NOVO: Log com razão da desconexão
    logger.warn(`🔴 Conexão fechada para ${instanceId}`, {
      statusCode,
      shouldReconnect,
      reason: getDisconnectReason(statusCode),
      timestamp: new Date().toISOString(),
    });
    
    // ... rest
  }
});

// ⭐ NOVO: Helper para traduzir códigos de erro
function getDisconnectReason(statusCode?: number): string {
  switch (statusCode) {
    case DisconnectReason.connectionClosed:
      return 'Conexão fechada';
    case DisconnectReason.connectionLost:
      return 'Conexão perdida';
    case DisconnectReason.connectionReplaced:
      return 'Conexão substituída (login em outro lugar?)';
    case DisconnectReason.loggedOut:
      return 'Logout (credenciais revogadas)';
    case 403:
      return 'Proibido (WhatsApp bloqueou)';
    case 401:
      return 'Não autenticado (credenciais expiradas)';
    default:
      return `Desconexão desconhecida (código: ${statusCode})`;
  }
}
```

---

#### **6. Adicionar Endpoint de Health Check**

**Problema:**
- User não sabe o status real de uma instância
- Pode conectar em frontend mas falhar no backend

**Solução:**
Novo endpoint que faz check completo.

**Arquivo:** `backend/src/routes/instances.ts`

**Código Proposto:**
```typescript
router.get('/:id/check', authenticate, async (req: AuthRequest, res) => {
  try {
    const instanceId = req.params.id;
    const userId = req.user!.id;

    // Verify ownership
    const instance = await WhatsAppInstance.findOne({
      where: { id: instanceId, userId }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // ⭐ NEW: Verificação completa
    const response = {
      id: instance.id,
      name: instance.name,
      status: instance.status,
      isActive: instance.isActive,
      checks: {
        inMemory: whatsappService.isConnected(instanceId), // Rápido
        inBank: instance.status === 'connected' && instance.isActive,
        canUse: false, // resultado final
      },
      details: {
        phoneNumber: instance.phoneNumber,
        connectedAt: instance.connectedAt,
        accountAge: instance.accountAge,
        lastMessageAt: instance.lastMessageAt,
      },
      warnings: [] as string[],
    };

    // Add warnings
    if (response.checks.inBank && !response.checks.inMemory) {
      response.warnings.push(
        'Instância marcada como conectada no banco mas não em memória. ' +
        'Socket pode ter caído. Tente reconectar.'
      );
    }

    if (!instance.isActive) {
      response.warnings.push('Instância foi deletada (soft delete)');
    }

    if (!instance.phoneNumber) {
      response.warnings.push('Instância nunca foi conectada');
    }

    // Final state
    response.checks.canUse = response.checks.inMemory && response.checks.inBank;

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Uso no Frontend:**
```javascript
const health = await fetch(`/api/instances/${id}/check`);
if (health.canUse) {
  // Safe to use
} else if (health.checks.inBank && !health.checks.inMemory) {
  // Offer to reconnect
} else {
  // Show error
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Para Fixar CRÍTICO (P0):**
- [ ] Editar `BaileysAdapter.isConnectedOrStored()` - tornar mais rigorosa
- [ ] Adicionar auto-reconnect se discrepância detectada
- [ ] Adicionar retry logic em `sendMessage()`
- [ ] Editar `getGroups()` e `getGroupParticipants()` também
- [ ] Testar que erro não ocorre mais

### **Para Fixar ALTO (P1):**
- [ ] Remover/consolidar `baileysService.ts`
- [ ] Implementar health check periódico
- [ ] Atualizar logging de desconexão
- [ ] Adicionar endpoint `/api/instances/:id/check`

### **Para Melhorar:**
- [ ] Adicionar timeout de 24h para reset automático
- [ ] Implementar cooldown para evitar múltiplas reconexões
- [ ] Adicionar métrica de uptime por instância
- [ ] Dashboard para monitorar instâncias fantasma

---

## 🧪 TESTES

### **Test 1: Validação sem Socket**
```typescript
// Setup
const instance = await WhatsAppInstance.create({ ... });
// Não conecta, então não há socket em memória

// Test
const result = await adapter.isConnectedOrStored(instance.id);
// Deveria tentar reconectar, falhar, retornar false ✅
```

### **Test 2: Socket Morrido Mas Banco Diz OK**
```typescript
// Setup
await instance.update({ status: 'connected' }); // Banco OK
// Mas socket.sock.connected = false              // Socket morto

// Test
const result = await adapter.isConnectedOrStored(instance.id);
// Deveria detectar, reconectar ✅
```

### **Test 3: Retry em sendMessage**
```typescript
// Setup
const instance = await adapter.connect(instanceId);
// Matar socket manualmente
instance.socket.sock.end();

// Test
const result = await adapter.sendMessage(instanceId, '5585999...', 'test');
// Deveria failover, tentar reconectar, succeed ✅
```

---

## 📈 MÉTRICAS PARA MONITORAR

Após implementar fixes:

```
✅ Erro "Instância não está conectada" count → deve chegar a 0
✅ Campanha success rate → deve aumentar
✅ Instâncias reconectadas automaticamente → deve > 0
✅ Health check warnings → deve diminuir
✅ Socket morridos detectados → antes não era detectado
```

---

## Conclusão

O erro **"Instância não está conectada"** pode ser **virtually eliminado** ao:

1. **P0:** Sincronizar validação com execução (isConnectedOrStored vs sendMessage)
2. **P0:** Adicionar retry com auto-reconnect em operações críticas
3. **P1:** Remover código duplicado
4. **P1:** Implementar health check periódico
5. **P2:** Melhorar logging e adicionar endpoints de diagnóstico

**Timeline Estimada:**
- P0: 2-4 horas (testing incluído)
- P1: 2-3 horas
- P2: 1-2 horas
- **Total: ~6-9 horas**
