# Diagrama de Fluxo: Erro "Instância não está conectada"

## 1. FLUXO NORMAL DE CONEXÃO (SEM ERRO)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER CRIA INSTÂNCIA                                                  │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
           POST /api/instances
                     │
                     ▼
        ┌────────────────────────┐
        │ WhatsAppInstance.create │
        │ status: 'disconnected'  │
        │ isActive: true          │
        │ phoneNumber: null       │
        └────────────┬────────────┘
                     │
            (Instância criada no BANCO)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. USER CLICA PARA CONECTAR                                             │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
        POST /api/instances/:id/connect
                     │
                     ▼
     ┌───────────────────────────────────┐
     │ whatsappService.connect()          │
     │ (WhatsAppAdapter → BaileysAdapter) │
     └──────────────┬──────────────────────┘
                    │
                    ▼
     ┌──────────────────────────────┐
     │ BaileysAdapter.connect()     │
     │ 1. Busca instância no BANCO  │
     │ 2. updateStatus('connecting')│
     │ 3. Carrega credenciais       │
     │ 4. Cria WebSocket (Baileys)  │
     │ 5. Armazena em memória       │
     │    this.connections.set(...) │
     └──────────────┬───────────────┘
                    │
         (Socket armazenado em MEMÓRIA)
                    │
      ┌─────────────────────────────┐
      │ socket.ev.on('...') handlers│
      │ - creds.update              │
      │ - connection.update         │
      │ - chats.set                 │
      │ - messages.upsert           │
      └──────────────┬──────────────┘
                     │
         (Awaiting QR code scan)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. USER ESCANEIA QR CODE NO CELULAR                                     │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
         socket.ev.on('qr') dispara
                     │
                     ▼
     ┌──────────────────────────────┐
     │ handler('connection.update')  │
     │ if (connection === 'open') {  │
     │   update: status='connected'  │
     │   phoneNumber definido        │
     │   connectedAt definido        │
     │ }                             │
     └──────────────┬────────────────┘
                    │
      (Status atualizado no BANCO)
      (Socket continua em MEMÓRIA)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. INSTÂNCIA PRONTA PARA USAR                                           │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
        isConnected() = TRUE
        (em memória ✅)
                     │
        isConnectedOrStored() = TRUE
        (em memória ✅ ou banco ✅)
                     │
                     ▼
        ┌─────────────────────────┐
        │ sendMessage() FUNCIONA  │
        │ getGroups() FUNCIONA    │
        │ getCampaigns() FUNCIONA │
        └─────────────────────────┘
```

---

## 2. PROBLEMA: SERVIDOR REINICIA

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO ANTES DO RESTART                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ BANCO:                          │ MEMÓRIA:                              │
│ ✅ status: 'connected'          │ ✅ this.connections[instanceId]       │
│ ✅ phoneNumber: '5585999...'    │ ✅  Socket está aberto                │
│ ✅ isActive: true               │ ✅  Eventos sendo processados          │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
          ⚡ RESTART DO SERVIDOR ⚡
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO APÓS RESTART (IMEDIATO)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ BANCO:                          │ MEMÓRIA:                              │
│ 🔴 status: 'connected' (stale)  │ 🔴 this.connections VAZIO ❌           │
│ ✅ phoneNumber: '5585999...'    │    (Todas as conexões perdidas)       │
│ ✅ isActive: true               │                                       │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
                 ▼
     ┌───────────────────────────────┐
     │ resetStaleConnections()        │
     │ - Procura status='connected'  │
     │ - Update → 'disconnected'     │
     │                              │
     │ Result: BANCO agora está ok ✅│
     └───────────────┬────────────────┘
                     │
     ┌───────────────────────────────┐
     │ reconnectAllInstances()        │
     │ - Procura status='disconnected'│
     │ + phoneNumber != null         │
     │ - Chama this.connect()        │
     │                              │
     │ Tenta reconectar... ⏳        │
     └───────────────┬────────────────┘
                     │
        ✅ RECONEXÃO BEM-SUCEDIDA
                     │
        BANCO: status='connected' ✅
        MEMÓRIA: Socket novo ✅
                     │
                     ✅ Funciona normalmente
```

---

## 3. PROBLEMA: RECONEXÃO SILENCIOSAMENTE FALHA

```
┌─────────────────────────────────────────────────────────────────────────┐
│ reconnectAllInstances() COM ERRO SILENCIOSO                            │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
                 ▼
     ┌───────────────────────────────┐
     │ this.connect(instanceId)       │
     │                              │
     │ Tenta:                       │
     │ 1. useMultiFileAuthState()   │
     │ 2. makeWASocket()            │
     └───────────────┬────────────────┘
                     │
        ❌ FALHA (credenciais expiradas, rede fora, etc)
                     │
                     ▼
     ┌───────────────────────────────┐
     │ catch (error) {               │
     │   logger.error(...)           │
     │   instance.update({           │
     │     status: 'disconnected'    │
     │   })                          │
     │ }                             │
     │                              │
     │ continue para próxima...      │
     └───────────────┬────────────────┘
                     │
┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO FINAL (PROBLEMA)                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ BANCO:                          │ MEMÓRIA:                              │
│ 🔴 status: 'disconnected' ✅    │ 🔴 this.connections VAZIO ❌           │
│ 🔴 phoneNumber: '5585999...'    │    (reconexão falhou)                 │
│ ✅ isActive: true               │                                       │
│                                │ NENHUMA tentativa de reconexão        │
│ USER QUER ENVIAR MENSAGEM...    │ depois vai ficar preso aqui! 🔄       │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
                 ▼
     ┌───────────────────────────────┐
     │ campaignService.startCampaign()│
     │                              │
     │ isConnectedOrStored() = ?    │
     └───────────────┬────────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Procura no banco:             │
     │ status === 'disconnected' 🔴  │
     │                              │
     │ const isConnected = false ❌  │
     │ return false                 │
     │                              │
     │ Erro: "Instância não está     │
     │        conectada" ✅ Correto  │
     └───────────────────────────────┘
```

---

## 4. O PROBLEMA CRÍTICO: Banco vs Memória Desincronizado

```
┌──────────────────────────────────────────────────────────────────────┐
│ CENÁRIO: CONEXÃO CAI SILENCIOSAMENTE (Ex: WhatsApp fecha socket)    │
└──────────────────────────────────────┬───────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                   │
        ✅ SOCKET EVENTO:            ❌ SOCKET NÃO DISPARA:
        connection='close'            desligou sozinho, ninguém percebe
                    │                                   │
                    ▼                                   ▼
        ┌──────────────────┐          ┌──────────────────────────┐
        │ Handler dispara: │          │ NADA ACONTECE 🚨         │
        │ update bank:     │          │                          │
        │ status='disconn' │          │ BANK: status='connected' │
        │                 │          │ MEMORY: vazio            │
        │ ✅ OK           │          │                          │
        └──────────────────┘          │ ❌ DESINCRONIZADO        │
                    │                 └──────────────────────────┘
                    │                          │
                    ▼                          ▼
    ┌──────────────────────────┐  ┌─────────────────────────┐
    │ isConnectedOrStored()     │  │ isConnectedOrStored()   │
    │ ✅ RETORNA FALSE (OK)     │  │ ❌ RETORNA TRUE (BUG!)  │
    │                          │  │                         │
    │ Banco: 'disconnected' ✅ │  │ Banco: 'connected' ✅    │
    │ return false             │  │ return TRUE ❌           │
    └──────────────────────────┘  └──────┬──────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────────┐
                            │ CODE TENTA ENVIAR MSG:      │
                            │                             │
                            │ const conn = connections... │
                            │ if (!conn) {                │
                            │   ERRO ❌ ❌ ❌             │
                            │ }                           │
                            └─────────────────────────────┘
```

---

## 5. FLUXO DETALHADO: `isConnectedOrStored()` 

```
┌──────────────────────────────────────────────────────────┐
│ BaileysAdapter.isConnectedOrStored(instanceId)          │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Step 1: Check MEMORY       │
    │ this.connections.has(...)  │
    └────┬───────────────────┬───┘
         │ SIM ✅            │ NÃO ❌
         │                   │
         ▼                   ▼
    return TRUE  ┌──────────────────────────┐
                 │ Step 2: Query DATABASE   │
                 │ WhatsAppInstance.        │
                 │ findByPk(instanceId)     │
                 └────┬───────────┬──────────┘
                      │ Encontrado│ Não encontrado
                      │           │
                      ▼           ▼
                  ┌────────┐   return FALSE
                  │ Step 3 │
                  │ Check  │
                  │isActive│
                  └────┬───┘
                       │
        ┌──────────────┴──────────────┐
        │ true ✅                     │ false ❌
        │                             │
        ▼                             ▼
    ┌────────────┐             return FALSE
    │ Step 4     │
    │ Check      │
    │ status     │
    └────┬───────┘
         │
    ┌────┴────────────────────────────────────┐
    │ CONST isConnected =                     │
    │ instance.status === 'connected'         │
    │                                         │
    │ return isConnected                      │
    │                                         │
    │ ⚠️ AQUI ESTÁ O PROBLEMA! ⚠️             │
    │                                         │
    │ Retorna TRUE se banco diz 'connected'  │
    │ MAS não checa se socket realmente existe│
    │ MAS não checa se credenciais válidas   │
    │ MAS não checa se WhatsApp aceita socket│
    │ MAS não checa se há atividade recente  │
    └─────────────────────────────────────────┘
```

---

## 6. TIMELINE: Quando Erro Ocorre

```
Timeline de uma campanha falhando:

00:00 - Server inicia
        ├─ resetStaleConnections()
        ├─ reconnectAllInstances() FALHA SILENCIOSAMENTE 😬
        └─ Instância fica em estado "fantasma"

10:00 - User tenta iniciar campanha
        ├─ campaignService.startCampaign()
        ├─ isConnectedOrStored() → TRUE (banco diz connected) ⚠️
        ├─ campaign.status = 'running'
        └─ processCampaign() inicia background

10:01 - Tenta enviar primeira mensagem
        ├─ this.connections.get(instanceId) → undefined 🔥
        ├─ throw new Error('Instância não está conectada')
        └─ Silenciosamente logged, user nunca vê ❌

User perspective: "Por que minha campanha não funcionou?"
              (Nenhuma mensagem foi enviada, sem erro visível)
```

---

## 7. COMPARAÇÃO: Diferentes Adapters

```
┌────────────────────────────────────────────────────────────┐
│ BAILEYS ADAPTER (Arquivo com Problema)                    │
├────────────────────────────────────────────────────────────┤
│ BaileysAdapter.ts:325  ← sendMessage()  ERRO              │
│ BaileysAdapter.ts:349  ← getGroups()    ERRO              │
│ BaileysAdapter.ts:374  ← getGroupParticipants() ERRO      │
│ BaileysAdapter.ts:400  ← isConnectedOrStored() SUB-ÓTIMO │
└────────────────────────────────────────────────────────────┘
                           │
                    Mesmo código em:
                           │
        ┌──────────────────┴──────────────────┐
        │                                    │
        ▼                                    ▼
   BaileysAdapter.ts          baileysService.ts
   (Adapter class)            (Service duplicado)
   ✅ Deveria ser o único      ❌ Código duplicado
```

---

## 8. VALIDATION FLOW: Campanha Start

```
USER CLICKS "START CAMPAIGN"
        │
        ▼
POST /api/campaigns/:id/start
        │
        ▼
campaignService.startCampaign(campaignId)
        │
        └─ VALIDAÇÃO 1 ──┐
           │              │
           ├─────────────────────────────────┐
           │ const isConnected = await       │
           │ whatsappService                 │
           │ .isConnectedOrStored(...)      │
           │                                 │
           │ ❌ PROBLEMA: Muito otimista    │
           └─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │ TRUE - Continua              │ FALSE - Erro
        │                              │
        ▼                              ▼
setImmediate(()=>                 STOP aqui
processCampaign())                User vê erro
        │
        ▼
VALIDAÇÃO 2 (em background)
        │
        ├─────────────────────────────────┐
        │ const instance = await          │
        │ Campaign.findByPk(...include)  │
        │                                 │
        │ if (instance.status             │
        │     !== 'connected') {          │
        │   return; // STOP SILENCIOSAMTE│
        │ }                               │
        │                                 │
        │ ✅ Mais rigorosa, checa banco   │
        └─────────────────────────────────┘
        │
        ▼
ENVIO DE MENSAGENS
        │
        ├─────────────────────────────────┐
        │ whatsappService.sendMessage()   │
        │                                 │
        │ const conn = connections.get()  │
        │                                 │
        │ ❌ PROBLEMA: Checa memória      │
        │    pode estar vazia!            │
        │                                 │
        │ if (!conn) {                    │
        │   ERRO DISPARADO                │
        │ }                               │
        └─────────────────────────────────┘
```

---

## Conclusão Visual

```
┌─────────────────────────────────┐
│ O ERRO É RESULTADO DE:          │
├─────────────────────────────────┤
│                                 │
│ 1️⃣  VALIDAÇÃO OTIMISTA          │
│     isConnectedOrStored()        │
│     checa APENAS banco           │
│                                 │
│ 2️⃣  EXECUÇÃO RIGOROSA           │
│     sendMessage()               │
│     checa APENAS memória        │
│                                 │
│ 3️⃣  INCONSISTÊNCIA ENTRE        │
│     VALIDAÇÃO E EXECUÇÃO        │
│                                 │
│ 4️⃣  BANCO DESINCRONIZADO        │
│     COM MEMÓRIA                 │
│                                 │
└─────────────────────────────────┘

                  
SOLUÇÃO:
┌──────────────────────────────────────┐
│ Alinhar isConnectedOrStored()        │
│ com comportamento real de            │
│ sendMessage() e operações            │
─────────────────────────────────────────┐
```
