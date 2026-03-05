import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/config/api';
import { 
  Send, Shield, Clock, Zap, Loader2, AlertCircle, CheckCircle2, Users, 
  ChevronDown, BarChart3
} from 'lucide-react';
import DelayUI from './DelayUI';

interface Group {
  id: string;
  name: string;
  participantsCount: number;  // Match backend response (plural)
  creation?: number;
}

interface Instance {
  id: string;
  name: string;
  phoneNumber?: string;
  status: string;
}

const EliteDispatcher: React.FC = () => {
  // State
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [groupId, setGroupId] = useState('');
  
  const [useAntibanVariations, setUseAntibanVariations] = useState(true);
  const [useAntibanDelays, setUseAntibanDelays] = useState(true);
  const [useCommercialHours, setUseCommercialHours] = useState(true);
  const [excludeAdmins, setExcludeAdmins] = useState(true);
  const [excludeAlreadySent, setExcludeAlreadySent] = useState(true);
  const [selectedDelay, setSelectedDelay] = useState('humano');
  
  const [instances, setInstances] = useState<Instance[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearchFilter, setGroupSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar instâncias
  useEffect(() => {
    const loadInstances = async () => {
      try {
        const response = await fetchAPI('/instances');
        // API retorna {instances: [...], pagination: {...}}
        const instancesArray = response?.instances || response || [];
        setInstances(Array.isArray(instancesArray) ? instancesArray : []);
      } catch (err) {
        console.error('Erro ao carregar instâncias:', err);
        setError('Erro ao carregar instâncias');
        setInstances([]);
      }
    };

    loadInstances();
  }, []);

  // Carregar grupos quando instância mudar
  useEffect(() => {
    if (!instanceId) {
      setGroups([]);
      setGroupId('');
      setGroupSearchFilter('');
      return;
    }

    const loadGroups = async () => {
      setLoading(true);
      setError('');
      setGroupSearchFilter('');
      try {
        const data = await fetchAPI(`/groups/sync/${instanceId}`);
        // API retorna { message, groups }
        const groupsArray = data?.groups || data || [];
        setGroups(Array.isArray(groupsArray) ? groupsArray : []);
      } catch (err) {
        console.error('Erro ao carregar grupos:', err);
        setError('Erro ao carregar grupos da instância');
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [instanceId]);

  // Enviar campanha
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setError('');
    setSuccess('');

    try {
      if (!name || !message || !instanceId || !groupId) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Validar grupo
      const selectedGroup = groups.find(g => g.id === groupId);
      if (!selectedGroup) {
        console.error('Grupos disponíveis:', groups);
        console.error('GroupId selecionado:', groupId);
        throw new Error('Grupo inválido');
      }

      // Criar campanha via nova rota /campaigns
      const newCampaign = await fetchAPI('/campaigns', {
        method: 'POST',
        body: {
          name,
          instanceId: parseInt(instanceId, 10),
          groupId,
          message,
          useAntibanVariations,
          useAntibanDelays,
          useCommercialHours,
        }
      });

      // Iniciar campanha
      await fetchAPI(`/campaigns/${newCampaign.id}/start`, {
        method: 'POST',
      });

      setSuccess(`✅ Disparo iniciado com sucesso para ${selectedGroup.name}!`);

      // Resetar formulário
      setStep(1);
      setName('');
      setMessage('');
      setInstanceId('');
      setGroupId('');
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar disparo');
    } finally {
      setDispatching(false);
    }
  };

  const selectedInstance = instances.find(i => i.id === instanceId);
  const selectedGroup = groups.find(g => g.id === groupId);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="dashboard-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/5 to-brand-500/0" />
        <div className="relative z-10">
          <span className="bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">
            Disparador Elite
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tighter">
            Disparo em Grupos
          </h2>
          <p className="text-slate-400 text-sm">Envie mensagens privadas para membros de grupos com proteção anti-ban integrada</p>
        </div>
      </div>

      {/* Step 1: Selecionar Instância */}
      {step === 1 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 font-black text-sm">1</div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">Selecionar WhatsApp</h3>
              <p className="text-sm text-slate-500">Escolha a instância que será usada para o disparo</p>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>}

          <div className="space-y-4">
            {instances.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-8 text-center">
                <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhuma instância conectada</p>
                <p className="text-slate-600 text-xs mt-2">Conecte um WhatsApp primeiro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    onClick={() => {
                      setInstanceId(instance.id);
                      setStep(2);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      instanceId === instance.id
                        ? 'bg-brand-500/10 border-brand-500/50'
                        : 'bg-slate-900/30 border-white/10 hover:border-brand-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-black text-white text-sm uppercase">{instance.name}</h4>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                        instance.status === 'connected' 
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {instance.status === 'connected' ? '✓ Conectado' : 'Desconectado'}
                      </span>
                    </div>
                    {instance.phoneNumber && (
                      <p className="text-xs text-slate-400">{instance.phoneNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Selecionar Grupo */}
      {step === 2 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 font-black text-sm">2</div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">Selecionar Grupo</h3>
              <p className="text-sm text-slate-500">Escolha o grupo para extrair os membros</p>
            </div>
          </div>

          {selectedInstance && (
            <div className="bg-slate-900/30 border border-brand-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black">WhatsApp Selecionado</p>
              <p className="text-white font-black">{selectedInstance.name}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-brand-500 mr-2" />
              <span className="text-slate-400">Carregando grupos...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-8 text-center">
              <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhum grupo encontrado</p>
              <p className="text-slate-600 text-xs mt-2">Crie um grupo e adicione membros</p>
            </div>
          ) : (
            <>
              {/* Campo de Busca */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Buscar grupos por nome..."
                  value={groupSearchFilter}
                  onChange={(e) => setGroupSearchFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-brand-500/50 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* Lista de Grupos Filtrada */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {groups
                  .filter((group) => group.name.toLowerCase().includes(groupSearchFilter.toLowerCase()))
                  .map((group) => (
                    <div
                      key={group.id}
                      onClick={() => {
                        setGroupId(group.id);
                        setStep(3);
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        groupId === group.id
                          ? 'bg-brand-500/10 border-brand-500/50'
                          : 'bg-slate-900/30 border-white/10 hover:border-brand-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-black text-white text-sm uppercase">{group.name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Users size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-400">{group.participantsCount} membros</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {groups.filter((group) => group.name.toLowerCase().includes(groupSearchFilter.toLowerCase())).length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle size={24} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Nenhum grupo encontrado com esse nome</p>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setStep(1)}
            className="mt-6 text-slate-400 hover:text-slate-300 text-sm font-black uppercase transition-all"
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* Step 3: Compor Mensagem */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="dashboard-card-interactive">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 font-black text-sm">3</div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">Compor Mensagem</h3>
                <p className="text-sm text-slate-500">Digite a mensagem personalizada</p>
              </div>
            </div>

            <form onSubmit={handleDispatch} className="space-y-6">
              {/* Informações Selecionadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">WhatsApp</p>
                  <p className="text-white font-black">{selectedInstance?.name || '--'}</p>
                </div>
                <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Grupo Selecionado</p>
                  <p className="text-white font-black">{selectedGroup?.name || '--'}</p>
                  <p className="text-xs text-slate-400 mt-1">{selectedGroup?.participantsCount || 0} membros</p>
                </div>
              </div>

              {/* Nome da Campanha */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Promoção Blackfriday"
                  className="w-full bg-[#060b16] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                  required
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                  Mensagem a Enviar
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Olá {{nome}}! Temos uma oferta especial para você..."
                  rows={5}
                  className="w-full bg-[#060b16] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-brand-500 transition-all resize-none"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Use: <code className="bg-white/5 px-2 py-1 rounded">{'{{nome}}'}</code> <code className="bg-white/5 px-2 py-1 rounded">{'{{telefone}}'}</code> <code className="bg-white/5 px-2 py-1 rounded">{'{{data}}'}</code> <code className="bg-white/5 px-2 py-1 rounded">{'{{dia_semana}}'}</code>
                </p>
              </div>

              {/* Velocidade do Motor */}
              <div>
                <DelayUI 
                  selectedDelay={selectedDelay}
                  onSelectDelay={setSelectedDelay}
                  showDescription={true}
                />
              </div>

              {/* Opções Anti-Ban */}
              <div className="bg-[#060b16] border border-white/5 rounded-xl p-6 space-y-4">
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Shield size={16} className="text-brand-500" />
                  Sistema Anti-Ban
                </h4>

                <label className="flex items-start gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={useAntibanVariations}
                    onChange={(e) => setUseAntibanVariations(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/10 bg-[#1c2433]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">4 Variações de Mensagem</p>
                    <p className="text-xs text-slate-600">Cada contato recebe uma versão diferente</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={useAntibanDelays}
                    onChange={(e) => setUseAntibanDelays(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/10 bg-[#1c2433]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Delays Randômicos</p>
                    <p className="text-xs text-slate-600">3-45 segundos entre mensagens</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={useCommercialHours}
                    onChange={(e) => setUseCommercialHours(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/10 bg-[#1c2433]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Horário Comercial</p>
                    <p className="text-xs text-slate-600">Apenas entre 9h-21h (pausa à noite)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all border-t border-white/5 pt-4">
                  <input
                    type="checkbox"
                    checked={excludeAdmins}
                    onChange={(e) => setExcludeAdmins(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/10 bg-[#1c2433]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Excluir Administradores</p>
                    <p className="text-xs text-slate-600">Não enviar para admins do grupo</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={excludeAlreadySent}
                    onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/10 bg-[#1c2433]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Não Reenviar</p>
                    <p className="text-xs text-slate-600">Excluir quem já recebeu (evitar duplicatas)</p>
                  </div>
                </label>
              </div>

              {/* Erros */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Sucesso */}
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl border border-white/10 text-white font-black text-sm uppercase hover:bg-white/5 transition-all"
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  disabled={dispatching || !name || !message}
                  className="flex-1 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
                >
                  {dispatching ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Iniciando Disparo...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Iniciar Disparo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EliteDispatcher;
