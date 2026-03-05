import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/config/api';
import {
  Play, Pause, Square, Zap, CheckCircle2, ChevronDown, Flame
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  status: string;
  phoneNumber?: string;
}

const WarmupCloud: React.FC = () => {
  const [totalMessagesSent, setTotalMessagesSent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [selectedInstancePhone, setSelectedInstancePhone] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSpeed, setSelectedSpeed] = useState('Veloz');
  const [selectedMode, setSelectedMode] = useState('Solo');
  const [warmupLoading, setWarmupLoading] = useState(false);
  const [warmupError, setWarmupError] = useState('');

  // Carregar mensagens e instâncias
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, instancesRes] = await Promise.all([
          fetchAPI('/stats/user').catch(() => ({ messagesSent: 0 })),
          fetchAPI('/instances').catch(() => ({}))
        ]);
        
        const msgCount = statsRes?.messagesSent || 0;
        setTotalMessagesSent(msgCount);
        
        // API retorna {data: [...], pagination: {...}} ou {instances: [...], pagination: {...}}
        const instancesList = instancesRes?.data || instancesRes?.instances || instancesRes || [];
        setInstances(Array.isArray(instancesList) ? instancesList : []);
        
        // Calcular progresso (0-100%)
        const max = 100000; // Meta máxima
        const percent = Math.min((msgCount / max) * 100, 100);
        setProgress(percent);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Calcular uptime simulado
  const getUptimeString = () => {
    const rand = Math.floor(Math.random() * 1000);
    const hours = Math.floor(rand / 3600);
    const mins = Math.floor((rand % 3600) / 60);
    const secs = rand % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handler para mudar de instância
  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setWarmupError('');
    
    // Encontrar o phoneNumber da instância selecionada
    const selected = instances.find(inst => inst.id === instanceId);
    if (selected) {
      setSelectedInstancePhone(selected.phoneNumber || '');
    }
  };

  // Iniciar warm up (enviar mensagens para si mesmo)
  const handleStartWarmup = async () => {
    if (!selectedInstanceId) {
      setWarmupError('❌ Selecione uma instância antes de iniciar');
      return;
    }

    if (!selectedInstancePhone) {
      setWarmupError('❌ Instância não possui número de telefone cadastrado');
      return;
    }

    setWarmupLoading(true);
    setWarmupError('');

    try {
      // Enviar mensagem de warm up para si mesmo
      const result = await fetchAPI('/warmup/start', {
        method: 'POST',
        body: {
          instanceId: selectedInstanceId,
          targetPhone: selectedInstancePhone,
          mode: selectedMode,
          speed: selectedSpeed,
          messageCount: 100, // Meta de mensagens para warm up
        }
      });

      setIsRunning(true);
      // Iniciar polling para atualizar contagem de mensagens
      const interval = setInterval(async () => {
        try {
          const stats = await fetchAPI('/stats/user');
          if (stats && stats.messagesSent) {
            setTotalMessagesSent(stats.messagesSent);
            const percent = Math.min((stats.messagesSent / 100000) * 100, 100);
            setProgress(percent);
          }
        } catch (err) {
          console.error('Erro ao atualizar stats:', err);
        }
      }, 5000);

      return () => clearInterval(interval);
    } catch (err: any) {
      setWarmupError(`❌ Erro ao iniciar warm up: ${err.message || 'Tente novamente'}`);
      setIsRunning(false);
    } finally {
      setWarmupLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <div className="dashboard-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase px-3 py-1 rounded-md mb-3 inline-block tracking-widest">Maturação</span>
          <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Aquecimento Cloud</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Aumente a autoridade do seu chip de forma 100% automática.</p>
        </div>
        <button 
          onClick={() => {
            if (isRunning) {
              setIsRunning(false);
            } else {
              handleStartWarmup();
            }
          }}
          disabled={!selectedInstanceId || warmupLoading}
          className={`${
            !selectedInstanceId || warmupLoading
              ? 'bg-slate-600 cursor-not-allowed opacity-50'
              : 'bg-emerald-500 hover:bg-emerald-400'
          } text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl shadow-emerald-500/20 active:scale-95`}
        >
          {warmupLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Iniciando...
            </>
          ) : isRunning ? (
            <>
              <Pause size={16} />
              Pausar Maturação
            </>
          ) : (
            <>
              <Play size={16} />
              Iniciar Maturação
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {warmupError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-medium">
          {warmupError}
        </div>
      )}

      {/* Main Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="dashboard-card relative overflow-visible">
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
              {/* Circular Progress */}
              <div className="circle-progress-container relative w-48 h-48 flex-shrink-0">
                <svg width="200" height="200" className="circle-progress-svg">
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    fill="transparent" 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeWidth="14" 
                  />
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    fill="transparent" 
                    stroke="#10b981" 
                    strokeWidth="14" 
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
                    className="glow-green transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl md:text-6xl font-black text-white italic tracking-tighter leading-none">
                    {Math.round(progress)}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Maturidade</span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">Índice de Maturação</h3>
                  <div className={`px-4 py-1 rounded-full border flex items-center gap-2 ${
                    isRunning 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/5 border-white/5'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                    }`} />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {isRunning ? 'Sistema Ativo' : 'Sistema Standby'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-8 md:mb-10">
                  <span className="text-slate-500 font-black italic uppercase text-xs">
                    {totalMessagesSent.toLocaleString()} / 100.000 mensagens
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  {[
                    { label: 'TOTAL INTERAÇÕES', val: totalMessagesSent.toLocaleString() },
                    { label: 'TEMPO DE UPTIME', val: getUptimeString() },
                    { label: 'DELAY MÉDIO', val: selectedSpeed === 'Veloz' ? '15-30s' : selectedSpeed === 'Humano' ? '30-60s' : '10-15s' }
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/5 text-center">
                      <div className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">{s.label}</div>
                      <div className="text-lg md:text-xl font-black text-white italic">{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Speed Selection */}
            <div className="dashboard-card">
              <div className="flex items-center gap-4 mb-8 md:mb-10">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
                  <Zap size={18} />
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Velocidade do Motor</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {['Humano', 'Veloz', 'Turbo Elite', 'Caótico'].map((v) => (
                  <button 
                    key={v}
                    onClick={() => setSelectedSpeed(v)}
                    className={`p-5 md:p-6 rounded-2xl border transition-all text-center hover:scale-105 ${
                      v === selectedSpeed 
                        ? 'bg-brand-500/10 border-brand-500/40' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`text-sm font-black italic uppercase ${v === selectedSpeed ? 'text-white' : 'text-slate-400'}`}>
                      {v}
                    </div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">
                      {v === 'Humano' ? '30-60s' : v === 'Veloz' ? '15-30s' : v === 'Turbo Elite' ? '10-15s' : '5-10s'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="dashboard-card">
              <div className="flex items-center gap-4 mb-8 md:mb-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Modo & Instâncias</h3>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex mb-8">
                {['Solo', 'Ping Pong'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`flex-1 py-3 font-black text-[10px] uppercase rounded-lg transition-all ${
                      mode === selectedMode
                        ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/10'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Instância Principal</label>
                <div className="relative">
                  <select 
                    value={selectedInstanceId}
                    onChange={(e) => handleInstanceChange(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-6 py-4 text-white text-xs font-bold appearance-none outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="">Selecionar instância...</option>
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} {inst.status === 'connected' ? '✓' : '✗'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                
                {/* Display Phone Number */}
                {selectedInstancePhone && (
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">📱 Número Conectado</p>
                    <p className="text-white font-black text-lg">{selectedInstancePhone}</p>
                    <p className="text-[10px] text-slate-400 mt-2">Mensagens serão enviadas para este número</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Status & Controls */}
        <div className="dashboard-card flex flex-col h-full relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20">
              <Flame size={18} />
            </div>
            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Realtime Protect</h3>
          </div>

          {/* Status List */}
          <div className="space-y-3 flex-1">
            {[
              { label: 'Anti-Ban Sistema', status: true },
              { label: 'Rate Limiting', status: true },
              { label: 'Detecção Automática', status: false },
              { label: 'Sincronização Cloud', status: true }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-8 pt-8 border-t border-white/10">
            <button className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center justify-center gap-2">
              <Play size={14} />
              Play
            </button>
            <button className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-amber-500/20 flex items-center justify-center gap-2">
              <Pause size={14} />
              Pausar
            </button>
            <button className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/20 flex items-center justify-center gap-2">
              <Square size={14} />
              Parar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarmupCloud;
