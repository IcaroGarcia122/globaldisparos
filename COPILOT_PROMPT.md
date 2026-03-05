# PROMPT PARA COPILOT DO VS CODE - CORREÇÃO QR CODE BAILEYS

## OBJETIVO FINAL
Corrigir dois problemas críticos:
1. QR code do Baileys NÃO está sendo gerado quando cria nova instância WhatsApp
2. Página frontend (localhost:8080) está offline/não funciona

**IMPORTANTE: NÃO FINALIZE A RESPOSTA ATÉ QUE AMBOS ESTEJAM FUNCIONANDO**

---

## CONTEXTO DO PROJETO

### Stack:
- Backend: Node.js + Express + Socket.IO (porta 3001)
- Frontend: React + Vite (porta 8080)
- WhatsApp: Baileys adapter (WebSocket direto)
- Auth: JWT com expiração 7d
- Database: PostgreSQL

### Arquivos Críticos:
```
backend/
  ├─ src/
  │  ├─ services/whatsappService.ts      ← Cria instâncias, emite QR
  │  ├─ adapters/BaileysAdapter.ts       ← Inicializa Baileys, handlers
  │  └─ server.ts                         ← Socket.IO setup
frontend/
  ├─ src/
  │  ├─ pages/Instances.tsx              ← Lista instâncias, recebe QR
  │  └─ App.tsx                           ← Router principal
```

---

## ANÁLISE DO PROBLEMA

### Problema 1: QR Code Não Gera
**Possíveis Causas:**
- [ ] BaileysAdapter não tem handler para evento 'qr'
- [ ] whatsappService não emite QR via WebSocket
- [ ] Frontend não está listening para evento 'qr' no Socket.IO
- [ ] Erro silencioso no inicializador do Baileys

**Como Debugar:**
1. Verificar logs do backend quando cria instância:
   - Deve aparecer: "QR Code gerado para instância [id]"
   - Deve emitir: `socket.emit('qr', {...})`
   
2. Verificar logs do frontend (F12 DevTools):
   - Deve receber evento 'qr'
   - Deve armazenar em state React
   - Deve renderizar componente de QR code

### Problema 2: Frontend Offline
**Possíveis Causas:**
- [ ] npm run dev trava/falha silenciosamente
- [ ] Vite não consegue compilar
- [ ] Port 8080 já está em uso
- [ ] Dependências corrompidas ou faltando
- [ ] Erro de build/config

**Como Debugar:**
1. Verificar se `npm run dev` roda sem erros
2. Verificar se Vite iniciou e está ouvindo porta 8080
3. Verificar console do navegador para erros de CORS ou conexão

---

## CHECKLIST DE CORREÇÃO

### ✅ PASSO 1: Limpar Ambiente
- [ ] Parar TODOS os processos Node.js/npm rodando
- [ ] Aguardar 3 segundos
- [ ] Confirmar que port 3001 e 8080 estão livres
- [ ] Remover `backend/dist/` para garantir build limpo

### ✅ PASSO 2: Verificar BaileysAdapter (backend/src/adapters/BaileysAdapter.ts)

**Deve ter:**
```typescript
// No método initialize() ou no handler de conexão:
socket.on('connection.update', (update) => {
  if (update.qr) {
    // Emitir QR code para frontend
    socket.emit('qr', {
      instanceId: this.instanceId,
      qrCode: update.qr.toString(),
      timestamp: Date.now()
    });
  }
});
```

**Verificar:**
- [ ] Há listener para `update.qr`?
- [ ] Está emitindo via socket.emit()?
- [ ] A estrutura do objeto QR está correta?

### ✅ PASSO 3: Verificar WhatsAppService (backend/src/services/whatsappService.ts)

**Deve ter no método createInstance():**
```typescript
// Inicializar Baileys adapter
const adapter = new BaileysAdapter(
  instanceId,
  socket, // Passar socket para comunicação com frontend
  config
);

const instance = await adapter.initialize();

// Registrar evento de emissão
if (socket) {
  // Socket já deve estar sendo usado no adapter
}
```

**Verificar:**
- [ ] Socket é passado ao adapter?
- [ ] socket.emit() é chamado quando QR é gerado?
- [ ] Resposta da API retorna instância com status?

### ✅ PASSO 4: Verificar Frontend Socket Listener (frontend/src/pages/Instances.tsx)

**Deve ter:**
```typescript
useEffect(() => {
  if (!socket) return;

  // Listener para QR code
  socket.on('qr', (data) => {
    console.log('QR recebido:', data);
    setQRCode(data.qrCode);
    setCurrentInstanceId(data.instanceId);
    setShowQRModal(true); // Mostrar modal/card com QR
  });

  // Listener para status de instância
  socket.on('instance:status', (data) => {
    console.log('Status atualizado:', data);
    updateInstanceStatus(data.instanceId, data.status);
  });

  return () => {
    socket.off('qr');
    socket.off('instance:status');
  };
}, [socket]);
```

**Verificar:**
- [ ] Socket.IO está conectado?
- [ ] Listeners para 'qr' estão registrados?
- [ ] Estado React atualiza quando QR chega?
- [ ] Componente QR code é renderizado?

### ✅ PASSO 5: Verificar Frontend Build

**Executar:**
```bash
cd frontend
npm run build
```

**Verificar:**
- [ ] Build completa sem erros?
- [ ] Nenhuma mensagem de aviso (warning)?
- [ ] Arquivo dist/ é criado?

### ✅ PASSO 6: Compilar e Iniciar Backend

**Executar:**
```bash
cd backend
npm run build
npm start
```

**Verificar com logs:**
- [ ] "✅ Server running on http://0.0.0.0:3001"
- [ ] "✅ WhatsAppService initialized"
- [ ] "✅ Socket.IO connected"
- [ ] Nenhum erro ❌ ou ENOENT?

**Health check:**
```bash
curl http://localhost:3001/health
# Deve retornar: 200 OK
```

### ✅ PASSO 7: Iniciar Frontend

**Executar:**
```bash
cd frontend
npm run dev
```

**Verificar com logs:**
- [ ] "VITE v5.x ready in XXX ms"
- [ ] "➜ Local: http://localhost:8080/"
- [ ] Nenhum erro de build?

**Verificar no navegador:**
- [ ] http://localhost:8080 carrega
- [ ] Nenhuma página em branco
- [ ] F12 DevTools não mostra erros

### ✅ PASSO 8: Testar Fluxo Completo

**1. Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"vip2026"}'
```
- [ ] Retorna token JWT válido?

**2. Criar Instância:**
```bash
# Usar token do login anterior
curl -X POST http://localhost:3001/api/instances \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-instance","adapter":"baileys"}'
```
- [ ] Retorna 201 Created?
- [ ] Objeto instância tem 'id' e status?

**3. Verificar Frontend:**
- [ ] Abrir http://localhost:8080 no navegador
- [ ] Fazer login com admin@gmail.com / vip2026
- [ ] Navegar para Instâncias
- [ ] Clicar botão "Nueva Instancia"
- [ ] **DEVE APARECER QR CODE NA TELA** ✅
- [ ] QR code é escaneável? Tentar com celular

**4. Verificar Logs:**
- Backend: `npm start` output deve mostrar QR sendo gerado
- Frontend (F12): Console deve mostrar evento 'qr' sendo recebido

---

## CRITÉRIO DE SUCESSO - Todos obrigatórios

- ✅ Página http://localhost:8080 carrega (VITE ready)
- ✅ Backend http://localhost:3001/health retorna 200
- ✅ Login funciona e gera JWT
- ✅ Criar instância retorna 201
- ✅ QR code é emitido pelo backend quando instância é criada
- ✅ Frontend recebe evento 'qr' via WebSocket
- ✅ QR code é exibido no navegador (visível para o usuário)
- ✅ QR code é escaneável com WhatsApp real
- ✅ Console do navegador (F12) sem erros críticos
- ✅ Logs backend sem "❌ ERROR" ou exceções não tratadas

---

## Se algo falhar:

**QR code não aparece no frontend:**
- [ ] Verificar console do navegador (F12 > Console)
- [ ] Verificar se WebSocket está conectado (Network > WS)
- [ ] Verificar logs backend para "QR Code gerado"
- [ ] Se não houver log, problema está no adapter ou service

**Frontend não carrega:**
- [ ] Verificar se `npm run dev` está rodando
- [ ] Verificar porta 8080: `netstat -ano | findstr :8080`
- [ ] Se porta em uso: `npx kill-port 8080`
- [ ] Verifi se há erro de compilação Vite

**Backend não responde:**
- [ ] Verificar se `npm start` está rodando
- [ ] Ver logs para erro de compilação ou inicialização
- [ ] Tentar: `cd backend && npm run build && npm start`
- [ ] Se database error: Verificar PostgreSQL está rodando

---

## INSTRUÇÕES FINAIS

1. Use esse checklist passo a passo
2. Não pule nenhuma etapa
3. Execute comandos de verificação após cada mudança
4. Se um passo falhar, PARAR e debugar problema específico
5. Depois de corrigir um problema, voltar ao checklist
6. Só considerar "pronto" quando TODOS os critérios de sucesso forem atingidos

**NÃO FINALIZE A TAREFA ATÉ QUE:**
- QR code está sendo gerado ✅
- Frontend está online ✅  
- Ambos funcionando juntos ✅
- Nenhum erro crítico nos logs ✅
