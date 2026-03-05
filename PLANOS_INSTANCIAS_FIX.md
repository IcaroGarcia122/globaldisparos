# 🔧 Correção: Limite de Instâncias por Plano

## 📋 Resumo do Problema

Usuários estavam recebendo erro **"Você atingiu o limite de instâncias ativas"** mesmo tendo nenhuma instância criada, porque:

1. O backend estava validando um limite **hardcoded de 10 instâncias** para todos os usuários
2. O plano do usuário **não era considerado** na validação
3. Novos usuários criados via Supabase recebiam plano `'free'` com limite **zero instâncias**

## ✅ Solução Implementada

### 1. **Mapeamento de Planos → Limites**
```typescript
const planInstanceLimits: Record<string, number> = {
  'free': 0,           // ❌ Sem instâncias (plano gratuito inativo)
  'basic': 1,          // ✅ 1 instância (mensal)
  'pro': 3,            // ✅ 3 instâncias (trimestral)
  'enterprise': 10     // ✅ 10 instâncias (anual)
};
```

### 2. **Arquivos Modificados**

#### **backend/src/middleware/auth.ts**
- ✅ Adicionado `plan` ao `req.user`
- ✅ Passou o plano do usuário para todas as rotas autenticadas

#### **backend/src/routes/instances.ts**
- ✅ Adicionado mapeamento de planos
- ✅ Validação dinâmica usando o plano do usuário
- ✅ Mensagens de erro mais descritivas com nome do plano

#### **backend/src/routes/auth.ts**
- ✅ Usuários de Supabase agora recebem plano `'basic'` por padrão
- ✅ Permite criar 1 instância imediatamente após registrar

#### **backend/src/routes/__tests__/instances.test.ts**
- ✅ Atualizado mocking de usuário com plano `'pro'`
- ✅ Atualizada validação de erro para mencionar o plano

#### **backend/src/routes/__tests__/instances.integration.test.ts**
- ✅ Usuário de teste principal: `plan: 'pro'` (3 instâncias)
- ✅ Usuários secundários: `plan: 'basic'` (1 instância)
- ✅ Atualizadas validações de erro

## 📊 Comportamento Anterior vs Novo

| Ação | Antes | Depois |
|------|-------|--------|
| Usuário novo Supabase | 0 instâncias (free) | 1 instância (basic) |
| Usuário novo Registro | 0 instâncias (free) | 1 instância (basic) |
| Erro ao atingir limite | "Máximo de 10..." | "Você atingiu o limite para seu plano..." |
| Validação do limite | Hardcoded em 10 | Baseada no plano do usuário |

## 🧪 Testes Afetados

- `instances.test.ts`: ✅ Atualizado com novo erro esperado
- `instances.integration.test.ts`: ✅ Atualizado com planos corretos

## 🚀 Próximas Etapas

1. **[OPCIONAL]** Adicionar rota para upgrade de plano
2. **[OPCIONAL]** Mostrar no frontend qual é o plano do usuário
3. **[OPCIONAL]** Adicionar aviso quando está próximo do limite

## 📝 Notas Técnicas

- Plano é armazenado em `User.plan` com valores: `'free' | 'basic' | 'pro' | 'enterprise'`
- O middleware de autenticação agora carrega o plano junto com as informações do usuário
- Validação acontece no endpoint `POST /instances`
- Limite é verificado **antes** de criar a instância
