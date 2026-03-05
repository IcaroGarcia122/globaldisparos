# 🔧 Guia Passo-a-Passo para DELETAR Instâncias -  Versão Corrigida

## ✅ Status Confirmado
- **Backend**: 🟢 RODANDO em `http://localhost:3001`
- **Frontend**: 🟢 RODANDO em `http://localhost:8080`
- **Banco**: 🟢 CONECTADO
- **Anti-ban & Baileys**: 🟢 INTEGRADOS

---

## 📋 Teste Completo de Deleção (Passo a Passo)

### **PASSO 1: Abrir e Fazer Login**
1. Abra http://localhost:8080 no navegador
2. Faça login com suas credenciais
3. Verifique que o token foi salvo (F12 → Application → Local Storage → `token`)

### **PASSO 2: Criar Uma Instância de Teste**
1. Clique em **"Instâncias WhatsApp"** na sidebar esquerda (icon Smartphone)
2. Você deve ver o painel com:
   - **Lado Esquerdo**: Lista vazia ou com instâncias anteriores
   - **Lado Direito**: "Selecione uma instância..."
3. Clique no botão **"Nova Instância"** (verde com +)
4. Preencha o formulário:
   - **Nome da Instância**: `TESTE-DELETE-001`
   - **Idade da Conta**: `30`
5. Clique **"Criar"**
6. Aguarde confirmação verde: ✅ **"Sucesso! Instância criada com sucesso..."**

### **PASSO 3: Selecionar a Instância**
1. A nova instância deve aparecer na lista à esquerda
2. Você verá:
   - 📱 **TESTE-DELETE-001**
   - ❌ Status (vermelho = desconectado)
   - Sem número (porque não foi conectada)
3. **Clique uma vez** na instância para selecionar

### **PASSO 4: Visualizar Detalhes**
Após clicar, o painel direito deve mostrar:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    TESTE-DELETE-001
    ❌ Desconectado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Número: Não conectado
  Idade da Conta: 30 dias
  Criada em: [DATA E HORA]
  Conectada em: Não conectado
  
  [Gerar QR Code]  🗑️ [REMOVER]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **PASSO 5: DELETAR A INSTÂNCIA** 🗑️
1. Clique no botão **"REMOVER"** (vermelho, canto superior direito)
2. Uma janela deve aparecer: **"Tem certeza que deseja remover esta instância?"**
3. Clique **"OK"** para confirmar
4. **RESULTADO ESPERADO** (espere 2-3 segundos):
   - ✅ Notificação verde no canto superior direito: **"✅ Instância removida com sucesso!"**
   - A instância desaparece da lista à esquerda
   - O painel direito volta a mostrar "Selecione uma instância..."

---

## 🔍 Como Verificar nos Logs (F12)

### **Abrir DevTools**
- Pressione **F12** ou **Ctrl+Shift+I**
- Vá para aba **"Console"**

### **Ao Deletar, Você Deve Ver (em ordem)**:
```javascript
🗑️ deleteInstance chamado para: [ID-LONGO-UUID]
🗑️ Enviando DELETE request para /instances/[ID-LONGO-UUID]...
✅ Resposta recebida: {message: "Instância desconectada e removida"}
✅ Instância deletada com sucesso
🔄 Carregando instâncias novamente...
✅ Instâncias recarregadas após deleção
```

### **Se Ver ERRO**:
```javascript
❌ Erro ao deletar instância: [MENSAGEM DO ERRO]
Stack: [INFORMAÇÕES DO ERRO]
```

---

## 🌐 Como Verificar No Backend (Terminal)

O terminal do backend (rodando `node dist/server.js`) deve mostrar:
```
🗑️ DELETE INICIADO - Instância: [ID], Usuário: [USER-ID]
✅ Instância encontrada: TESTE-DELETE-001
✅ Disconnect realizado
✅ isActive definido como false no banco
✅ DELETE COMPLETADO
```

---

## ❌ Se Não Funcionar - Troubleshooting

### **Problema 1: Botão "Remover" Não Existe ou Está Desabilitado**

**Diagnóstico:**
- F12 → Console → Procure por erros
- Verifique se instância foi criada bem

**Solução:**
1. Recarregue página: F5
2. Limpe cache: F12 → Application → Clear Site Data
3. Refaça login

### **Problema 2: Clico Mas Nada Acontece**

**Diagnóstico:**
- F12 → Network → Procure por requisição DELETE
- Clique no botão → vá para Network → procure por `/instances/`
- Verifique o status da requisição

**Solução:**
1. Se status = **404**: Instância não existe
   - Crie nova instância de teste
2. Se status = **401**: Token expirou
   - Recarregue F5
   - Refaça login
3. Se status = **500**: Erro no backend
   - Verifique terminal do backend
   - Reinicie backend: `npm start`

### **Problema 3: Delete Funciona Mas Instância Fica Na Lista**

**Diagnóstico:**
- Recarregue página F5
- Veja se instância desapareceu

**Motivo Possível:**
- Instância foi deletada no banco (soft delete / isActive=false) mas o localStorage do cliente ainda tem cópia
- Solução: Recarregue a página (F5)

### **Problema 4: Botão Não Aparece**

**Diagnóstico:**
- Selecione instância
- Procure em "Detalhes da Instância" pelo texto "Remover"

**Solução:**
```bash
# Se elemento não aparece, pode ser CSS. Tente:
# F12 → Elements → Procure por "Remover"
# Se encontrar mas invisível → cheque z-index, display, visibility
```

---

## 🔄 Fluxo Completo de Deleção (Técnico)

```
┌─────────────────────────────────────────────┐
│ USUÁRIO CLICA "REMOVER"                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FRONTEND: deleteInstance()                   │
│ - Log: "🗑️ deleteInstance chamado"          │
│ - Mostra dialog confirmação                  │
└──────────────┬──────────────────────────────┘
               │
               ▼ Usuário clica OK
┌─────────────────────────────────────────────┐
│ ENVIAR: DELETE /api/instances/[ID]           │
│ Headers: Authorization: Bearer [TOKEN]      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ BACKEND: instances.ts - DELETE route        │
│ - Log: "🗑️ DELETE INICIADO"                 │
│ - Encontra instância no banco                │
│ - Chama baileysService.disconnect()          │
│ - Define isActive = false                    │
│ - Retorna 200 OK                             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ FRONTEND: Recebe resposta 200                │
│ - Log: "✅ Resposta recebida"               │
│ - Limpa selectedInstance                     │
│ - Chama reloadInstances()                    │
│ - Mostra notificação verde                   │
│ - Lista atualiza (instância desaparece)      │
└──────────────┬──────────────────────────────┘
               │
               ▼
        DELEÇÃO COMPLETA ✅
```

---

## 📊 Verificar no Banco de Dados (SQL)

Para confirmar que foi deletada (soft delete), execute:

```sql
-- Instâncias ATIVAS (que aparecem na lista)
SELECT name, status, is_active FROM whatsapp_instances 
WHERE user_id = 'seu-id-uuid' AND is_active = true;

-- Instâncias INATIVAS (soft deletadas, não aparecem)
SELECT name, status, is_active FROM whatsapp_instances 
WHERE user_id = 'seu-id-uuid' AND is_active = false;
```

Após deletar, a instância deve aparecer na segunda query (is_active = false).

---

## 🎯 Próximas Ações

1. **Teste agora** seguindo os passos 1-5
2. **Se funcionar**: 🎉 Parabéns! Sistema pronto
3. **Se não funcionar**: 
   - Abra DevTools (F12)
   - Siga o troubleshooting acima
   - Me mande exatamente o que vê no console

---

**Último Update**: 16/02/2026 - Backend 100% Online
**Status**: ✅ Sistema Operacional e 100% Testável
