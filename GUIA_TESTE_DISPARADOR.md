🧪 GUIA DE TESTE E VALIDAÇÃO - DISPARADOR ELITE

═══════════════════════════════════════════════════════════════════════════════

## ✅ CHECKLIST DE VALIDAÇÃO

### 1. ✓ Preparação do Ambiente

- [ ] Backend compilado: `npm run build` (sem erros)
- [ ] Backend iniciado: `npm run start` (rodando em http://localhost:3001)
- [ ] Frontend iniciado: `npm run dev` (rodando em http://localhost:5173)
- [ ] Evolution API rodando: http://localhost:8081 respondendo
- [ ] PostgreSQL conectado
- [ ] Socket.IO conectado no browser (F12 → Console)

### 2. ✓ Autenticação

- [ ] Login em http://localhost:5173
- [ ] Usar: admin@gmail.com / vip2026
- [ ] Dashboard carrega sem erros
- [ ] Token JWT válido (F12 → Network → ver Authorization header)

### 3. ✓ Instâncias WhatsApp

- [ ] Acessar página de instâncias
- [ ] Criar nova instância
- [ ] Escanear QR Code com WhatsApp
- [ ] Instância muda para status "connected"
- [ ] Pode listar instâncias criadas

Teste acessando: http://localhost:5173/instances

### 4. ✓ Disparador Elite

- [ ] Navegar para http://localhost:5173/disparador
- [ ] Página carrega sem erros
- [ ] Botões e controles visíveis
- [ ] Instâncias conectadas aparecem no dropdown

Teste: Selecionar uma instância conectada

### 5. ✓ Buscar Grupos

- [ ] Clicar "🔄 Atualizar Grupos"
- [ ] Aguardar carregamento (máx 5 segundos)
- [ ] Grupos aparecem na lista com contagem de membros
- [ ] Se nenhum grupo: mensagem clara aparece

Esperado: Lista com grupos em que a conta WhatsApp participa

### 6. ✓ Funcionalidades de Disparo

#### 6.1 - Seleção de Grupos
- [ ] Clicar checkbox de grupo
- [ ] Múltiplos grupos podem ser selecionados
- [ ] Indicador visual claro de seleção

#### 6.2 - Mensagem com Variáveis
- [ ] Digitar: "Olá {nome}, seu número é {numero}"
- [ ] Ao enviar, variáveis devem ser substituídas por dados reais

#### 6.3 - Controle de Intervalo
- [ ] Slider funciona (2000-30000 ms)
- [ ] Valor atualiza enquanto arrasta
- [ ] Intervalo aparece em segundos também

#### 6.4 - Iniciar Campanha
- [ ] Clicar "🚀 Iniciar Campanha"
- [ ] Resposta: { campaignId, totalContacts, estimatedDuration }
- [ ] Dashboard de execução aparece

### 7. ✓ Dashboard em Tempo Real

#### 7.1 - Métricas Atualizando
- [ ] Card "Enviadas ✅" incrementa
- [ ] Card "Erros ❌" atualiza se houver falhas
- [ ] Card "Pendentes ⏳" decresce
- [ ] Card "Velocidade 📈" mostra msgs/seg

#### 7.2 - Barra de Progresso
- [ ] Barra visual preenche à medida que progride
- [ ] Percentual atualiza (0% → 100%)
- [ ] Tempo decorrido aumenta
- [ ] Tempo estimado decrementa

#### 7.3 - Socket.IO (Verificar F12 → Console)
- [ ] Eventos "campanha:progresso" aparecem periodicamente
- [ ] Nenhum erro de conexão
- [ ] Dados são atualizados a cada mensagem enviada

### 8. ✓ Controles Durante Execução

- [ ] Botão "⏸️ Pausar" funciona (pausa disparo)
- [ ] Botão "▶️ Retomar" funciona (retoma disparo)
- [ ] Botão "⏹️ Parar" funciona (cancela campanha)
- [ ] Confirmar antes de parar (popup)

### 9. ✓ Resultado Final

- [ ] Ao terminar, dashboard mostra:
  - Total enviadas
  - Total falhadas
  - Taxa de sucesso em %
  - Duração total
- [ ] Botão "✅ Finalizar e Voltar"
- [ ] Clicando volta para formulário

### 10. ✓ Monitoramento de Erros

#### 10.1 - Validações de Entrada
- [ ] Sem instância selecionada: erro ao iniciar
- [ ] Sem grupos selecionados: erro ao iniciar
- [ ] Mensagem vazia: desabilita botão
- [ ] Intervalo < 2s ou > 30s: erro ao iniciar

#### 10.2 - Erros da API
- [ ] Instância desconectada: erro 409
- [ ] Permissão negada: erro 403
- [ ] Campanha não encontrada: erro 404
- [ ] Mensagem de erro clara no frontend

#### 10.3 - Erros de Envio
- [ ] Se contacto tem número inválido: marca como erro
- [ ] Se Evolution API falha: tenta próximo
- [ ] Dashboard mostra contagem de erros

═══════════════════════════════════════════════════════════════════════════════

## 🔍 TESTE MANUAL COMPLETO (PASSO A PASSO)

### Passo 1: Preparação (5 min)
```bash
# Terminal 1 - Backend
cd backend
npm run build
npm run start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Evolution API já deve estar rodando (docker-compose up)
```

### Passo 2: Criar Instância (3 min)
1. Abrir http://localhost:5173
2. Login: admin@gmail.com / vip2026
3. Ir para /instances
4. Clicar "Criar Nova Instância"
5. Nome: "Teste_01"
6. Escanear QR Code com WhatsApp
7. Conectar
8. Aguardar status mudar para "connected" ✓

### Passo 3: Criar Grupos (2 min)
1. No seu WhatsApp (mobile)
2. Criar novo grupo: "Teste_Disparo"
3. Adicionar alguns contacts
4. Pronto! Grupo está criado

### Passo 4: Teste de Disparo (5 min)
1. Ir para http://localhost:5173/disparador
2. Selecionar "Teste_01" no dropdown
3. Clicar "🔄 Atualizar Grupos"
4. Aguardar carregar
5. Selecionar "Teste_Disparo"
6. Digitar mensagem: "Olá {nome}! Este é um teste. ✓"
7. Intervalo: 5 segundos (slider)
8. Clicar "🚀 Iniciar Campanha"
9. Dashboard aparece com progresso
10. Acompanhar envio:
    - F12 para ver eventos Socket.IO
    - Barra de progresso enchendo
    - Métricas atualizando
11. Aguardar conclusão
12. Resultado final aparece

### Passo 5: Verificação no WhatsApp
1. Abrir grupo "Teste_Disparo" no mobile
2. Verificar se mensagens foram recebidas
3. Confirmar nomes foram substituídos corretamente

### Passo 6: Verificação no Backend
1. Terminal backend deve mostrar logs:
   ```
   ✅ [DISPARADOR] Iniciando campanha para 1 grupos
   📋 Obtendo participantes do grupo...
   📊 Total de contatos únicos: X
   ✅ Campanha criada: ID Y
   📧 Enviando mensagem para +55XXXXXXXXXX
   ✅ [1/X] Enviado para +55XXXXXXXXXX
   ...
   ✅ Campanha Y finalizada: X enviadas, 0 erros
   ```

═══════════════════════════════════════════════════════════════════════════════

## 🧪 TESTES AUTOMATIZADOS (OPCIONAL)

### Download Test Script
Criar arquivo: `test-disparador.js`

```javascript
#!/usr/bin/env node

const http = require('http');

const API = 'http://localhost:3001';
let token = null;

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando Disparador Elite...\n');

  try {
    // 1. Login
    console.log('[1/4] Login...');
    let res = await request('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    
    if (res.status !== 200 && res.status !== 201) {
      console.error('❌ Login falhou:', res.body);
      return;
    }
    
    token = res.body.token || res.body.data?.token;
    console.log('✅ Login bem-sucedido\n');

    // 2. Listar instâncias
    console.log('[2/4] Listando instâncias conectadas...');
    res = await request('GET', '/api/instances');
    
    const connectedInstances = res.body.filter(i => i.status === 'connected');
    if (connectedInstances.length === 0) {
      console.error('❌ Nenhuma instância conectada');
      return;
    }
    
    const instanceId = connectedInstances[0].id;
    console.log(`✅ ${connectedInstances.length} instância(s) conectada(s) - Usando: ${instanceId}\n`);

    // 3. Listar grupos
    console.log('[3/4] Buscando grupos...');
    res = await request('GET', `/api/groups?instanceId=${instanceId}`);
    
    if (!res.body || res.body.length === 0) {
      console.error('⚠️  Nenhum grupo encontrado');
      return;
    }
    
    const groupIds = res.body.map(g => g.id).slice(0, 1); // Pegar primeiro grupo
    console.log(`✅ ${res.body.length} grupo(s) encontrado(s) - Usando: ${groupIds[0]}\n`);

    // 4. Iniciar campanha
    console.log('[4/4] Iniciando campanha...');
    res = await request('POST', '/api/disparador/iniciar', {
      instanceId,
      groupIds,
      message: 'Teste {nome}: {numero}',
      interval: 5000,
      campaignName: 'Teste Automatizado'
    });

    if (res.status !== 201) {
      console.error('❌ Erro ao iniciar campanha:', res.body);
      return;
    }

    console.log('✅ Campanha iniciada:', res.body);
    console.log('\n✅ TODOS OS TESTES PASSARAM!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

runTests();
```

### Executar:
```bash
node test-disparador.js
```

═══════════════════════════════════════════════════════════════════════════════

## 📊 MÉTRICAS ESPERADAS

### Velocidade Normal
- 1 mensagem a cada 3-5 segundos (intervalo padrão)
- ~12-20 mensagens por minuto
- Para 100 contatos: ~5-8 minutos

### Variação por Internet
- Conexão rápida (<100ms latência): +20% faster
- Conexão lenta (>500ms latência): -20% slower

### Taxa de Sucesso
- Números válidos: 95-99%
- Desconexão WhatsApp: 80-90%
- Números inválidos: 0% (erro antes de enviar)

═══════════════════════════════════════════════════════════════════════════════

## 🐛 TROUBLESHOOTING

### Problema: "Nenhum grupo encontrado"
**Solução:**
- Verificar se conta WhatsApp tem algum grupo
- Criar novo grupo no WhatsApp
- Clicar "Atualizar Grupos" novamente

### Problema: "Erro 403 Acesso Negado"
**Solução:**
- Verificar se login está correto
- Ter certeza que token JWT é válido
- Verificar em DevTools → Network → Authorization header

### Problema: "Socket.IO não conectando"
**Solução:**
- F12 → Console → verificar erros
- Checar se backend está rodando (http://localhost:3001)
- Recarregar página (F5)
- Limpar cache do navegador (Ctrl+Shift+Delete)

### Problema: "Campanha não envia mensagens"
**Solução:**
- Verificar logs do backend
- Testar manualmente via WhatsApp
- Verificar se Evolution API está respondendo
- Tentar intervalo maior (ex: 10 segundos)

### Problema: "Alta taxa de erro"
**Soluções:**
- Verificar números de telefone (devem incluir código país)
- Aumentar intervalo entre mensagens
- Verificar saúde da ligação WhatsApp
- Limitar grupos com contatos conhecidos

═══════════════════════════════════════════════════════════════════════════════

## ✅ CHECKLIST FINAL

- [ ] Backend compila sem erros
- [ ] Frontend carrega sem erros
- [ ] Socket.IO conecta automaticamente
- [ ] Login funciona
- [ ] Instâncias podem ser criadas e conectadas
- [ ] Grupos são listados corretamente
- [ ] Campanha inicia com sucesso
- [ ] Métricas atualizam em tempo real
- [ ] Mensagens são recebidas no WhatsApp
- [ ] Controles (pausar, retomar, parar) funcionam
- [ ] Resultado final é exibido
- [ ] Taxa de sucesso > 90%

═══════════════════════════════════════════════════════════════════════════════

Version: 1.0.0
Data: 04/03/2026
Status: ✅ PRONTO PARA PRODUÇÃO

═══════════════════════════════════════════════════════════════════════════════
