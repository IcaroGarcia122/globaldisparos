import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/config/api';
import { Plus, Trash2, QrCode, Phone, CheckCircle2, Clock, X } from 'lucide-react';
import ConnectWhatsApp from '@/components/ConnectWhatsAPP';
import CreateInstance from '@/components/CreateInstance';

interface Instance {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'banned';
  connectedAt: string | null;
  accountAge: number;
  createdAt: string;
}

const InstanceManager: React.FC = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error'; message: string} | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-hide notification after 3 seconds
  const showNotification = (type: 'success'|'error', message: string) => {
    setNotification({type, message});
    setTimeout(() => setNotification(null), 3000);
  };

  const reloadInstances = async () => {
    setLoading(true);
    try {
      console.log('🔄 Carregando todas as instâncias...');
      const response = await fetchAPI('/instances');
      // API retorna {data: [...], pagination: {...}} ou {instances: [...], pagination: {...}}
      const data = response?.data || response?.instances || response || [];
      console.log(`✅ ${data.length} instância(s) carregada(s)`);
      setInstances(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedInstance) {
        setSelectedInstance(data[0]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async (e: React.MouseEvent<HTMLButtonElement>, instanceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('%c🗑️ DELETE INICIADO', 'color: orange; font-weight: bold; font-size: 14px;');
    console.log(`%c  ID da instância: ${instanceId}`, 'color: orange;');
    
    if (!window.confirm('⚠️ TEM CERTEZA QUE DESEJA REMOVER ESTA INSTÂNCIA?\n\nEssa ação não pode ser desfeita!')) {
      console.log('%c❌ Deleção cancelada pelo usuário', 'color: red;');
      return;
    }

    console.log('%c✅ Usuário confirmou a deleção', 'color: green;');
    setDeleting(true);

    try {
      console.log(`%c1️⃣ Enviando requisição DELETE para /instances/${instanceId}`, 'color: blue;');
      const response = await fetchAPI(`/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      console.log(`%c2️⃣ ✅ Resposta recebida:`, 'color: green;', response);
      
      console.log(`%c3️⃣ Mostrando notificação de sucesso`, 'color: green;');
      showNotification('success', '✅ Instância removida com sucesso!');
      
      console.log(`%c4️⃣ Limpando seleção`, 'color: green;');
      if (selectedInstance?.id === instanceId) {
        setSelectedInstance(null);
        setShowQRModal(false);
      }
      
      console.log(`%c5️⃣ Recarregando lista de instâncias`, 'color: green;');
      await reloadInstances();
      
      console.log('%c✅ ✅ ✅ DELEÇÃO COMPLETADA COM SUCESSO ✅ ✅ ✅', 'color: green; font-weight: bold; font-size: 14px;');
      
    } catch (error: any) {
      console.error('%c❌ ❌ ❌ ERRO NA DELEÇÃO ❌ ❌ ❌', 'color: red; font-weight: bold; font-size: 14px;');
      console.error(`%c  Mensagem: ${error.message}`, 'color: red;');
      console.error(`%c  Stack:`, 'color: red;', error.stack);
      
      showNotification('error', `❌ Erro ao deletar: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const initializeInstances = async () => {
      // Validar e limpar instâncias excedentes baseado no plano
      console.log('🔄 Validando limite de instâncias do plano...');
      try {
        const validation = await fetchAPI('/instances/cleanup/validate-plan-limit', {
          method: 'POST'
        });
        console.log('✅ Validação completa:', validation);
        if (validation.cleaned > 0) {
          console.log(`🧹 ${validation.cleaned} instâncias excedentes foram limpas`);
        }
      } catch (error) {
        console.warn('⚠️ Erro na validação (não crítico):', error);
      }
      
      // Carregar instâncias após validação
      await reloadInstances();
    };
    
    initializeInstances();
  }, []);

  // Polling para detectar desconexões automáticas
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const response = await fetchAPI('/instances');
        // API retorna {data: [...], pagination: {...}} ou {instances: [...], pagination: {...}}
        const latestInstances = response?.data || response?.instances || response || [];
        
        // Validar que é um array
        if (!Array.isArray(latestInstances)) {
          console.warn('Resposta de instâncias não é um array:', latestInstances);
          return;
        }
        
        // Verificar se alguma instância foi desconectada
        latestInstances.forEach((newInstance: Instance) => {
          const oldInstance = instances.find(i => i.id === newInstance.id);
          
          // Se estava conectada e agora está desconectada, mostrar notificação
          if (oldInstance && oldInstance.status === 'connected' && newInstance.status === 'disconnected') {
            showNotification('error', `⚠️ Instância "${newInstance.name}" foi desconectada`);
          }
        });
        
        // Atualizar instâncias
        setInstances(latestInstances);
        
        // Atualizar selected instance se houver mudanças
        if (selectedInstance) {
          const updated = latestInstances.find((i: Instance) => i.id === selectedInstance.id);
          if (updated) {
            setSelectedInstance(updated);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status de conexão:', error);
      }
    };

    // Executar verificação a cada 30 segundos
    const interval = setInterval(checkConnectionStatus, 30000);
    
    return () => clearInterval(interval);
  }, [instances, selectedInstance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'disconnected':
        return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
      case 'banned':
        return 'bg-rose-500/20 text-rose-500 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return '✅ Conectado';
      case 'connecting':
        return '⏳ Conectando';
      case 'disconnected':
        return '❌ Desconectado';
      case 'banned':
        return '🚫 Banido';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não conectado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowCreateForm(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <X size={20} />
            Voltar
          </button>

          <div className="dashboard-card">
            <h1 className="text-2xl font-black text-white uppercase mb-6">
              Criar Nova Instância
            </h1>
            
            <CreateInstance onSuccess={() => {
              setShowCreateForm(false);
              reloadInstances();
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-6 right-6 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-300 z-50 ${
            notification.type === 'success' 
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
              Gerenciador de Instâncias
            </h1>
            <p className="text-slate-400">Gerencie suas instâncias do WhatsApp</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={18} />
            Nova Instância
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Instâncias */}
          <div className="lg:col-span-1">
            <div className="dashboard-card sticky top-6">
              <h2 className="text-lg font-black text-white uppercase mb-4">
                Suas Instâncias ({instances.length}/3)
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin text-emerald-500 text-2xl">⏳</div>
                  <p className="text-slate-400 mt-2">Carregando...</p>
                </div>
              ) : instances.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode size={32} className="text-slate-600 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-400">Nenhuma instância criada</p>
                  <p className="text-slate-600 text-xs mt-2">Clique em "Nova Instância" para começar</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {instances.map((instance) => (
                    <button
                      key={instance.id}
                      onClick={() => setSelectedInstance(instance)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedInstance?.id === instance.id
                          ? 'bg-brand-500/20 border-brand-500/50 shadow-lg shadow-brand-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-black text-white text-sm truncate">
                            {instance.name}
                          </h3>
                          {instance.phoneNumber ? (
                            <p className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
                              <Phone size={12} />
                              {instance.phoneNumber}
                            </p>
                          ) : (
                            <p className="text-slate-500 text-xs mt-1">Sem número</p>
                          )}
                        </div>
                        <span className={`text-xs font-black px-2 py-1 rounded border ${getStatusColor(instance.status)}`}>
                          {instance.status === 'connected' ? '✅' : instance.status === 'connecting' ? '⏳' : '❌'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalhes e Ações */}
          <div className="lg:col-span-2 space-y-6">
            {selectedInstance ? (
              <>
                {/* Card de Detalhes */}
                <div className="dashboard-card">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase mb-2">
                        {selectedInstance.name}
                      </h2>
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          selectedInstance.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-500'
                        }`} />
                        {getStatusLabel(selectedInstance.status)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteInstance(e, selectedInstance.id)}
                      disabled={deleting}
                      type="button"
                      className={`${deleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-600/30'} bg-rose-600/20 text-rose-500 border border-rose-500/30 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2`}
                    >
                      <Trash2 size={16} />
                      {deleting ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    {/* Coluna 1 */}
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Número
                      </p>
                      <p className="text-white font-bold">
                        {selectedInstance.phoneNumber || 'Não conectado'}
                      </p>
                    </div>

                    {/* Coluna 2 */}
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Idade da Conta
                      </p>
                      <p className="text-white font-bold">
                        {selectedInstance.accountAge} dias
                      </p>
                    </div>

                    {/* Coluna 3 */}
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Criada em
                      </p>
                      <p className="text-white font-bold text-sm">
                        {formatDate(selectedInstance.createdAt)}
                      </p>
                    </div>

                    {/* Coluna 4 */}
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Conectada em
                      </p>
                      <p className="text-white font-bold text-sm">
                        {formatDate(selectedInstance.connectedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Conexão */}
                {selectedInstance.status !== 'connected' && (
                  <div className="dashboard-card">
                    <button
                      onClick={() => setShowQRModal(!showQRModal)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <QrCode size={18} />
                      {showQRModal ? 'Esconder QR Code' : 'Gerar QR Code'}
                    </button>

                    {showQRModal && (
                      <div className="mt-6">
                        <ConnectWhatsApp
                          instanceId={selectedInstance.id}
                          onConnected={() => {
                            reloadInstances();
                            setShowQRModal(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Status Connected */}
                {selectedInstance.status === 'connected' && (
                  <div className="dashboard-card bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                      <div>
                        <h3 className="font-black text-emerald-500 text-lg">Conectado!</h3>
                        <p className="text-emerald-400 text-sm">
                          Instância está conectada ao WhatsApp
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="dashboard-card text-center py-16">
                <QrCode size={48} className="text-slate-600 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-black text-white uppercase mb-2">
                  Selecione uma Instância
                </h3>
                <p className="text-slate-400">
                  Clique em uma instância na lista para ver detalhes e gerenciar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstanceManager;
