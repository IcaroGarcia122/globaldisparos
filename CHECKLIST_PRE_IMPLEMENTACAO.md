# 📋 CHECKLIST PRÉ-IMPLEMENTAÇÃO

## ✅ Verificações de Sistema

### Docker & Containers
- [ ] `docker ps` - Verificar se Evolution API (8081) está rodando
- [ ] `docker-compose ps` - Listar todos os containers
- [ ] PostgreSQL em localhost:5432
- [ ] Redis em localhost:6379 (opcional)

### Backend
- [ ] `cd backend && npm run build` - Deve compilar sem erros
- [ ] `npm run start` - Backend inicia sem crashes
- [ ] Health check: `curl http://localhost:3001/health`
- [ ] Response: `{"status":"ok"}`

### Frontend
- [ ] `cd frontend && npm run dev` - Vite inicia sem erros
- [ ] Acesso: `http://localhost:5173`
- [ ] Login funciona: admin@gmail.com / vip2026

### Evolution API
- [ ] `curl http://localhost:8081/info` - API respond
- [ ] Credenciais configuradas em `.env`
- [ ] EVOLUTION_API_KEY válida

---

## 🚀 Primeiro Teste (5 minutos)

### 1. Criar Instância
```
POST http://localhost:3001/api/instances/create
Body: {
  "instanceName": "teste-disparador",
  "mobile": true
}
```
Esperado: Status 201, instance ID retornado

### 2. Gerar QR Code
```
GET http://localhost:3001/api/instances/{id}/qr
```
Esperado: Status 200, URL do QR code retornado (SEM erro 403! ✓)

### 3. Conectar WhatsApp
- Escanear QR code com celular
- Aguardar 20-30 segundos
- Status muda para "connected"

### 4. Listar Grupos
```
GET http://localhost:3001/api/instances/{id}/groups
```
Esperado: Array com grupos do WhatsApp

### 5. Enviar Mensagem de Teste
```
POST http://localhost:3001/api/instances/{id}/send-message
Body: {
  "phone": "5511999999999",
  "message": "Teste do Disparador Elite ✅"
}
```

---

## 💻 Teste do Disparador (15 minutos)

### 1. Acessar Interface
```
http://localhost:5173/disparador
```

### 2. Configurar Campanha
- [ ] Selecionar instância conectada
- [ ] Clicar "Atualizar Grupos"
- [ ] Selecionar 1+ grupos
- [ ] Escrever mensagem (ex: "Olá {nome}!")
- [ ] Ajustar intervalo (8000ms = 8 segundos)

### 3. Iniciar Campanha
- [ ] Clicar "🚀 Iniciar Campanha"
- [ ] Dashboard aparece com: Enviadas, Erros, Pendentes, Velocidade
- [ ] Barra de progresso preenchendo
- [ ] Tempo restante diminuindo

### 4. Monitorar
- [ ] Abrir DevTools (F12) → Console
- [ ] Procurar por: "campanha:progresso" events
- [ ] Cada evento mostra: current/total, %, ETA

### 5. Finalizar
- [ ] Aguardar campanha terminar
- [ ] Clicar em resultados para detalhes
- [ ] Verificar taxa de sucesso/falha

---

## 🔧 Se Algo Não Funcionar

### Backend não inicia
```powershell
# Terminal como Admin:
npm run build
npm run start
```

### Frontend branco
```powershell
# Limpar cache:
cd frontend
rm -r .next dist node_modules
npm install
npm run dev
```

### QR code retorna 403
✅ **JÁ CORRIGIDO** em instances.ts (linhas 214, 256, 328)

### Socket.IO não conecta
1. Verificar console do navegador (F12)
2. Verificar devtools da aplicação
3. Recarregar página (F5)

### Grupos vazios
- Criar um grupo real no WhatsApp
- Clicar "Atualizar Grupos" na interface
- Aguardar 5 segundos

---

## 📊 Sinais de Funcionamento Correto

```javascript
// Console do navegador (F12):
✅ "Socket IO connected!" 
✅ "campanha:progresso" eventos chegando
✅ Métricas atualizando em tempo real
✅ Sem erros em vermelho

// Terminal/Logs:
✅ Backend: "Server running on port 3001"
✅ Frontend: Vite compilando sem erros
✅ Evolution: Requests retornando HTTP 200
```

---

## 📈 Performance Expected

| Métrica | Valor |
|---------|-------|
| Taxa de Sucesso | 95-99% |
| Velocidade | 6-15 msgs/min |
| 100 contatos | ~7-10 min |
| Intervalo seguro | 5-10 segundos |
| Latência Socket.IO | ~50ms |

---

## 🎯 Próximas Etapas

1. **✉️ Teste de Volume** (100 contatos) → Verificar taxa de sucesso
2. **⏰ Agendamento** → Agendar campanha para depois
3. **📊 Analytics** → Ver métricas detalhadas
4. **🔄 Automação** → Campanhas recorrentes

---

## 🆘 Contato & Suporte

- **Arquivo de referência**: IMPLEMENTACAO_DISPARADOR_ELITE.md
- **Guia de testes**: GUIA_TESTE_DISPARADOR.md
- **Documentação rápida**: README_DISPARADOR_FINAL.md
- **Status detalhado**: RESUMO_IMPLEMENTACAO.json
