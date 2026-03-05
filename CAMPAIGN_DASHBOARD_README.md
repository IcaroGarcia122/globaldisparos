# 📊 Dashboard de Campanha em Tempo Real

Dashboard completo e profissional para acompanhamento de campanhas de disparo de mensagens WhatsApp em tempo real.

## 🎯 Características

✅ **Métricas em Tempo Real**
- Total de mensagens a enviar
- Mensagens enviadas ao vivo
- Mensagens entregues (✓✓)
- Mensagens lidas (✓✓ azul)
- Mensagens com erro (❌)
- Taxa de sucesso (%)
- Tempo decorrido
- Tempo estimado restante
- Velocidade atual (msgs/min)

✅ **Controles da Campanha**
- ▶️ Pausar / Retomar campanha
- ⏹️ Parar campanha (cancelar)
- ✏️ Editar mensagem em tempo real
- ⚡ Ajustar velocidade (msgs/segundo ou intervalo)
- 📊 Exportar relatório em CSV

✅ **Visualizações Avançadas**
- Gráfico de linha: Evolução de mensagens enviadas
- Gráfico de pizza: Status das mensagens
- Barra de progresso animada
- Lista de últimas mensagens (com scroll)
- Alertas automáticos

✅ **Design Responsivo**
- Interface dark mode elegante
- Animações suaves
- Totalmente responsivo (mobile, tablet, desktop)
- Tema consistente com o resto da aplicação

## 📦 Instalação

### 1. Dependências do Frontend

```bash
npm install recharts
```

### 2. Frontend - Adicionar ao Main Layout

No seu arquivo principal (App.tsx ou similar), importe o componente:

```typescript
import { CampaignDashboard } from './components/CampaignDashboard'

export function App() {
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)

  return (
    <div className="app">
      {/* Resto da aplicação */}
      
      {/* Dashboard fica em overlay quando uma campanha está ativa */}
      {activeCampaignId && (
        <CampaignDashboard 
          campaignId={activeCampaignId} 
          onClose={() => setActiveCampaignId(null)}
        />
      )}
    </div>
  )
}
```

### 3. Frontend - Iniciar Campanha

Quando o usuário clicar em "Iniciar Campanha":

```typescript
const handleStartCampaign = async () => {
  try {
    const response = await fetchAPI('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: campaignName,
        instanceId,
        message,
        contacts,
        settings: {
          speed: 10, // mensagens por minuto
          interval: 6 // segundos entre mensagens
        }
      })
    })

    // Abrir dashboard
    setActiveCampaignId(response.id)
    
  } catch (error) {
    console.error('Erro ao iniciar campanha:', error)
  }
}
```

### 4. Backend - Integração de Métricas

No seu `campaignService.ts`, implemente estes métodos:

```typescript
// Calcular métricas em tempo real
async getCampaignMetrics(campaignId: number) {
  const messages = await Message.findAll({
    where: { campaignId }
  })

  const campaign = await Campaign.findByPk(campaignId)
  
  const sent = messages.filter(m => m.status !== 'pending').length
  const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'read').length
  const read = messages.filter(m => m.status === 'read').length
  const error = messages.filter(m => m.status === 'error').length
  const pending = messages.filter(m => m.status === 'pending').length
  
  const total = messages.length
  const successRate = total > 0 ? ((sent - error) / total) * 100 : 0
  const elapsedTime = Math.floor((Date.now() - campaign.startedAt.getTime()) / 1000)
  const currentSpeed = elapsedTime > 0 ? (sent / elapsedTime) * 60 : 0
  const estimatedTime = currentSpeed > 0 ? Math.floor(((pending) / currentSpeed) * 60) : 0

  return {
    total,
    pending,
    sending: 0,
    sent,
    delivered,
    read,
    error,
    successRate,
    currentSpeed: Math.round(currentSpeed),
    elapsedTime,
    estimatedTime: Math.max(0, estimatedTime)
  }
}

// Timeline para gráfico
async getCampaignTimeline(campaignId: number) {
  const messages = await Message.findAll({
    where: { campaignId },
    order: [['createdAt', 'ASC']]
  })

  const timeline = []
  const startTime = messages[0]?.createdAt || new Date()
  
  // Agrupar por minuto
  for (let time = startTime.getTime(); time <= Date.now(); time += 60000) {
    const msgsUntilTime = messages.filter(m => m.createdAt.getTime() <= time)
    
    timeline.push({
      timestamp: new Date(time),
      sent: msgsUntilTime.filter(m => m.status !== 'pending').length,
      delivered: msgsUntilTime.filter(m => ['delivered', 'read'].includes(m.status)).length,
      read: msgsUntilTime.filter(m => m.status === 'read').length,
      error: msgsUntilTime.filter(m => m.status === 'error').length
    })
  }

  return timeline
}
```

## 🎨 Customização

### Cores do Dashboard

Edite as variáveis em `CampaignDashboard.css`:

```css
const COLORS = {
  sent: '#3B82F6',      // Azul
  delivered: '#10B981', // Verde
  read: '#8B5CF6',      // Roxo
  error: '#EF4444',     // Vermelho
  pending: '#6B7280'    // Cinza
}
```

### Intervalo de Atualização

Edite em `CampaignDashboard.tsx` (linha ~45):

```typescript
// Atualizar a cada 2 segundos
const interval = setInterval(fetchCampaignData, 2000)
```

Mude para o intervalo que desejar (em ms):
- 1000 = 1 segundo (mais atualizações, mais uso de CPU)
- 2000 = 2 segundos (recomendado)
- 5000 = 5 segundos (menos atualizações, mais econômico)

## 🔌 API Endpoints

### GET /api/campaigns/:id
Obter dados da campanha com métricas

**Resposta:**
```json
{
  "campaign": { ... },
  "metrics": {
    "total": 100,
    "sent": 45,
    "delivered": 42,
    "read": 38,
    "error": 3,
    "successRate": 42.0,
    "currentSpeed": 12,
    "elapsedTime": 180,
    "estimatedTime": 300
  },
  "recentContacts": [ ... ],
  "timeline": [ ... ]
}
```

### PATCH /api/campaigns/:id/status
Alterar status (running, paused, stopped)

**Body:**
```json
{
  "status": "paused"
}
```

### PATCH /api/campaigns/:id/message
Alterar mensagem

**Body:**
```json
{
  "message": "Nova mensagem para os contatos..."
}
```

### PATCH /api/campaigns/:id/speed
Ajustar velocidade

**Body:**
```json
{
  "speed": 15
}
```

**Nota:** Speed em mensagens por minuto

### GET /api/campaigns/:id/export
Exportar relatório em CSV

**Retorna:** Arquivo CSV com todos os dados da campanha

## 📱 Responsividade

O dashboard é totalmente responsivo:

- **Desktop (1024px+):** Grid completo com todos os gráficos
- **Tablet (768px-1023px):** Grid adaptado, gráficos em coluna única
- **Mobile (< 768px):** Layout full-width otimizado para toque

## 🎯 Casos de Uso

### 1. Monitoramento em Tempo Real
Abra o dashboard na tela enquanto a campanha roda. As métricas atualizam a cada 2 segundos.

### 2. Pausa e Retomada
Pausar a campanha para ajustar mensagens ou após atingir uma meta. Retome depois com um clique.

### 3. Controle de Velocidade
Se o servidor estiver sobrecarregado, reduza a velocidade. Se quiser acelerar, aumente.

### 4. Edição de Mensagem
Toda mensagem enviada a partir do momento da edição usará a nova mensagem. As anteriores permanecem inalteradas.

### 5. Relatórios
Ao final da campanha, exporte os dados completos para análise em planilha.

## ⚙️ Configuração Avançada

### Autenticação
O dashboard respeita o token JWT do usuário. Somente campanhas do usuário autenticado são acessíveis.

### Validações
- Velocidade: 1-60 msgs/min
- Mensagem: máx 4096 caracteres
- Status: apenas valores válidos aceitos

### Proteções
- Confirmação ao parar uma campanha
- Desabilitação de controles quando campanha terminar
- Erro handling em todas as requisições

## 🐛 Troubleshooting

**Dashboard não atualiza?**
- Verifique se o intervalo de polling está definido
- Confirme que as métricas são calculadas corretamente no backend

**Gráficos vazios?**
- Timeline precisa ter pelo menos 2 pontos de dados
- Certifique-se de que as mensagens têm timestamps

**Exportação não funciona?**
- Verifique permissões do usuário
- Confirme que Message model tem os campos necessários

## 📊 Performance

O dashboard foi otimizado para performance:

- Polling paraliza quando campanha está pausada
- Limita requisições desnecessárias
- Usa virtualization para listas grandes
- CSS otimizado com animações GPU-aceleradas

## 🔄 Sincronização

O dashboard sincroniza em 3 camadas:

1. **HTTP Polling** - Requisições GET a cada 2 segundos
2. **WebSocket** (opcional) - Implementar para atualizações <100ms
3. **Local State** - Cache em memória do React

## 📝 Alterações de Schema Necessárias

Seu modelo `Campaign` precisa ter estes campos:

```typescript
{
  id: number
  userId: number
  name: string
  message: string
  status: 'running' | 'paused' | 'stopped' | 'completed'
  totalContacts: number
  messagesSent: number
  messagesDelivered: number
  messagesFailed: number
  messageSpeed?: number      // msgs/min
  messageInterval?: number   // segundos
  startedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

E seu modelo `Message`:

```typescript
{
  id: number
  campaignId: number
  phone: string
  contactName?: string
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
  createdAt: Date
  updatedAt: Date
}
```

## 📈 Métricas Calculadas

- **Taxa de Sucesso** = (Mensagens Enviadas - Erros) / Total × 100
- **Velocidade Atual** = Mensagens Enviadas / Tempo Decorrido (em min)
- **Tempo Estimado** = Mensagens Pendentes / Velocidade Atual

## 🚀 Próximas Melhorias

- [ ] WebSocket para atualização <100ms
- [ ] Gráfico de horário de pico
- [ ] Resumo de erros mais detalhado
- [ ] Agendamento de campanhas
- [ ] Callbacks personalizados por status
- [ ] Integração com analytics

---

**Desenvolvido com ❤️ para Global Disparos**
