import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/config/api';
import {
  Download, Users, Loader2, AlertCircle, CheckCircle2, Filter,
  ChevronDown, BarChart3
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  participantCount: number;
}

interface Instance {
  id: string;
  name: string;
  phoneNumber?: string;
  status: string;
}

interface Participant {
  id: string;
  phoneNumber: string;
  name?: string;
  isAdmin?: boolean;
}

const GroupToXlsxExporter: React.FC = () => {
  const [step, setStep] = useState(1);
  const [instanceId, setInstanceId] = useState('');
  const [groupId, setGroupId] = useState('');
  
  const [instances, setInstances] = useState<Instance[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [filterAdmin, setFilterAdmin] = useState(false);
  const [previewLimit, setPreviewLimit] = useState(50);

  // Carregar instâncias
  useEffect(() => {
    const loadInstances = async () => {
      try {
        const response = await fetchAPI('/instances');
        // API retorna {data: [...], pagination: {...}} ou {instances: [...], pagination: {...}}
        const data = response?.data || response?.instances || response || [];
        setInstances(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar instâncias:', err);
        setError('Erro ao carregar instâncias');
      }
    };

    loadInstances();
  }, []);

  // Carregar grupos quando instância mudar
  useEffect(() => {
    if (!instanceId) {
      setGroups([]);
      setGroupId('');
      setParticipants([]);
      return;
    }

    const loadGroups = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAPI(`/groups/sync/${instanceId}`);
        setGroups(data || []);
      } catch (err) {
        console.error('Erro ao carregar grupos:', err);
        setError('Erro ao carregar grupos da instância');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [instanceId]);

  // Carregar participantes quando grupo mudar
  useEffect(() => {
    if (!groupId || !instanceId) {
      setParticipants([]);
      return;
    }

    const loadParticipants = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAPI(`/groups/${groupId}/participants`);
        setParticipants(data || []);
      } catch (err) {
        console.error('Erro ao carregar participantes:', err);
        setError('Erro ao carregar participantes do grupo');
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [groupId, instanceId]);

  // Exportar para XLSX
  const handleExport = async () => {
    setExporting(true);
    setError('');
    setSuccess('');

    try {
      if (!groupId) {
        throw new Error('Selecione um grupo');
      }

      const filteredParticipants = filterAdmin
        ? participants.filter(p => !p.isAdmin)
        : participants;

      if (filteredParticipants.length === 0) {
        throw new Error('Nenhum participante para exportar');
      }

      // Chamar API para gerar e baixar XLSX
      const response = await fetch(`http://localhost:3001/api/groups/${groupId}/export-xlsx?excludeAdmins=${filterAdmin}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar arquivo');
      }

      // Fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contatos_${groupId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`✅ Arquivo exportado com sucesso! ${filteredParticipants.length} contatos`);
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'Erro ao exportar contatos');
    } finally {
      setExporting(false);
    }
  };

  const selectedInstance = instances.find(i => i.id === instanceId);
  const selectedGroup = groups.find(g => g.id === groupId);
  const filteredParticipants = filterAdmin
    ? participants.filter(p => !p.isAdmin)
    : participants;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="dashboard-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0" />
        <div className="relative z-10">
          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">
            Exportação
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tighter">
            Extrair Grupo para Excel
          </h2>
          <p className="text-slate-400 text-sm">Exporte os participantes de um grupo como arquivo XLSX</p>
        </div>
      </div>

      {/* Step 1: Select Instance */}
      {step === 1 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-black text-sm">1</div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">Selecionar WhatsApp</h3>
              <p className="text-sm text-slate-500">Escolha a instância que contém o grupo</p>
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
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-slate-900/30 border-white/10 hover:border-emerald-500/30'
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

      {/* Step 2: Select Group */}
      {step === 2 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-black text-sm">2</div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">Selecionar Grupo</h3>
              <p className="text-sm text-slate-500">Escolha qual grupo extrair</p>
            </div>
          </div>

          {selectedInstance && (
            <div className="bg-slate-900/30 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black">WhatsApp Selecionado</p>
              <p className="text-white font-black">{selectedInstance.name}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-emerald-500 mr-2" />
              <span className="text-slate-400">Carregando grupos...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-8 text-center">
              <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhum grupo encontrado</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    setGroupId(group.id);
                    setStep(3);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    groupId === group.id
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-slate-900/30 border-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-black text-white text-sm uppercase">{group.name}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Users size={12} className="text-slate-500" />
                        <span className="text-xs text-slate-400">{group.participantCount} membros</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setStep(1)}
            className="mt-6 text-slate-400 hover:text-slate-300 text-sm font-black uppercase transition-all"
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* Step 3: Preview & Export */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="dashboard-card-interactive">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-black text-sm">3</div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">Preview & Exportar</h3>
                <p className="text-sm text-slate-500">Confirme os dados antes de exportar</p>
              </div>
            </div>

            {/* Informações Selecionadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">WhatsApp</p>
                <p className="text-white font-black">{selectedInstance?.name || '--'}</p>
              </div>
              <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Grupo</p>
                <p className="text-white font-black">{selectedGroup?.name || '--'}</p>
                <p className="text-xs text-slate-400 mt-1">{participants.length} membros</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-[#060b16] border border-white/5 rounded-xl p-6 mb-6">
              <h4 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2">
                <Filter size={16} className="text-emerald-500" />
                Filtros
              </h4>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-white/3 p-3 rounded-lg transition-all">
                <input
                  type="checkbox"
                  checked={filterAdmin}
                  onChange={(e) => setFilterAdmin(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-[#1c2433]"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Excluir Administradores</p>
                  <p className="text-xs text-slate-600">Remove admins do grupo da exportação</p>
                </div>
              </label>

              <div className="text-xs text-slate-500 mt-4 p-3 bg-white/5 rounded-lg">
                📊 Total: <span className="font-black text-white">{participants.length}</span> | Será exportado: <span className="font-black text-emerald-500">{filteredParticipants.length}</span>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <h4 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-500" />
                Preview dos Contatos (Primeiros {previewLimit})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">#</th>
                      <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Telefone</th>
                      <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Nome</th>
                      <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.slice(0, previewLimit).map((p, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/3 transition-all">
                        <td className="py-2 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-4 text-white font-mono text-[11px]">{p.phoneNumber}</td>
                        <td className="py-2 px-4 text-slate-400">{p.name || '-'}</td>
                        <td className="py-2 px-4">
                          {p.isAdmin ? (
                            <span className="text-[10px] font-black bg-orange-500/10 text-orange-500 px-2 py-1 rounded">SIM</span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredParticipants.length > previewLimit && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  ... e mais {filteredParticipants.length - previewLimit} contatos
                </p>
              )}
            </div>

            {/* Erros */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-start gap-2 mb-6">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sucesso */}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm flex items-start gap-2 mb-6">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-white/10 text-white font-black text-sm uppercase hover:bg-white/5 transition-all"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || filteredParticipants.length === 0}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Baixar XLSX ({filteredParticipants.length} contatos)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupToXlsxExporter;
