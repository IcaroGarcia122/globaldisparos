# Guide para Testar Funcionalidade de Deleção de Instâncias

## Status dos Servidores ✅
- **Backend**: Rodando em `http://localhost:3001` ✅
- **Frontend**: Rodando em `http://localhost:8080` ✅  
- **Banco**: Conectado ✅

## Passo a Passo para Testar Deleção

### 1. Abrir Aplicação
```
http://localhost:8080
```

### 2. Fazer Login (se necessário)
- Use suas credenciais Supabase
- Verifique se o token foi salvo em `localStorage`

### 3. Criar Instância (Teste)
1. Clique em **"Instâncias WhatsApp"** na sidebar (aba com ícone de Smartphone)
2. Clique em **"Nova Instância"** (botão rosa com +)
3. Preencha:
   - **Nome**: "Teste Deleção"
   - **Idade**: 30 dias
4. Clique **"Criar"**
5. Aguarde confirmação verde "Sucesso!"

### 4. Verificar Instância no Console
Abra **DevTools** (F12) → **Console** e execute:
```javascript
localStorage.getItem('token')
```
Se retornar um token, você está autenticado ✅

### 5. Testar Deleção
1. Clique na instância criada na lista (lado esquerdo)
2. No painel direito, clique no botão **"Remover"** (vermelho)
3. Confirme "Tem certeza que deseja remover..." → **OK**
4. **Observar Console (F12)**:
   - Você deve ver mensagens como:
     ```
     🗑️ deleteInstance chamado para: [ID]
     🗑️ Enviando DELETE request para /instances/[ID]...
     ✅ Resposta recebida: {message: "Instância desconectada e removida"}
     ✅ Instância deletada com sucesso
     🔄 Carregando instâncias novamente...
     ✅ Instâncias recarregadas após deleção
     ```

### 6. Verificar Log do Backend
Terminal backend deve mostrar logs como:
```
🗑️ DELETE INICIADO - Instância: [ID], Usuário: [USER_ID]
✅ Instância encontrada: Teste Deleção
✅ Disconnect realizado
✅ isActive definido como false no banco
✅ DELETE COMPLETADO
```

## Problemas Comuns & Soluções

### ❌ "Instância não encontrada"
**Causa**: Usuário não autenticado ou instância não pertence ao usuário
**Solução**: 
1. Verifique se está logado
2. Recarregue a página (F5)
3. Verifique console (F12) se há erro de token

### ❌ "Erro ao deletar instância"
**Causa**: Problema na conexão com backend
**Solução**:
1. Verifique se backend está rodando: `curl http://localhost:3001/health`
2. Verifique DevTools → Network para ver erro HTTP
3. Reinicie backend: `npm start` em `backend/`

### ❌ Instância não desaparece da lista
**Causa**: Frontend não atualizando estado corretamente
**Solução**:
1. Recarregue página: F5
2. Limpe localStorage: DevTools → Application → Storage
3. Verifique que instância foi marcada como `isActive: false` no banco

### ❌ Nenhum log no console
**Causa**: DevTools não aberto ou aplicação não recompilou
**Solução**:
1. Abra DevTools: F12
2. Tab "Console"
3. Recarregue página: F5
4. Tente deletar novamente

## SQL para Verificar Banco (Opcional)
```sql
-- Ver instâncias ativas
SELECT id, name, status, is_active, created_at 
FROM whatsapp_instances 
WHERE is_active = true;

-- Ver instâncias deletadas (soft delete)
SELECT id, name, status, is_active, deleted_at 
FROM whatsapp_instances 
WHERE is_active = false;
```

## Arquivos Modificados Recently
- `backend/src/routes/instances.ts` - Adicionado logging no DELETE
- `frontend/src/pages/InstanceManager.tsx` - Adicionado logging detalhado
- Ambos os servidores recompilados e reiniciados

---

**Última Atualização**: 16/02/2026
**Status**: ✅ Sistema Online e Testável
