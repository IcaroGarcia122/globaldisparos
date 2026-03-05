/**
 * Guia de Integração - Componentes React para WhatsApp SaaS
 * 
 * Este arquivo demonstra como integrar os componentes nas rotas da sua aplicação
 */

// ============================================================================
// 1. INTEGRAÇÃO COM REACT ROUTER
// ============================================================================

// app.tsx ou main.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WhatsAppSAASPage from './pages/WhatsAppSAAS';
import StatsDashboard from './pages/StatsDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página principal com todos os componentes */}
        <Route path="/whatsapp" element={<WhatsAppSAASPage />} />

        {/* Dashboard isolado */}
        <Route path="/stats" element={<StatsDashboard />} />

        {/* Outras rotas... */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// ============================================================================
// 2. INTEGRAÇÃO COM LAYOUT
// ============================================================================

// layouts/WhatsAppLayout.tsx
import React, { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';

interface WhatsAppLayoutProps {
  children: ReactNode;
}

export function WhatsAppLayout({ children }: WhatsAppLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar com menu */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Navigation />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// pages/Dashboard.tsx - usando layout
import { WhatsAppLayout } from '@/layouts/WhatsAppLayout';
import { StatsDashboard } from '@/pages/StatsDashboard';

export default function DashboardPage() {
  return (
    <WhatsAppLayout>
      <StatsDashboard />
    </WhatsAppLayout>
  );
}

// ============================================================================
// 3. INTEGRAÇÃO COM CONTEXT API (Para compartilhar estado)
// ============================================================================

// context/WhatsAppContext.tsx
import React, { createContext, useState } from 'react';

interface WhatsAppContextType {
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  selectedInstanceId: string;
  setSelectedInstanceId: (id: string) => void;
}

export const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');

  return (
    <WhatsAppContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        selectedInstanceId,
        setSelectedInstanceId,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
}

// Usar no App.tsx
import { WhatsAppProvider } from '@/context/WhatsAppContext';

function App() {
  return (
    <WhatsAppProvider>
      {/* Routes aqui */}
    </WhatsAppProvider>
  );
}

// Usar em componentes
import { useContext } from 'react';
import { WhatsAppContext } from '@/context/WhatsAppContext';

export function MyComponent() {
  const context = useContext(WhatsAppContext);
  
  return (
    <div>
      <p>Grupo: {context?.selectedGroupId}</p>
    </div>
  );
}

// ============================================================================
// 4. INTEGRAÇÃO COM TANSTACK QUERY (Para dados em cache)
// ============================================================================

// hooks/useGroups.ts
import { useQuery } from '@tanstack/react-query';

export function useGroups(instanceId: string) {
  return useQuery({
    queryKey: ['groups', instanceId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3001/api/groups/sync/${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return res.json();
    },
    enabled: !!instanceId,
  });
}

// components/GroupDispatchUI.tsx - versão com query
import { useGroups } from '@/hooks/useGroups';

export function GroupDispatchUIWithCache() {
  const [instanceId, setInstanceId] = useState('');
  const { data: groups = [], isLoading } = useGroups(instanceId);

  return (
    <div>
      {/* componente aqui */}
    </div>
  );
}

// ============================================================================
// 5. INTEGRAÇÃO COM ZUSTAND (State Management)
// ============================================================================

// store/whatsappStore.ts
import { create } from 'zustand';

interface WhatsAppStore {
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  selectedInstanceId: string;
  setSelectedInstanceId: (id: string) => void;
  groups: any[];
  setGroups: (groups: any[]) => void;
  syncGroups: (instanceId: string) => Promise<void>;
}

export const useWhatsAppStore = create<WhatsAppStore>((set) => ({
  selectedGroupId: '',
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
  selectedInstanceId: '',
  setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
  groups: [],
  setGroups: (groups) => set({ groups }),

  syncGroups: async (instanceId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/groups/sync/${instanceId}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const groups = await res.json();
      set({ groups });
    } catch (error) {
      console.error('Erro ao sincronizar grupos:', error);
    }
  },
}));

// Usar em componentes
import { useWhatsAppStore } from '@/store/whatsappStore';

export function MyComponent() {
  const { selectedGroupId, groups, syncGroups } = useWhatsAppStore();
  return <div>{/* usar */}</div>;
}

// ============================================================================
// 6. EXEMPLO COMPLETO: PÁGINA CUSTOMIZADA
// ============================================================================

// pages/DispatchCenter.tsx
import React, { useEffect, useState } from 'react';
import { GroupDispatchUI } from '@/components/GroupDispatchUI';
import { ExcelExportPreview } from '@/components/ExcelExportPreview';
import { Card } from '@/components/ui/card';
import { useWhatsAppStore } from '@/store/whatsappStore';

export default function DispatchCenter() {
  const { selectedGroupId, setSelectedGroupId, selectedInstanceId } = useWhatsAppStore();
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);

  useEffect(() => {
    // Listener para eventos de disparo
    const handleDispatchStart = (event: CustomEvent) => {
      setDispatchLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Disparo iniciado`,
      ]);
    };

    window.addEventListener('dispatch-start', handleDispatchStart as EventListener);
    return () => window.removeEventListener('dispatch-start', handleDispatchStart as EventListener);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Centro de Disparo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main */}
        <div className="lg:col-span-3">
          <GroupDispatchUI />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ExcelExportPreview groupId={selectedGroupId} />

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Log de Atividades</h3>
            <div className="h-64 overflow-y-auto bg-gray-50 rounded p-2 text-xs font-mono space-y-1">
              {dispatchLog.length > 0 ? (
                dispatchLog.map((log, i) => <p key={i}>{log}</p>)
              ) : (
                <p className="text-gray-400">Aguardando atividades...</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. EXEMPLO: INTEGRAÇÃO COM WEBSOCKET/SOCKET.IO
// ============================================================================

// hooks/useDispatchSocket.ts
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useDispatchSocket() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socket.on('dispatch:progress', (data) => {
      setProgress(data.progress);
      setStatus('sending');
    });

    socket.on('dispatch:complete', (data) => {
      setStatus('done');
      setProgress(100);
    });

    socket.on('dispatch:error', (data) => {
      setStatus('error');
      setError(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { status, progress, error };
}

// Usar em componente
export function DispatchWithSocket() {
  const { status, progress, error } = useDispatchSocket();

  return (
    <div>
      {status === 'sending' && <p>Enviando: {progress}%</p>}
      {status === 'done' && <p>Concluído!</p>}
      {error && <p>Erro: {error}</p>}
    </div>
  );
}

// ============================================================================
// 8. EXEMPLO: PROTEÇÃO COM AUTENTICAÇÃO
// ============================================================================

// hooks/useAuth.ts
export function useAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  const isAuthenticated = !!token && !!user;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return { isAuthenticated, token, user, logout };
}

// pages/ProtectedPage.tsx
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function ProtectedPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <WhatsAppSAASPage />;
}

// ============================================================================
// RESUMO DE IMPORTAÇÕES NECESSÁRIAS
// ============================================================================

/*
COMPONENTES:
- import { GroupDispatchUI } from '@/components/GroupDispatchUI';
- import { ExcelExportPreview } from '@/components/ExcelExportPreview';
- import StatsDashboard from '@/pages/StatsDashboard';
- import WhatsAppSAASPage from '@/pages/WhatsAppSAAS';

DEPENDÊNCIAS DE UI (shadcn/ui):
- @/components/ui/card
- @/components/ui/button
- @/components/ui/input
- @/components/ui/textarea
- @/components/ui/select
- @/components/ui/checkbox
- @/components/ui/alert

BIBLIOTECAS OPCIONAIS:
- react-router-dom (roteamento)
- @tanstack/react-query (cache de dados)
- zustand (state management)
- socket.io-client (tempo real)
- chart.js ou recharts (gráficos)
*/

/**
 * ============================================================================
 * PRÓXIMAS IMPLEMENTAÇÕES SUGERIDAS
 * ============================================================================
 *
 * 1. Adicionar gráficos ao StatsDashboard:
 *    - npm install recharts
 *    - Criar componentes de gráficos separados
 *    - Integrar com dados da API
 *
 * 2. Real-time updates com Socket.io:
 *    - Conectar ao servidor
 *    - Atualizar stats em tempo real
 *    - Mostrar progresso de disparo
 *
 * 3. Persistência local com IndexedDB:
 *    - Cache de grupos
 *    - Histórico de disparos
 *    - Sincronização offline-first
 *
 * 4. Validação de formulários:
 *    - react-hook-form
 *    - zod ou yup
 *    - feedback em tempo real
 *
 * 5. Testes automatizados:
 *    - Vitest para unitários
 *    - Playwright para E2E
 *    - Mock dos endpoints da API
 */
