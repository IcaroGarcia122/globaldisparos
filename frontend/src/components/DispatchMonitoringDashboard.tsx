import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Clock, Zap } from 'lucide-react';
import DelayUI from './DelayUI';

interface DispatchMonitoringDashboardProps {
  isOpen: boolean;
  campaignName: string;
  groupName: string;
  totalContacts: number;
  messagesSent: number;
  status: 'running' | 'paused' | 'completed' | 'error';
  selectedDelay: string;
  onClose: () => void;
  onChangeDelay?: (delayId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export const DispatchMonitoringDashboard: React.FC<DispatchMonitoringDashboardProps> = ({
  isOpen,
  campaignName,
  groupName,
  totalContacts,
  messagesSent,
  status,
  selectedDelay,
  onClose,
  onChangeDelay,
  onPause,
  onResume,
  onCancel
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (status !== 'running') return;

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  if (!isOpen) return null;

  const progressPercent = totalContacts > 0 ? (messagesSent / totalContacts) * 100 : 0;
  const remainingContacts = Math.max(0, totalContacts - messagesSent);
  const timeStr = `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`;

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-emerald-400';
      case 'paused': return 'text-amber-400';
      case 'completed': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'running': return 'bg-emerald-500/10';
      case 'paused': return 'bg-amber-500/10';
      case 'completed': return 'bg-emerald-500/10';
      case 'error': return 'bg-red-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'running': return '🚀 Em Progresso';
      case 'paused': return '⏸️ Pausado';
      case 'completed': return '✅ Concluído';
      case 'error': return '❌ Erro';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1419]/95 border border-brand-500/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-[#0f1419] to-[#0f1419]/50 border-b border-brand-500/10 px-6 py-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase">{campaignName}</h2>
            <p className="text-sm text-slate-400 mt-1">Grupo: {groupName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className={`border border-brand-500/20 rounded-xl p-4 ${getStatusBg()}`}>
            <p className={`text-sm font-black uppercase ${getStatusColor()}`}>
              {getStatusLabel()}
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">
                  Progresso de Envio
                </p>
                <p className="text-2xl font-black text-white">
                  {messagesSent.toLocaleString()} / {totalContacts.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Tempo</p>
                <p className="text-lg font-black text-brand-400">{timeStr}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900/50 rounded-full h-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Remaining */}
            {remainingContacts > 0 && (
              <p className="text-xs text-slate-500">
                {remainingContacts.toLocaleString()} contatos a enviar (~{Math.ceil((remainingContacts * 30) / 60)} min)
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-500 uppercase font-black mb-2">Taxa</div>
              <p className="text-xl font-black text-brand-400">
                {totalContacts > 0 ? Math.round(progressPercent) : 0}%
              </p>
            </div>
            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-500 uppercase font-black mb-2">Enviadas</div>
              <p className="text-xl font-black text-emerald-400">{messagesSent}</p>
            </div>
            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-500 uppercase font-black mb-2">Restando</div>
              <p className="text-xl font-black text-amber-400">{remainingContacts}</p>
            </div>
          </div>

          {/* Delay Settings */}
          <div className="bg-slate-900/20 border border-white/5 rounded-xl p-4">
            <DelayUI 
              selectedDelay={selectedDelay}
              onSelectDelay={onChangeDelay}
              compact={true}
              showDescription={false}
            />
          </div>

          {/* Messages & Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-brand-500" />
                <p className="text-xs text-slate-500 uppercase font-black">Velocidade</p>
              </div>
              <p className="text-lg font-black text-brand-400">
                ~{messagesSent > 0 ? Math.round((messagesSent / (elapsedTime || 1)) * 60) : 0}/min
              </p>
            </div>
            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-brand-500" />
                <p className="text-xs text-slate-500 uppercase font-black">ETA</p>
              </div>
              <p className="text-lg font-black text-brand-400">
                {remainingContacts > 0 && elapsedTime > 0 
                  ? `~${Math.ceil((remainingContacts / (messagesSent / (elapsedTime / 60))) / 60)}m`
                  : '--'
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            {status === 'running' && (
              <button
                onClick={onPause}
                className="flex-1 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm rounded-lg hover:bg-amber-500/20 transition-all uppercase"
              >
                ⏸️ Pausar
              </button>
            )}
            {status === 'paused' && (
              <button
                onClick={onResume}
                className="flex-1 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm rounded-lg hover:bg-emerald-500/20 transition-all uppercase"
              >
                ▶️ Retomar
              </button>
            )}
            {(status === 'running' || status === 'paused') && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-black text-sm rounded-lg hover:bg-red-500/20 transition-all uppercase"
              >
                ✕ Cancelar
              </button>
            )}
            {status === 'completed' && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-sm rounded-lg hover:bg-emerald-500/20 transition-all uppercase"
              >
                ✓ Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchMonitoringDashboard;
