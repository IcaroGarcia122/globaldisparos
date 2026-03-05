# DIAGRAMA DE FLUXO - QR Code Baileys

## FLUXO ESPERADO ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO (Frontend)                       │
│                     1. Clica "Nova Instância"                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              React Component (Instances.tsx)                     │
│         2. Envia POST /api/instances com auth token            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ HTTP Request
┌─────────────────────────────────────────────────────────────────┐
│            Backend Route (api/instances POST)                    │
│         3. Valida token, chama whatsappService.createInstance   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│          whatsappService.createInstance(instanceId)              │
│    4. Cria novo BaileysAdapter e chama initialize()            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│             BaileysAdapter.initialize()                          │
│  5. Chama makeWASocket() - Baileys cria Socket WebSocket        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│           Baileys WebSocket Connection (Update Event)            │
│        6. WhatsApp envia update.qr com código QR                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│     BaileysAdapter - Socket.io Connection Handler               │
│   7. Recebe update.qr e envia para frontend via                │
│      socket.emit('qr', { instanceId, qrCode: update.qr })     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ WebSocket Événement
┌─────────────────────────────────────────────────────────────────┐
│          Frontend Socket.io Listener (Instances.tsx)             │
│   8. Recebe evento 'qr' e armazena em state React              │
│      socket.on('qr', (data) => setQRCode(data.qrCode))        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              React State Update & Re-render                      │
│    9. Componente renderiza <QRCode value={qrCode} />            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QR CODE VISÍVEL NA TELA ✅                   │
│            Usuário escaneia com celular WhatsApp                │
└─────────────────────────────────────────────────────────────────┘
```

---

## FLUXO COM PROBLEMA ❌

```
┌──────────────────────────────────────────────────────────────────┐
│ CENÁRIO 1: Frontend Offline                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  "npm run dev" falha silenciosamente                            │
│         ↓                                                         │
│  Vite não levanta porta 8080                                    │
│         ↓                                                         │
│  Usuário vê: "Página não encontrada" ou em branco               │
│         ↓                                                         │
│  ❌ NÃO CONSEGUE NEM FAZER LOGIN                               │
│                                                                   │
│  Possíveis causas:                                              │
│  • node_modules corrompido                                      │
│  • Erro de build Vite                                           │
│  • Port 8080 já em uso                                          │
│  • Problema de dependências                                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘



┌──────────────────────────────────────────────────────────────────┐
│ CENÁRIO 2: QR Code Não Chega no Frontend                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend OK                                                     │
│  Backend OK                                                      │
│  Login OK                                                        │
│  Clica "Nova Instância"                                         │
│         ↓ POST /api/instances                                    │
│  Backend responde 201 Created ✅                                │
│         ↓                                                         │
│  ??? QR Code não aparece na tela                                │
│         ↓                                                         │
│  Possíveis quebras na corrente:                                 │
│                                                                   │
│  OPÇÃO A: BaileysAdapter não emite QR                          │
│    • Handler "update.qr" falta no adapter                      │
│    • socket.emit('qr', ...) não existe ou está errado          │
│    ↓                                                              │
│    Backend logs: "QR Code gerado" NÃO APARECE ❌               │
│                                                                   │
│  OPÇÃO B: Frontend não recebe evento                            │
│    • socket.on('qr') não está registrado                        │
│    • Evento chega mas state não atualiza                        │
│    ↓                                                              │
│    DevTools Console: Evento 'qr' NÃO APARECE ❌                │
│                                                                   │
│  OPÇÃO C: QR code recebido mas não renderiza                   │
│    • Componente <QRCode /> não existe                           │
│    • setQRCode() não foi chamado                                │
│    • Modal/Card não abre                                        │
│    ↓                                                              │
│    DevTools Console: setQRCode foi chamado ✅                  │
│                      mas QR não aparece visualmente ❌           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## VERIFICAÇÃO POR ETAPA

```
┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 1: Frontend Online?                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teste: curl http://localhost:8080                              │
│                                                                   │
│  ✅ Retorna HTML              → Ir para ETAPA 2                │
│  ❌ Erro/Timeout              → FIX: npm run dev não funciona  │
│                                                                   │
│     Solução:                                                     │
│     1. npm install --legacy-peer-deps                           │
│     2. npm run build (checar erros Vite)                        │
│     3. npm run dev                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 2: Backend Online?                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teste: curl http://localhost:3001/health                       │
│                                                                   │
│  ✅ Retorna 200 OK            → Ir para ETAPA 3                │
│  ❌ Erro/Timeout              → FIX: npm start não funciona    │
│                                                                   │
│     Solução:                                                     │
│     1. npm run build (checar erros TypeScript)                  │
│     2. npm start (procurar erros nos logs)                      │
│     3. Se DB error: Verificar PostgreSQL                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              ETAPA 3: Login Funciona?                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teste: POST /api/auth/login com admin@gmail.com/vip2026       │
│                                                                   │
│  ✅ Retorna token JWT         → Ir para ETAPA 4                │
│  ❌ 401 Unauthorized / Error  → FIX: Auth quebrado             │
│                                                                   │
│     Solução:                                                     │
│     1. Verificar .env tem JWT_SECRET                            │
│     2. Verificar user admin existe em DB                        │
│     3. Checar erros backend logs                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│          ETAPA 4: Instância Cria (sem QR)?                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Teste: POST /api/instances com token bearer                    │
│                                                                   │
│  ✅ Retorna 201 Created       → Ir para ETAPA 5                │
│  ❌ 401/403/500               → FIX: Problema de criação       │
│                                                                   │
│     Solução:                                                     │
│     1. Checar token é válido (do login anterior)                │
│     2. Checar logs backend para erro de banco                   │
│     3. Checar whatsappService.createInstance()                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│          ETAPA 5: QR Code Backend Logs?                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Verificar: npm start output durante POST /api/instances        │
│                                                                   │
│  ✅ "QR Code gerado" aparece  → Ir para ETAPA 6                │
│  ❌ Nenhuma mensagem QR        → FIX: Adapter não emite       │
│                                                                   │
│     Solução:                                                     │
│     1. Editar BaileysAdapter.ts                                 │
│     2. Adicionar handler: socket.on('connection.update')        │
│     3. Adicionar emit: socket.emit('qr', {qrCode, instanceId}) │
│     4. npm run build && npm start novamente                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│         ETAPA 6: QR Code Frontend Recebe?                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Verificar: DevTools (F12) Console output quando clica           │
│            "Nova Instância"                                      │
│                                                                   │
│  ┌─ abrir DevTools (F12)                                        │
│  ├─ ir para Console                                              │
│  ├─ clicar "Nova Instância" no navegador                        │
│  ├─ procurar por "QR recebido:" ou "evento 'qr'"               │
│  │                                                                │
│  ✅ "Recebido: {data}" aparece → Ir para ETAPA 7              │
│  ❌ Nada aparece / só HTTP 201 → FIX: Frontend não ouve      │
│                                                                   │
│     Solução:                                                     │
│     1. Editar Instances.tsx                                     │
│     2. Adicionar: socket.on('qr', (data) => {...})            │
│     3. Adicionar: console.log('QR recebido:', data)            │
│     4. Fazer instância novamente e verificar console            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│         ETAPA 7: QR Code Renderiza?                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Verificar: DevTools (F12) Elements durante POST /api/instances │
│                                                                   │
│  ┌─ abrir DevTools (F12)                                        │
│  ├─ ir para Elements/Inspector                                  │
│  ├─ procurar por elemento <img src="data:image/png...">       │
│  │  ou canvas com QR code                                      │
│  │                                                                │
│  ✅ <img> com QR aparece       → ✅ PROBLEMA RESOLVIDO!      │
│  ❌ Nenhuma imagem QR           → FIX: Componente não renderiza│
│                                                                   │
│     Solução:                                                     │
│     1. Editar Instances.tsx                                     │
│     2. Adicionar setQRCode(data.qrCode) no listener             │
│     3. Adicionar render: qrCode && (<QRCode value={qrCode} />)│
│     4. Importar QRCode component se não estiver                 │
│     5. Teste novamente                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## RESUMO VISUAL

```
SUCESSO = Frontend ✅ + Backend ✅ + WebSocket ✅ + QR visível ✅

FALHA EM:        │  Frontend  │  Login  │  WebSocket  │  Rendering
─────────────────┼────────────┼─────────┼─────────────┼───────────
ETAPA 1          │     ❌     │   -     │      -      │     -
ETAPA 2          │     ✅     │   ❌    │      -      │     -
ETAPA 3          │     ✅     │   ✅    │      ❌     │     -
ETAPA 4          │     ✅     │   ✅    │      ✅     │     ❌

Q: O QR code não aparece mesmo na ETAPA 7?
A: Pode ser problema adicional:
   - Componente QRCode não está importado
   - Modal/card está fora do viewport
   - Estado não está sendo renderizado (React.strictMode debug)
   - useEffect está retornando e limpando listener cedo demais
```

---

**Use este diagrama para debugar exatamente onde está o problema!**
