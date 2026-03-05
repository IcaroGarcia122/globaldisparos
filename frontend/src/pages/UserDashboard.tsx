import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HelpCenterTab from '@/components/HelpCenterTab';
import ConnectWhatsApp from '@/components/ConnectWhatsAPP';
import CreateInstance from '@/components/CreateInstance';
import EliteDispatcher from '@/components/EliteDispatcher';
import GroupToXlsxExporter from '@/components/GroupToXlsxExporter';
import GroupManager from '@/components/GroupManager';
import WarmupCloud from '@/components/WarmupCloud';
import GoalsTracker from '@/components/GoalsTracker';
import InstanceManager from './InstanceManager';
import { fetchAPI } from '@/config/api';
import { useBackendAuth } from '@/hooks/useBackendAuth';
import {
  LayoutGrid, Send, Users, Clock, MessageSquare, Flame, Star, Plus, Zap, Shield, Play,
  ChevronRight, Download, Search, RefreshCw, Upload, ChevronDown, BarChart3,
  CheckCircle2, XCircle, AlertCircle, Menu, X, LogOut, Settings, Activity, CreditCard, User,
  HelpCircle, BookOpen, Headphones, MessageCircle, Smartphone, ShieldCheck, ChevronUp
} from 'lucide-react';

type Tab = 'dashboard' | 'instancias' | 'disparo' | 'contatos' | 'logs' | 'grupos' | 'aquecimento' | 'conquistas' | 'plano' | 'ajuda';

const UserDashboard: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useBackendAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [disparoStep, setDisparoStep] = useState(1);
  const [userName, setUserName] = useState('Usuário');
  const [userEmail, setUserEmail] = useState('--');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [deletingInstanceId, setDeletingInstanceId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false);
  const [selectedInstanceIndex, setSelectedInstanceIndex] = useState(0);
  const [contactLists, setContactLists] = useState<any[]>([]);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [totalMessagesSent, setTotalMessagesSent] = useState(0);
  const [showInstanceSuccessMessage, setShowInstanceSuccessMessage] = useState(false);

  // Carregar instâncias do usuário
  const reloadInstances = async () => {
    setLoadingInstances(true);
    try {
      console.log('🔄 Carregando instâncias...');
      const response = await fetchAPI('/instances');
      // API retorna {data: [...], pagination: {...}} ou {instances: [...], pagination: {...}}
      const data = response?.data || response?.instances || response || [];
      console.log(`✅ ${data.length} instância(s) carregada(s):`, data);
      setInstances(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedInstanceIndex(0);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
    } finally {
      setLoadingInstances(false);
    }
  };

  // Deletar instância
  const deleteInstance = async (instanceId: string) => {
    setDeletingInstanceId(instanceId);
    try {
      console.log(`🗑️ Deletando instância ${instanceId}...`);
      const response = await fetchAPI(`/instances/${instanceId}`, {
        method: 'DELETE'
      });
      console.log(`✅ Instância ${instanceId} deletada:`, response);
      // Aguarda um pouco para mostrar feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      // Recarrega a lista
      await reloadInstances();
    } catch (error: any) {
      console.error('❌ Erro ao deletar instância:', error);
      alert(`Erro ao deletar instância: ${error.message || 'Tente novamente.'}`);
    } finally {
      setDeletingInstanceId(null);
    }
  };

  // Carregar listas de contatos
  const reloadContactLists = async () => {
    try {
      const data = await fetchAPI('/contacts');
      setContactLists(data || []);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  };

  // Carregar dados de disparos
  const loadDisparoStats = async () => {
    try {
      const data = await fetchAPI('/stats/user');
      setTotalMessagesSent(data.totalMessagesSent || 0);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Criar nova lista de contatos
  const createNewList = async () => {
    if (!newListName.trim()) {
      alert('Digite um nome para a lista');
      return;
    }
    try {
      await fetchAPI('/contacts', {
        method: 'POST',
        body: { name: newListName }
      });
      setNewListName('');
      setShowNewListModal(false);
      reloadContactLists();
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      alert('Erro ao criar lista');
    }
  };

  useEffect(() => {
    // Só carrega instâncias após auth estar pronto e se está autenticado
    if (!authLoading && isAuthenticated) {
      // Validar limite de plano primeiro
      const validateAndLoad = async () => {
        try {
          const validation = await fetchAPI('/instances/cleanup/validate-plan-limit', {
            method: 'POST'
          });
          if (validation.cleaned > 0) {
            console.log(`🧹 ${validation.cleaned} instâncias excedentes limpas`);
          }
        } catch (error) {
          console.warn('⚠️ Erro na validação (não crítico):', error);
        }
        // Então carregar instâncias
        await reloadInstances();
        reloadContactLists();
        loadDisparoStats();
      };
      
      validateAndLoad();
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.fullName || userData.email?.split('@')[0] || 'Usuário');
        setUserEmail(userData.email || '--');
      } catch {
        // Falha ao parsear, deixa valores padrão
      }
    }
  }, []);

  const sidebarItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: <LayoutGrid size={18} /> },
    { id: 'instancias', label: 'Instâncias WhatsApp', icon: <Smartphone size={18} /> },
    { id: 'disparo', label: 'Disparador Elite', icon: <Send size={18} /> },
    { id: 'contatos', label: 'Listas de Contatos', icon: <Users size={18} /> },
    { id: 'logs', label: 'Logs de Atividade', icon: <Clock size={18} /> },
    { id: 'grupos', label: 'Gestão de Grupos', icon: <MessageSquare size={18} /> },
    { id: 'aquecimento', label: 'Aquecimento Cloud', icon: <Flame size={18} /> },
    { id: 'conquistas', label: 'Placas de Metas', icon: <Star size={18} /> },
    { id: 'plano', label: 'Meu Plano', icon: <CreditCard size={18} /> },
    { id: 'ajuda', label: 'Central de Ajuda', icon: <HelpCircle size={18} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="animate-fade-in space-y-8">
            <header className="dashboard-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-brand-500/20">
              <div>
                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">Resumo</span>
                <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
                  Olá, {userName}
                </h1>
                <p className="text-slate-500 text-sm mt-1">Bem-vindo ao seu centro de comando.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowConnectModal(!showConnectModal)}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-6 md:px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-brand-500/20 active:scale-95 border border-white/10">
                  <Plus size={16} />
                  Conectar WhatsApp
                </button>
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl border bg-white/5 border-white/5 text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {instances.length > 0 ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </header>

            {/* Success Message */}
            {showInstanceSuccessMessage && (
              <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-start gap-4">
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-black text-emerald-400 mb-1">Instância criada com sucesso! 🎉</h3>
                  <p className="text-xs text-slate-300 mb-3">Acesse a seção de <span className="font-black">Instâncias</span> para conectar seu WhatsApp e começar a usar todas as funcionalidades.</p>
                  <button
                    onClick={() => {
                      setActiveTab('instancias');
                      setShowInstanceSuccessMessage(false);
                    }}
                    className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    Ir para Instâncias <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {showConnectModal && (
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-white uppercase">Gerenciar Conexões WhatsApp</h2>
                  <button
                    onClick={() => setShowConnectModal(false)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {instances.length === 0 ? (
                  <CreateInstance onSuccess={() => {
                    reloadInstances();
                    setShowConnectModal(false);
                  }} />
                ) : (
                  <div className="space-y-6">
                    {/* Instância Principal Selecionada */}
                    {instances[selectedInstanceIndex] && (
                      <>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                            Instância Ativa ({selectedInstanceIndex + 1}/{instances.length})
                          </label>
                          <div className="flex items-center gap-3">
                            <select
                              value={instances[selectedInstanceIndex]?.id || ''}
                              onChange={(e) => {
                                const idx = instances.findIndex(i => i.id === e.target.value);
                                if (idx !== -1) setSelectedInstanceIndex(idx);
                              }}
                              className="flex-1 bg-[#1c2433] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                            >
                              {instances.map((instance) => (
                                <option key={instance.id} value={instance.id}>
                                  {instance.name} - {instance.status === 'connected' ? '✅' : '⏳'}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const instanceId = instances[selectedInstanceIndex]?.id;
                                const instanceName = instances[selectedInstanceIndex]?.name;
                                if (!instanceId) return;
                                if (confirm(`Tem certeza que deseja remover "${instanceName}"?`)) {
                                  deleteInstance(instanceId);
                                  const newIdx = Math.max(0, selectedInstanceIndex - 1);
                                  setSelectedInstanceIndex(newIdx);
                                }
                              }}
                              disabled={deletingInstanceId === instances[selectedInstanceIndex]?.id}
                              className="bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-500 border border-rose-500/30 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2"
                            >
                              {deletingInstanceId === instances[selectedInstanceIndex]?.id ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  Removendo...
                                </>
                              ) : (
                                <>
                                  🗑️ Remover
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Card de Conexão */}
                        <div className="bg-[#1c2433] border border-white/5 p-6 rounded-2xl">
                          <ConnectWhatsApp instanceId={instances[selectedInstanceIndex]?.id} onConnected={() => reloadInstances()} />
                        </div>
                      </>
                    )}

                    {/* Seção para Adicionar Nova Instância */}
                    {instances.length < 10 && (
                      showCreateInstanceModal ? (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-white uppercase">Nova Instância ({instances.length}/10)</h3>
                            <button
                              onClick={() => setShowCreateInstanceModal(false)}
                              className="text-slate-500 hover:text-white transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <CreateInstance onSuccess={() => {
                            reloadInstances();
                            setShowCreateInstanceModal(false);
                            setShowInstanceSuccessMessage(true);
                            setTimeout(() => setShowInstanceSuccessMessage(false), 5000);
                          }} />
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCreateInstanceModal(true)}
                          className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Adicionar Nova Instância ({instances.length}/3)
                        </button>
                      )
                    )}

                    {instances.length > 1 && (
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <p className="text-xs text-slate-500 uppercase font-black tracking-widest">
                          Outras Instâncias ({instances.length - 1})
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {instances.map((instance, idx) => {
                            if (idx === selectedInstanceIndex) return null;
                            return (
                              <div 
                                key={instance.id}
                                onClick={() => setSelectedInstanceIndex(idx)}
                                className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 hover:border-brand-500/30 cursor-pointer transition-all hover:bg-white/10"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{instance.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{instance.phoneNumber || 'Não conectado'}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                  <span className={`text-xs font-black px-2 py-1 rounded whitespace-nowrap ${
                                    instance.status === 'connected' 
                                      ? 'bg-emerald-500/20 text-emerald-500' 
                                      : 'bg-slate-500/20 text-slate-500'
                                  }`}>
                                    {instance.status === 'connected' ? '✅' : '⏳'}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Tem certeza que deseja remover "${instance.name}"?`)) {
                                        deleteInstance(instance.id);
                                        if (idx < selectedInstanceIndex) {
                                          setSelectedInstanceIndex(selectedInstanceIndex - 1);
                                        }
                                      }
                                    }}
                                    disabled={deletingInstanceId === instance.id}
                                    className="bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-500 border border-rose-500/30 p-2 rounded transition-all flex-shrink-0 flex items-center justify-center"
                                    title="Remover instância"
                                  >
                                    {deletingInstanceId === instance.id ? (
                                      <span className="animate-spin">⏳</span>
                                    ) : (
                                      <X size={16} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setShowConnectModal(false)}
                      className="w-full py-2 text-slate-400 hover:text-white text-xs uppercase font-black tracking-widest transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showConnectModal && instances.length === 0 && (
              <div className="dashboard-card">
                <CreateInstance onSuccess={() => reloadInstances()} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: 'MENSAGENS ENVIADAS', val: '0', badge: 'VOLUME TOTAL', icon: <Zap size={18} />, color: 'text-emerald-500' },
                { label: 'TAXA DE ENTREGA', val: '0%', badge: 'ESTABILIDADE', icon: <BarChart3 size={18} />, color: 'text-brand-500' },
                { label: 'FALHAS DETECTADAS', val: '0', badge: 'ERROS TÉCNICOS', icon: <AlertCircle size={18} />, color: 'text-rose-500' }
              ].map((s, i) => (
                <div key={i} className="dashboard-card flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-transform text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/10">{s.icon}</div>
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase border border-white/5 px-2 py-1 rounded tracking-tighter mx-auto mb-4">{s.badge}</span>
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase mb-2">{s.label}</div>
                    <div className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">{s.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 dashboard-card flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-xl font-black text-white italic uppercase mb-8 self-start">Fluxo de Disparos</h3>
                <div className="flex flex-col items-center gap-4 opacity-20">
                  <BarChart3 size={64} className="text-slate-600" strokeWidth={1} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Aguardando dados...</span>
                </div>
              </div>
              <div className="dashboard-card min-h-[300px] flex flex-col">
                <h3 className="text-xl font-black text-white italic uppercase mb-8">Atividade Recente</h3>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-20">
                  <Clock size={48} className="text-slate-600" strokeWidth={1} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Sem logs</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instancias':
        return <InstanceManager />;

      case 'disparo':
        return <EliteDispatcher />;

      case 'contatos':
        return <GroupToXlsxExporter />;

      case 'logs':
        return (
          <div className="animate-fade-in space-y-8">
            <header className="dashboard-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">Sistema</span>
                <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Logs de Atividade</h1>
                <p className="text-slate-500 text-sm mt-1">Nenhum disparo realizado até o momento.</p>
              </div>
              <button className="bg-white/5 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all border border-white/5 opacity-50 cursor-not-allowed" disabled>
                <Download size={14} />
                Exportar CSV
              </button>
            </header>
            <div className="dashboard-card py-20 md:p-24 flex flex-col items-center justify-center gap-6 border-white/5 opacity-20">
              <Activity size={64} className="text-slate-600" strokeWidth={1} />
              <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-600 italic">Lista de logs vazia</span>
            </div>
          </div>
        );

      case 'grupos':
        return <GroupManager />;

      case 'aquecimento':
        return <WarmupCloud />;

      case 'conquistas':
        return <GoalsTracker />;

      case 'plano':
        return (
          <div className="animate-fade-in space-y-10">
            <header className="dashboard-card">
              <span className="bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">Assinatura</span>
              <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Meu Plano</h1>
              <p className="text-slate-500 text-sm mt-1">Gerencie sua assinatura e veja seu histórico.</p>
            </header>

            <div className="dashboard-card">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Plano Atual</div>
                  <div className="text-3xl font-black text-white italic uppercase tracking-tighter">--</div>
                  <div className="text-brand-500 text-sm font-bold mt-1">--</div>
                </div>
                <div className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Sem plano
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Mensagens Enviadas</div>
                  <div className="text-2xl font-black text-white italic">0</div>
                  <div className="text-[9px] text-slate-600 mt-1">de 0 do plano</div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Sessões WhatsApp</div>
                  <div className="text-2xl font-black text-white italic">0</div>
                  <div className="text-[9px] text-slate-600 mt-1">0 conectada(s)</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Mensal', price: 'R$ 69,90', period: '/mês' },
                { name: 'Trimestral', price: 'R$ 149,90', period: '/trim' },
                { name: 'Anual', price: 'R$ 299,90', period: '/ano' },
              ].map((p, i) => (
                <div key={i} className="dashboard-card text-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{p.name}</div>
                  <div className="text-3xl font-black text-white italic tracking-tighter mb-1">{p.price}</div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-6">{p.period}</div>
                  <button className="block w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-brand-500/20 active:scale-95">
                    Assinar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ajuda':
        return <HelpCenterTab onNavigate={(tab) => setActiveTab(tab as Tab)} />;

      default:
        return <div className="text-slate-400 font-black italic uppercase p-40 text-center opacity-40">Em breve...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col lg:flex-row transition-colors duration-500">
      {/* Loading state enquanto sincroniza autenticação */}
      {authLoading && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mb-4 mx-auto" />
            <p className="text-white font-black uppercase text-sm tracking-widest">Sincronizando...</p>
            <p className="text-slate-500 text-xs mt-1">Verificando suas credenciais</p>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-5 left-5 z-[60] lg:hidden w-12 h-12 bg-[#1c2433] border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#0b1121] border-r border-white/5 p-6 md:p-8 flex flex-col shrink-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'}`}>
        <div className="flex items-center gap-4 mb-16 md:mb-20 group cursor-pointer pt-2">
          <div className="w-12 h-12 bg-brand-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl shadow-brand-600/30 shrink-0">
            <Zap size={24} />
          </div>
          <div className="text-xl font-black italic tracking-tighter uppercase text-white flex flex-col leading-none">
            <span>GLOBAL</span><span className="gradient-text-blue -mt-1">DISPAROS</span>
          </div>
        </div>

        {/* User info */}
        <div className="mb-8 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-500">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{userName}</div>
              <div className="text-[9px] text-slate-500 truncate">{userEmail}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar pr-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 md:px-6 py-3.5 md:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group ${activeTab === item.id ? 'bg-brand-600 text-white shadow-2xl shadow-brand-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-white/5">
          <button
            onClick={async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="w-full text-slate-500 hover:text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 group"
          >
            <LogOut size={14} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 pt-20 md:p-8 lg:p-16 overflow-y-auto bg-[#0d1117] lg:pt-16">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
