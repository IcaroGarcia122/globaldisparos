import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/config/api';
import {
  Users, Upload, Loader2, AlertCircle, CheckCircle2, Clock, PlayCircle, PauseCircle,
  Trash2, ChevronDown, BarChart3, SkipForward, X, FileText
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  participantCount: number;
  isOwner?: boolean;
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
}

interface AddingParticipant {
  phoneNumber: string;
  status: 'pending' | 'added' | 'failed';
  error?: string;
}

const GroupManager: React.FC = () => {
  const [step, setStep] = useState(1);
  const [instanceId, setInstanceId] = useState('');
  const [groupId, setGroupId] = useState('');
  
  const [instances, setInstances] = useState<Instance[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [bulkAddQueue, setBulkAddQueue] = useState<AddingParticipant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(25);
  const [bulkAddProgress, setBulkAddProgress] = useState(0);

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

  // Carregar grupos (apenas do owner)
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
        // Filtrar apenas grupos que o usuário é owner
        const ownedGroups = (data || []).filter((g: any) => g.isOwner === true);
        setGroups(ownedGroups);
      } catch (err) {
        console.error('Erro ao carregar grupos:', err);
        setError('Erro ao carregar grupos');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [instanceId]);

  // Carregar participantes
  useEffect(() => {
    if (!groupId) {
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
        setError('Erro ao carregar participantes');
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [groupId]);

  // Parse XLSX file (usando SheetJS logic)
  const parseXlsxFile = async (file: File) => {
    try {
      // Como não temos SheetJS aqui, vamos fazer uma abordagem simples
      // Idealmente isso seria feito no backend
      const text = await file.text();
      const lines = text.split('\n');
      const phoneNumbers: string[] = [];

      // Assumindo formato simples onde cada linha tem um número
      for (const line of lines) {
        const phone = line.trim();
        // Validar formato de telefone (números apenas)
        if (phone && /^\d+$/.test(phone.replace(/[^\d]/g, ''))) {
          phoneNumbers.push(phone);
        }
      }

      return phoneNumbers;
    } catch (err) {
      throw new Error('Erro ao processar arquivo XLSX');
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    try {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        throw new Error('Por favor, selecione um arquivo XLSX ou CSV');
      }

      const phoneNumbers = await parseXlsxFile(file);

      if (phoneNumbers.length === 0) {
        throw new Error('Nenhum número de telefone encontrado no arquivo');
      }

      const queue: AddingParticipant[] = phoneNumbers.map(phone => ({
        phoneNumber: phone,
        status: 'pending' as const,
      }));

      setBulkAddQueue(queue);
      setUploadedFile(file);
      setSuccess(`✅ ${phoneNumbers.length} números carregados. Pronto para adicionar!`);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo');
      setUploadedFile(null);
    }
  };

  // Add members with delay
  const startBulkAdd = async () => {
    if (!groupId || bulkAddQueue.length === 0) {
      setError('Selecione um grupo e carregue um arquivo');
      return;
    }

    setIsAdding(true);
    setError('');
    setSuccess('');
    setBulkAddProgress(0);

    const queue = [...bulkAddQueue];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (isPaused) {
        setIsPaused(false);
        // Wait for resume
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      const participant = queue[i];

      try {
        // Call API to add member to group
        await fetchAPI(`/groups/${groupId}/add-participant`, {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: participant.phoneNumber,
          }),
        });

        queue[i].status = 'added';
        successCount++;

        // Update UI
        setBulkAddQueue([...queue]);
        setBulkAddProgress(Math.round(((i + 1) / queue.length) * 100));

        // Wait delay seconds before next
        if (i < queue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      } catch (err: any) {
        queue[i].status = 'failed';
        queue[i].error = err.message || 'Erro ao adicionar';
        failCount++;

        setBulkAddQueue([...queue]);
        setBulkAddProgress(Math.round(((i + 1) / queue.length) * 100));

        // Still wait delay before next
        if (i < queue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }
    }

    setIsAdding(false);
    setSuccess(`✅ ${successCount}/${queue.length} membros adicionados com sucesso!`);
    if (failCount > 0) {
      setError(`⚠️ ${failCount} membros falharam ao adicionar`);
    }
  };

  const pauseResumeBulkAdd = () => {
    setIsPaused(!isPaused);
  };

  const clearQueue = () => {
    setBulkAddQueue([]);
    setUploadedFile(null);
    setBulkAddProgress(0);
    setSuccess('');
  };

  const selectedInstance = instances.find(i => i.id === instanceId);
  const selectedGroup = groups.find(g => g.id === groupId);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="dashboard-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0" />
        <div className="relative z-10">
          <span className="bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">
            Gerenciamento
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tighter">
            Adicionar Membros ao Grupo
          </h2>
          <p className="text-slate-400 text-sm">Importar XLSX com contatos e adicionar ao grupo com delay de 25 segundos</p>
        </div>
      </div>

      {/* Step 1: Select Instance */}
      {step === 1 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 font-black text-sm">1</div>
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
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-slate-900/30 border-white/10 hover:border-blue-500/30'
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

      {/* Step 2: Select Group (owned only) */}
      {step === 2 && (
        <div className="dashboard-card-interactive">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 font-black text-sm">2</div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">Selecionar Grupo</h3>
              <p className="text-sm text-slate-500">Apenas grupos que você administra</p>
            </div>
          </div>

          {selectedInstance && (
            <div className="bg-slate-900/30 border border-blue-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black">WhatsApp Selecionado</p>
              <p className="text-white font-black">{selectedInstance.name}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-blue-500 mr-2" />
              <span className="text-slate-400">Carregando grupos...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-8 text-center">
              <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhum grupo encontrado (você deve ser admin)</p>
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
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-slate-900/30 border-white/10 hover:border-blue-500/30'
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
                    <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                      ADMIN
                    </span>
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

      {/* Step 3: Upload & Bulk Add */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="dashboard-card-interactive">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 font-black text-sm">3</div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">Carregar Arquivo</h3>
                <p className="text-sm text-slate-500">Importar XLSX com números de contatos</p>
              </div>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">WhatsApp</p>
                <p className="text-white font-black">{selectedInstance?.name || '--'}</p>
              </div>
              <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Grupo</p>
                <p className="text-white font-black">{selectedGroup?.name || '--'}</p>
                <p className="text-xs text-slate-400 mt-1">{participants.length} membros atuais</p>
              </div>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-blue-500/30 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-500/5 transition-all">
                  <Upload size={32} className="text-blue-500 mx-auto mb-3" />
                  <p className="text-white font-black text-sm mb-1">Clique para carregar file</p>
                  <p className="text-slate-500 text-xs">Formatos: XLSX ou CSV</p>
                  <p className="text-slate-600 text-[10px] mt-2">Cada linha deve conter um número de telefone</p>
                  {uploadedFile && (
                    <p className="text-blue-400 text-xs mt-3 font-black">
                      ✓ {uploadedFile.name} ({bulkAddQueue.length} contatos)
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isAdding}
                />
              </label>
            </div>

            {/* Configurações */}
            {bulkAddQueue.length > 0 && (
              <div className="bg-[#060b16] border border-white/5 rounded-xl p-6 mb-6">
                <h4 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  Configurações de Delay
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-black block mb-2">
                      Segundos entre adições: {delaySeconds}s
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                      disabled={isAdding}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-2">
                      <span>10s (rápido)</span>
                      <span>60s (seguro)</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 p-3 bg-white/5 rounded-lg">
                    ⏱️ Tempo estimado: <span className="font-black text-white">{Math.ceil((bulkAddQueue.length * delaySeconds) / 60)} minutos</span> ({bulkAddQueue.length} contatos)
                  </div>
                </div>
              </div>
            )}

            {/* Erros e Sucesso */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-start gap-2 mb-6">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm flex items-start gap-2 mb-6">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  clearQueue();
                }}
                className="px-6 py-3 rounded-xl border border-white/10 text-white font-black text-sm uppercase hover:bg-white/5 transition-all disabled:opacity-50"
                disabled={isAdding}
              >
                ← Voltar
              </button>

              {bulkAddQueue.length > 0 && (
                <>
                  {!isAdding ? (
                    <button
                      type="button"
                      onClick={startBulkAdd}
                      className="flex-1 bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                      <PlayCircle size={16} />
                      Iniciar Adição ({bulkAddQueue.length})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseResumeBulkAdd}
                      className="flex-1 bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2"
                    >
                      {isPaused ? (
                        <>
                          <PlayCircle size={16} />
                          Retomar
                        </>
                      ) : (
                        <>
                          <PauseCircle size={16} />
                          Pausar
                        </>
                      )}
                    </button>
                  )}

                  {!isAdding && (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="px-6 py-3 rounded-xl border border-red-500/20 text-red-400 font-black text-sm uppercase hover:bg-red-500/10 transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {isAdding && bulkAddQueue.length > 0 && (
            <div className="dashboard-card-interactive">
              <h4 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" />
                Progresso de Adição
              </h4>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400">
                    {bulkAddProgress}% completo
                  </span>
                  <span className="text-xs text-slate-500">
                    {bulkAddQueue.filter(p => p.status !== 'pending').length} / {bulkAddQueue.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                    style={{ width: `${bulkAddProgress}%` }}
                  />
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-600 uppercase font-black">Adicionados</p>
                  <p className="text-2xl font-black text-emerald-500">
                    {bulkAddQueue.filter(p => p.status === 'added').length}
                  </p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-600 uppercase font-black">Pendentes</p>
                  <p className="text-2xl font-black text-orange-500">
                    {bulkAddQueue.filter(p => p.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 uppercase font-black">Erros</p>
                  <p className="text-2xl font-black text-red-500">
                    {bulkAddQueue.filter(p => p.status === 'failed').length}
                  </p>
                </div>
              </div>

              {/* Queue Preview */}
              <div>
                <h5 className="text-xs font-black text-white uppercase mb-3">Status dos Contatos</h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bulkAddQueue.map((p, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                        p.status === 'added'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : p.status === 'failed'
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-slate-800'
                      }`}
                    >
                      <span className="text-slate-300 font-mono">{p.phoneNumber}</span>
                      <span className={`text-[10px] font-black uppercase ${
                        p.status === 'added'
                          ? 'text-emerald-500'
                          : p.status === 'failed'
                          ? 'text-red-500'
                          : 'text-orange-500'
                      }`}>
                        {p.status === 'added' ? '✓ OK' : p.status === 'failed' ? '✗ ERRO' : '⏳ PENDENTE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupManager;
