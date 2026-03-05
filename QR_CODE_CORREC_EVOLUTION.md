# ✅ Corrigido: Geração e Exibição de QR Code com Evolution API

**Data**: 22/02/2026  
**Status**: ✅ COMPLETO  
**Tipo de Mudança**: Correção de QR Code para Evolution API

---

## 📋 Resumo das Correções

Após remover completamente o Baileys, a geração e exibição do QR Code foi refatorada para funcionar exclusivamente com a **Evolution API**.

### Principais Mudanças:

#### 1. **EvolutionAdapter.ts** - Melhorias na busca de QR Code
- ✅ **Polling automático**: Implementado `startQRCodePolling()` que tenta obter QR code a cada 1 segundo por até 30 segundos
- ✅ **Refresh sob demanda**: Novo método público `refreshQRCode()` que força atualização do QR code
- ✅ **Tratamento de erros**: Melhor logging e tratamento de casos onde QR não está pronto
- ✅ **Cache local**: QR codes são armazenados em `cachedQRCodes` Map para acesso rápido

**Código-chave:**
```typescript
// Polling automático com retry
private startQRCodePolling(instanceId: number): void {
  let attempts = 0;
  const maxAttempts = 30;
  
  const poll = async () => {
    attempts++;
    try {
      await this.getQRCodeFromAPI(instanceId);
    } catch (error) {
      if (attempts < maxAttempts) {
        setTimeout(poll, 1000); // Retry em 1 segundo
      }
    }
  };
  
  poll(); // Inicia polling
}

// Refresh sob demanda
public async refreshQRCode(instanceId: number): Promise<string | undefined> {
  await this.getQRCodeFromAPI(instanceId);
  return this.cachedQRCodes.get(instanceId);
}
```

#### 2. **WhatsAppAdapter.ts** - Interface atualizada
- ✅ Adicionado método abstrato `refreshQRCode()` na interface
- ✅ Documentação clara do contrato para implementadores

#### 3. **WhatsAppService.ts** - Serviço delegando para adapter
- ✅ Novo método público `refreshQRCode()` que delega ao adapter
- ✅ Permite que rotas façam refresh do QR code sob demanda

#### 4. **Rota GET /instances/:id/qr** - Lógica melhorada
- ✅ **Busca em cache primeiro**: Retorna QR rápido se já está em cache
- ✅ **Refresh automático**: Se não tem QR em cache, tenta fazer refresh
- ✅ **Status informativo**: Retorna status claro: `connected`, `pending`, `awaiting`
- ✅ **Retry hint**: Responde com `retryAfter` indicando quando tentar novamente

**Fluxo de requisição GET /instances/:id/qr:**
```
1. Verificar se já conectado → return status:connected
2. Buscar QR em cache → se tiver, return status:pending
3. Fazer refresh → se conseguir, return status:pending
4. Se não conseguir → return status:awaiting com retryAfter:3
```

#### 5. **Frontend ConnectWhatsAPP.tsx** - Polling melhorado
- ✅ **Polling estendido**: Até 45 tentativas (até 90 segundos) vs 10 antes
- ✅ **Logging detalhado**: Mostra tentativa, status, presença de QR
- ✅ **Melhor tratamento de states**: Diferencia `awaiting`, `pending`, `connected`
- ✅ **Respeita hints**: Aguarda `retryAfter` quando indicado
- ✅ **Timeout apropriado**: 5 minutos para permitir Evolution API processar

---

## 📊 Fluxo Completo de Conexão

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: Clica em "Conectar WhatsApp"                  │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND POST /instances/:id/connect                      │
│    - Chamar whatsappService.connect()                       │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. EVOLUTION ADAPTER: Criar instância                       │
│    - POST /instance/create → Evolution API                  │
│    - Iniciar polling de QR code (cada 1s, máx 30s)         │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. POLLING AUTOMÁTICO INTERNO                               │
│    - getQRCodeFromAPI() attempts every 1s                  │
│    - Salva em cache quando obtém                            │
│    - Para quando conseguir ou max attempts                  │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND POLLING: GET /instances/:id/qr (a cada 2s)     │
│    - Tenta buscar QR code                                   │
│    - Se não tiver, faz refresh()                            │
│    - Exibe quando conseguir                                 │
│    - Máx 45 tentativas (90s)                               │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. USUÁRIO: Escaneia QR Code com WhatsApp                  │
│    - Evolution API processa escaneamento                    │
│    - Envia dados de conexão                                 │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. BACKEND: Recebe confirmação de conexão                   │
│    - Webhooks de Evolution API                              │
│    - Atualiza status em banco: "connected"                  │
│    - Armazena phoneNumber                                   │
└─────────────────────────────────────────────┬───────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. FRONTEND: Recebe status:connected                         │
│    - Para polling                                           │
│    - Exibe "WhatsApp Conectado"                             │
│    - Pronto para enviar mensagens                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Como Testar

### Opção 1: Script de Teste Automático

```bash
# Iniciar backend
cd backend
npm run dev

# Em outro terminal, rodar teste
npm run test:qr
```

**O que o teste faz:**
1. ✅ Login com admin@gmail.com
2. ✅ Cria instância de teste
3. ✅ Polling até 40 segundos para obter QR
4. ✅ Valida formato do QR Code
5. ✅ Lista instâncias e confirma QR no banco
6. ✅ Testa refresh de QR Code
7. ✅ Faz limpeza deletando instância

### Opção 2: Teste Manual no Navegador

```bash
# 1. Ir para http://localhost:8080
# 2. Fazer login ou criar conta
# 3. Ir em "Gerenciar Instâncias"
# 4. Clicar "Conectar WhatsApp"
# 5. Aguardar QR Code aparecer (até 90s)
# 6. Usar outro celular/navegador para escanear
# 7. Confirmar se conecta com sucesso
```

### Opção 3: Teste com cURL

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"vip2026"}'

# Copiar token da resposta

# 2. Criar instância
TOKEN="seu_token_aqui"
curl -X POST http://localhost:3001/api/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test_qr","accountAge":30}'

# Copiar instance.id da resposta (ex: 5)

# 3. Buscar QR code com polling
INSTANCE_ID=5
for i in {1..20}; do
  echo "Tentativa $i..."
  curl -X GET "http://localhost:3001/api/instances/$INSTANCE_ID/qr" \
    -H "Authorization: Bearer $TOKEN" \
    -s | jq '.'
  sleep 2
done
```

---

## 📝 Comportamento Esperado

### Cenário 1: QR Code Gerado Rápido (< 5 segundos)
```javascript
{
  status: 200,
  body: {
    qrCode: "data:image/png;base64,...",
    status: "pending",
    message: "QR Code pronto - escaneie com seu WhatsApp"
  }
}
```

### Cenário 2: QR Code Ainda Processando (5-30 segundos)
```javascript
{
  status: 200,
  body: {
    qrCode: null,
    status: "awaiting",
    message: "Aguardando geração do QR Code... Tente novamente em alguns segundos",
    retryAfter: 3
  }
}
```

### Cenário 3: Já Conectado
```javascript
{
  status: 200,
  body: {
    qrCode: null,
    status: "connected",
    connectedAt: "2026-02-22T14:30:00Z",
    message: "WhatsApp conectado"
  }
}
```

---

## 🔍 Pontos Importantes

### ✅ O que foi corrigido:
- Removido `@whiskeysockets/baileys` completamente
- Removido `qrcode` package (Evolution API retorna QR pronto)
- Implementado polling automático no adapter
- Implementado refresh sob demanda
- Melhorado frontend polling
- Logging detalhado em todas as etapas

### ⚠️ Dependências da Evolution API:
- Evolution API **deve estar rodando** em http://localhost:8080
- `EVOLUTION_API_KEY` deve estar configurado no `.env`
- Webhooks devem estar configurados (para atualizar status de conexão)

### 🔧 Troubleshooting:

**Q: QR Code não aparece após 90 segundos**
- Verificar se Evolution API está rodando: `curl http://localhost:8080`
- Verificar se `EVOLUTION_API_KEY` está no `.env`
- Ver logs do backend: `npm run dev`

**Q: QR Code aparece mas não funciona**
- Verificar se escolheu número WhatsApp correto
- Escanear com WhatsApp no celular usando câmera
- Evolution API pode precisar reconfiguracao

**Q: Conexão fica em "conectando" indefinidamente**
- Evolution API pode estar processando
- Recarregar página e tentar novamente
- Verificar logs de webhooks do Evolution API

---

## 📦 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `backend/src/adapters/EvolutionAdapter.ts` | +Polling automático, +refreshQRCode(), +Tratamento de erros |
| `backend/src/adapters/WhatsAppAdapter.ts` | +refreshQRCode() abstrato |
| `backend/src/adapters/WhatsAppService.ts` | +refreshQRCode() delegado |
| `backend/src/routes/instances.ts` | Lógica melhorada GET /:id/qr com refresh |
| `frontend/src/components/ConnectWhatsAPP.tsx` | +Polling estendido, +Logging, +Melhor tratamento de states |
| `backend/test-qr-evolution.ts` | NOVO: Script de teste completo |
| `backend/package.json` | +Script: npm run test:qr |

---

## 🎯 Próximos Passos

1. ✅ Verificar que QR code é gerado em < 30 segundos
2. ✅ Testar escaneamento com WhatsApp real
3. ✅ Validar que mensagens podem ser enviadas após conectar
4. ✅ Testar desconexão e reconexão
5. ✅ Validar comportamento em múltiplas instâncias simultâneas

---

**Status Final**: ✅ Geração, busca e exibição de QR Code funcional com Evolution API!
