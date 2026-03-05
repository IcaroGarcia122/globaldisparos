# Componentes React - WhatsApp SaaS

Documentação dos componentes React criados para a interface do usuário.

## 📦 Componentes Disponíveis

### 1. GroupDispatchUI
**Arquivo**: `src/components/GroupDispatchUI.tsx`

Interface completa para disparo de mensagens em grupo com sistema anti-ban integrado.

#### Funcionalidades
- ✅ Seleção de instância WhatsApp
- ✅ Listagem dinâmica de grupos
- ✅ Composição de mensagens com variáveis
- ✅ Opções anti-ban configuráveis:
  - Variações de mensagem (4 alternativas)
  - Delays humanizados (3-45 segundos)
  - Respeito a horário comercial
  - Exclusão de administradores
  - Exclusão de já enviados

#### Uso
```tsx
import { GroupDispatchUI } from '@/components/GroupDispatchUI';

export default function Page() {
  return <GroupDispatchUI />;
}
```

#### Props
Nenhuma prop obrigatória. Busca instâncias via API.

#### Variáveis de Mensagem
- `{{nome}}` - Nome do contato
- `{{telefone}}` - Número de telefone
- `{{data}}` - Data atual
- `{{dia_semana}}` - Dia da semana

#### API Endpoints Utilizados
- `GET /api/instances` - Lista instâncias
- `GET /api/groups/sync/:instanceId` - Sincroniza grupos
- `POST /api/groups/:groupId/dispatch` - Inicia disparo

---

### 2. ExcelExportPreview
**Arquivo**: `src/components/ExcelExportPreview.tsx`

Visualização de participantes e exportação em Excel com filtros.

#### Funcionalidades
- ✅ Preview de contatos em tabela (50 primeiras linhas)
- ✅ Filtro de administradores
- ✅ Customização de nome do arquivo
- ✅ Download de arquivo XLSX com todos os contatos
- ✅ Informações estatísticas

#### Uso
```tsx
import { ExcelExportPreview } from '@/components/ExcelExportPreview';

export default function Page() {
  return <ExcelExportPreview groupId="123456" />;
}
```

#### Props
```tsx
interface ExcelExportPreviewProps {
  groupId?: string; // ID do grupo (se não fornecido, mostra alerta)
}
```

#### API Endpoints Utilizados
- `GET /api/groups/:groupId/participants` - Lista participantes
- `GET /api/groups/:groupId/export-xlsx` - Baixa arquivo Excel

---

### 3. StatsDashboard
**Arquivo**: `src/pages/StatsDashboard.tsx`

Dashboard completo com estatísticas em tempo real e monitoramento anti-ban.

#### Funcionalidades
- ✅ Resumo geral (instâncias, campanhas, mensagens)
- ✅ Taxa de sucesso
- ✅ Verificação anti-ban por instância
- ✅ Tabela detalhada de instâncias
- ✅ Auto-refresh configurável (10s, 30s, 60s)
- ✅ Alertas de banimento

#### Uso
```tsx
import { StatsDashboard } from '@/pages/StatsDashboard';

export default function StatsPage() {
  return (
    <div>
      <h1>Estatísticas</h1>
      <StatsDashboard />
    </div>
  );
}
```

#### Props
Nenhuma prop. Busca dados via API.

#### API Endpoints Utilizados
- `GET /api/stats/user` - Estatísticas gerais do usuário
- `GET /api/stats/antiban/status` - Status anti-ban de todas as instâncias

---

## 🔄 Fluxo de Integração Recomendado

### 1. Dashboard Principal
```tsx
import { StatsDashboard } from '@/pages/StatsDashboard';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1>WhatsApp SaaS - Dashboard</h1>
      <StatsDashboard />
    </div>
  );
}
```

### 2. Página de Disparo
```tsx
import { GroupDispatchUI } from '@/components/GroupDispatchUI';
import { ExcelExportPreview } from '@/components/ExcelExportPreview';
import { useState } from 'react';

export default function DispatchPage() {
  const [selectedGroupId, setSelectedGroupId] = useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <GroupDispatchUI />
      </div>
      <div>
        <ExcelExportPreview groupId={selectedGroupId} />
      </div>
    </div>
  );
}
```

---

## 📊 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────┐
│          Dashboard (StatsDashboard)                     │
│  - Visão geral de instâncias                            │
│  - Alertas de banimento                                 │
│  - Taxa de sucesso e mensagens                          │
└─────────────────────────────────────────────────────────┘
                         ↓
        ┌────────────────────────────────────┐
        │  Selecione Instância & Grupo       │
        │                                    │
   ┌────┴─────────────────────────────────┬─┴──────┐
   ↓                                       ↓        ↓
[GroupDispatchUI]              [ExcelExportPreview]
- Compose message              - Preview contacts
- Anti-ban config              - Filter (no admins)
- Send batch                    - Download XLSX

   ↓                                   ↓
[Send Messages]             [Contact List]
com delays humanizados       para uso externo
```

---

## ⚙️ Dependências de UI

Todos os componentes utilizam:
- `@/components/ui/card` - Containers
- `@/components/ui/button` - Botões
- `@/components/ui/input` - Inputs
- `@/components/ui/textarea` - Áreas de texto
- `@/components/ui/select` - Selects
- `@/components/ui/checkbox` - Checkboxes
- `@/components/ui/alert` - Alertas
- `lucide-react` - Ícones

Certifique-se que `shadcn/ui` está configurado no projeto.

---

## 🔐 Autenticação

Todos os componentes esperam um token no `localStorage`:
```tsx
const token = localStorage.getItem('token');
// Usado em headers: 'Authorization': `Bearer ${token}`
```

Certifique-se de realizar login antes de usar os componentes.

---

## 💾 Estados e Efeitos Colaterais

### GroupDispatchUI
- Busca instâncias ao montar
- Busca grupos quando instância muda
- Mantém estado de disparo (loading, erro, sucesso)

### ExcelExportPreview
- Busca contatos quando `groupId` muda
- Pode fazer download enquanto preview está sendo exibido

### StatsDashboard
- Busca dados ao montar
- Auto-refresh a cada 30s (configurável)
- Monitora status anti-ban continuamente

---

## 🚀 Próximos Passos

1. **Integrar em rotas** - Adicionar componentes às páginas de roteamento
2. **Testes E2E** - Testar fluxo completo com dados reais
3. **Real-time Updates** - Integrar Socket.io para atualizações ao vivo
4. **Gráficos** - Adicionar charts (Chart.js, Recharts) ao StatsDashboard
5. **Exportação de relatórios** - Adicionar PDF/CSV

---

## 🐛 Troubleshooting

### "Falha ao carregar instâncias"
- Verifique se backend está rodando em `http://localhost:3001`
- Confirme autenticação (token válido)

### "Falha ao carregar grupos"
- Instância deve estar conectada (`status: 'connected'`)
- WhatsApp Web deve estar sincronizado

### "Erro ao baixar arquivo"
- Servidor deve retornar `blob` com headers corretos
- Navegador deve permitir downloads

---

## 📝 Exemplo de Página Completa

```tsx
// pages/whatsapp.tsx
import { useState } from 'react';
import { GroupDispatchUI } from '@/components/GroupDispatchUI';
import { ExcelExportPreview } from '@/components/ExcelExportPreview';
import { StatsDashboard } from '@/pages/StatsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WhatsAppPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">WhatsApp SaaS</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="dispatch">Disparo</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <StatsDashboard />
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GroupDispatchUI />
            </div>
            <div>
              <ExcelExportPreview />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Backend está rodando e compilado
2. Banco de dados está sincronizado
3. Token de autenticação é válido
4. URLs das APIs estão corretas
5. CORS está habilitado no backend
