# 🧪 GUIA DE TESTES - LIMITE DE 3 INSTÂNCIAS

## 1️⃣ Acessar o Sistema

### Pré-requisitos
- ✅ Backend rodando: `http://localhost:3001`
- ✅ Frontend rodando: `http://localhost:8080`
- ✅ Database PostgreSQL conectado

### Acesso
```
URL: http://localhost:8080
Email: seu@email.com
Senha: sua-senha
```

---

## 2️⃣ Teste 1: Criar Instância (Sucesso)

### Passos
1. Acesse http://localhost:8080
2. Faça Login
3. Clique no botão: **"Conectar WhatsApp"**
   - Abre modal "Gerenciar Conexões WhatsApp"
4. Como não há instâncias, aparecerá o formulário:
   - **Nome da Instância**: "Teste 1"
   - **Idade da Conta**: 30
5. Clique: **"Criar Instância"**

### Resultado Esperado
- ✅ Mensagem "Sucesso! Instância criada com sucesso"
- ✅ Modal fecha e recarrega
- ✅ Dropdown mostra "Teste 1"
- ✅ Vê botão "GERAR QR CODE"

---

## 3️⃣ Teste 2: Criar 2ª e 3ª Instâncias

### Passos
1. Clique no botão: **"Adicionar Nova Instância (1/3)"**
2. Preencha:
   - **Nome**: "Teste 2"
   - **Idade**: 30
3. Clique: **"Criar Instância"**
4. Repita para "Teste 3"

### Resultado Esperado
- ✅ Cada instância criada com sucesso
- ✅ Contador atualiza: (1/3) → (2/3) → (3/3)
- ✅ Após 3ª instância, botão "Adicionar Nova Instância" desaparece
- ✅ Dropdown mostra as 3 instâncias

---

## 4️⃣ Teste 3: Tentar Criar 4ª Instância (Deve Falhar)

### Passos
1. Com 3 instâncias ativas
2. Clique fora e volte para fechar/reabrir modal
3. Observe que **NÃO há botão "Adicionar Nova Instância"**
4. Se tentar via console:
   ```javascript
   fetch('http://localhost:3001/api/instances', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('token')}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ name: 'Teste 4', accountAge: 30 })
   }).then(r => r.json()).then(console.log)
   ```

### Resultado Esperado
- ✅ Resposta: **Status 409**
- ✅ Erro: `"Máximo de 3 instâncias ativas por usuário"`
- ❌ Instância NÃO é criada

---

## 5️⃣ Teste 4: Fechar Instância

### Passos
1. Com 3 instâncias ativas
2. Instância atual está no dropdown: "Teste 1"
3. Clique no botão: **"🗑️ Fechar"**
4. Confirme: "Tem certeza que deseja remover 'Teste 1'?"

### Resultado Esperado
- ✅ Modal fecha
- ✅ Dropdown atualiza para próxima instância
- ✅ Contador volta para (2/3)
- ✅ Botão "Adicionar Nova Instância" reaparece

---

## 6️⃣ Teste 5: Alternar Entre Instâncias

### Passos
1. Com 2-3 instâncias ativas
2. Na lista "Outras Instâncias", clique em uma instância
3. Observe dropdown atualizar

### Resultado Esperado
- ✅ Dropdown muda para instância selecionada
- ✅ Card "Conectar WhatsApp" renderiza com botão "GERAR QR CODE"
- ✅ Instância anterior move para "Outras Instâncias"

---

## 7️⃣ Teste 6: Persistência de Dados

### Passos
1. Com 3 instâncias ativas
2. Feche o navegador completamente
3. Reabra: http://localhost:8080
4. Faça login novamente
5. Clique: "Conectar WhatsApp"

### Resultado Esperado
- ✅ As 3 instâncias estão lá
- ✅ Dropdown mostra todas
- ✅ Contador: (3/3)
- ✅ Dados persistem no banco de dados

---

## 📊 Checklist de Validação

### Interface (Frontend)
- [ ] CreateInstance form aparece corretamente
- [ ] ConnectWhatsApp "GERAR QR CODE" botão visível
- [ ] Dropdown selector funciona
- [ ] Botão "🗑️ Fechar" visível e funcional
- [ ] Contador (X/3) atualiza
- [ ] Lista "Outras Instâncias" clicável

### API (Backend)
- [ ] GET /instances retorna apenas isActive=true
- [ ] POST /instances rejeita quando count ≥ 3 (erro 409)
- [ ] DELETE /instances/:id soft-deletes (isActive=false)
- [ ] Tokens JWT validados em cada request

### Database
- [ ] Instâncias aparecem como isActive=true após criação
- [ ] Instâncias marcadas como isActive=false após delete
- [ ] Dados persistem entre sessões

---

## 🐛 Se Algo Não Funcionar

### CreateInstance form não aparece
**Solução:**
```powershell
# Reload do Vite
# Pressione 'r' no terminal do npm run dev
# Ou CTRL+K depois ENTER para limpar cache
```

### Erro "Token inválido"
**Solução:**
```javascript
// Limpe localStorage
localStorage.clear();
// Recarregue a página e faça login novamente
```

### BackendNão responde (error 500)
**Solução:**
```bash
# Verifique se servidor está rodando
curl http://localhost:3001/health

# Reinicie backend
cd backend && npm start
```

### Instâncias antigas ainda aparecem
**Solução:**
```bash
# Já foi executado cleanup, mas se precisar rodar novamente:
cd backend && npx ts-node cleanup-instances.ts
```

---

## 📝 Logs Esperados

### Backend ao iniciar
```
✅ Database connected
🔄 Reconectando 0 instâncias salvas (ou mais se houver conectadas)
🚀 Servidor rodando em porta 3001
```

### Frontend ao criar instância
```
Console: POST /api/instances 201 Created
Modal fecha
Página recarrega
```

### Ao tentar criar 4ª instância
```
Console: POST /api/instances 409 Conflict
Error: "Máximo de 3 instâncias ativas por usuário"
```

---

## ✅ Testes Concluídos Com Sucesso!

Se todos os testes passarem, o sistema está pronto para:
- ✅ Produção
- ✅ Testes de carga
- ✅ Onboarding de usuários

---

**Data de Teste:** 16/02/2026  
**Versão Backend:** 1.0.0  
**Versão Frontend:** 0.0.0  
**Status:** ✅ PRONTO PARA PRODUÇÃO
