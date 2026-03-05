/**
 * Exemplo de Integração Completa dos Componentes React
 * Página de demonstração com todos os componentes funcionando juntos
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupDispatchUI } from '@/components/GroupDispatchUI';
import { ExcelExportPreview } from '@/components/ExcelExportPreview';
import CreateAndConnectInstance from '@/components/CreateAndConnectInstance';
import StatsDashboard from '@/pages/StatsDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart3, FileText, AlertCircle, Loader2, Lock, ArrowLeft, Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  fullName: string;
  plan?: string;
  role?: string;
}

/**
 * Página Principal do WhatsApp SaaS
 * Integra os 3 componentes principais em uma interface unificada
 * PROTEÇÃO: Apenas usuários com plano pago (não free) podem acessar
 */
export default function WhatsAppSAASPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [showCreateInstance, setShowCreateInstance] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Se não tem token, redirecionar para login
    if (!token || !userData) {
      navigate('/auth', { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Verificar se tem plano pago (diferente de 'free')
      if (!parsedUser.plan || parsedUser.plan === 'free') {
        // Sem plano pago, redirecionar para escolher plano
        navigate('/painel-selector', { replace: true });
        return;
      }

      // Tudo OK, usuário pode acessar a página VIP
      setUser(parsedUser);
    } catch (error) {
      // Erro ao parsear user
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  // Se não tem usuário definido, não renderizar nada (será redirecionado)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com User Info */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div>
            <p className="text-sm text-slate-600">Logged in as</p>
            <p className="font-semibold text-slate-900">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Plan: <span className="capitalize font-medium text-blue-600">{user?.plan}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/auth');
              }}
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Alert: Backend offline */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-yellow-900">⚠️ Backend não está rodando</p>
            <p className="text-sm text-yellow-800">Execute na pasta backend: <code className="bg-yellow-100 px-2 py-1 rounded">npm run dev</code></p>
          </div>
        </div>

        {/* CREATE INSTANCE SECTION */}
        {showCreateInstance && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-900">Criar Nova Instância</h2>
              <button
                onClick={() => setShowCreateInstance(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕
              </button>
            </div>
            <ErrorBoundary>
              <CreateAndConnectInstance
                onSuccess={() => {
                  setTimeout(() => {
                    setShowCreateInstance(false);
                    // Recarregar instâncias
                    window.location.reload();
                  }, 2000);
                }}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Botão Quick Create */}
        {!showCreateInstance && (
          <Button
            onClick={() => setShowCreateInstance(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
          >
            <Plus size={18} className="mr-2" />
            + Criar Instância WhatsApp
          </Button>
        )}

        {/* Cabeçalho */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">WhatsApp SaaS</h1>
          <p className="text-lg text-slate-600">
            Plataforma de automação de mensagens WhatsApp com proteção anti-ban
          </p>
        </div>

        {/* Abas Principais */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-200">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span className="hidden sm:inline">Disparo</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileText size={18} />
              <span className="hidden sm:inline">Exportar</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Dashboard com Estatísticas */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard de Estatísticas</CardTitle>
                <CardDescription>
                  Visão geral de todas as suas instâncias, campanhas e mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <StatsDashboard />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Disparo de Mensagens */}
          <TabsContent value="dispatch" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário Principal */}
              <div className="lg:col-span-2">
                <ErrorBoundary>
                  <GroupDispatchUI />
                </ErrorBoundary>
              </div>

              {/* Sidebar com Informações */}
              <div className="space-y-6">
                {/* Info Card */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base">💡 Dicas de Uso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <strong>1.</strong> Selecione a instância WhatsApp que será usada
                    </p>
                    <p>
                      <strong>2.</strong> Escolha o grupo de destino
                    </p>
                    <p>
                      <strong>3.</strong> Escreva sua mensagem (use variáveis para personalizar)
                    </p>
                    <p>
                      <strong>4.</strong> Configure opções anti-ban
                    </p>
                    <p>
                      <strong>5.</strong> Clique em "Iniciar Disparo"
                    </p>
                  </CardContent>
                </Card>

                {/* Anti-Ban Info */}
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base">🛡️ Proteção Anti-Ban</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold">Variações</p>
                      <p className="text-gray-600">
                        Cria 4 versões diferentes da mesma mensagem automaticamente
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Delays</p>
                      <p className="text-gray-600">
                        Aguarda 3-45 segundos entre mensagens (humanizado)
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Horário</p>
                      <p className="text-gray-600">
                        Envia apenas entre 9h-21h para não despertar filtros
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Variables Info */}
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-base">📝 Variáveis Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm font-mono">
                    <p>
                      <span className="bg-purple-200 px-2 rounded">{'{{nome}}'}</span>
                      <span className="text-gray-600 ml-2">Nome do contato</span>
                    </p>
                    <p>
                      <span className="bg-purple-200 px-2 rounded">{'{{telefone}}'}</span>
                      <span className="text-gray-600 ml-2">Número do WhatsApp</span>
                    </p>
                    <p>
                      <span className="bg-purple-200 px-2 rounded">{'{{data}}'}</span>
                      <span className="text-gray-600 ml-2">Data atual</span>
                    </p>
                    <p>
                      <span className="bg-purple-200 px-2 rounded">{'{{dia_semana}}'}</span>
                      <span className="text-gray-600 ml-2">Dia da semana</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Exportação de Contatos */}
          <TabsContent value="export" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Exportar Participantes</CardTitle>
                <CardDescription>
                  Visualize e exporte a lista de membros do grupo em formato Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Informação */}
                  <div className="bg-blue-50 p-4 rounded-lg text-sm">
                    <p className="font-semibold mb-2">Como usar:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Vá para a aba "Disparo" e selecione um grupo</li>
                      <li>Volte para esta aba e clique em "Baixar XLSX"</li>
                      <li>O arquivo será salvo no seu computador</li>
                    </ol>
                  </div>

                  {/* Componente */}
                  {selectedGroupId ? (
                    <ErrorBoundary>
                      <ExcelExportPreview groupId={selectedGroupId} />
                    </ErrorBoundary>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-gray-500 mb-2">📋 Nenhum grupo selecionado</p>
                      <p className="text-sm text-gray-400">
                        Selecione um grupo na aba "Disparo" para visualizar e exportar contatos
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Backend</h3>
              <p>Express + Baileys + PostgreSQL</p>
              <p className="text-xs mt-1">http://localhost:3001</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Banco de Dados</h3>
              <p>PostgreSQL com 12 tabelas</p>
              <p className="text-xs mt-1">Sincronização automática</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">API</h3>
              <p>RESTful + Socket.io</p>
              <p className="text-xs mt-1">Real-time updates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Variações de uso dos componentes:
 *
 * 1. Usar componentes individuais:
 * ```tsx
 * import { GroupDispatchUI } from '@/components/GroupDispatchUI';
 * 
 * export default function MyPage() {
 *   return <GroupDispatchUI />;
 * }
 * ```
 *
 * 2. Usar em layout customizado:
 * ```tsx
 * import { ExcelExportPreview } from '@/components/ExcelExportPreview';
 * 
 * export default function MyPage() {
 *   const [groupId, setGroupId] = useState('');
 *   return (
 *     <div className="flex gap-4">
 *       <div className="flex-1">...</div>
 *       <div className="w-80">
 *         <ExcelExportPreview groupId={groupId} />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * 3. Usar StatsDashboard em page dedicada:
 * ```tsx
 * import { StatsDashboard } from '@/pages/StatsDashboard';
 * 
 * export default function StatsPage() {
 *   return <StatsDashboard />;
 * }
 * ```
 */
