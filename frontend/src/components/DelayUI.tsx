import React from 'react';
import { Zap } from 'lucide-react';

interface DelayOption {
  id: string;
  label: string;
  minDelay: number;
  maxDelay: number;
  description: string;
  emoji: string;
}

const DELAY_OPTIONS: DelayOption[] = [
  {
    id: 'humano',
    label: 'Humano',
    minDelay: 20,
    maxDelay: 40,
    description: 'Intervalo natural e seguro',
    emoji: '🐢'
  },
  {
    id: 'veloz',
    label: 'Veloz',
    minDelay: 8,
    maxDelay: 12,
    description: 'Rápido mas realista',
    emoji: '🚗'
  },
  {
    id: 'turbo',
    label: 'Turbo Elite',
    minDelay: 3,
    maxDelay: 8,
    description: 'Agressivo e rápido',
    emoji: '⚡'
  },
  {
    id: 'caotico',
    label: 'Caótico',
    minDelay: 1,
    maxDelay: 3,
    description: 'Ritmo aleatório extremo',
    emoji: '💥'
  }
];

interface DelayUIProps {
  selectedDelay?: string;
  onSelectDelay?: (delayId: string) => void;
  showDescription?: boolean;
  compact?: boolean;
}

export const DelayUI: React.FC<DelayUIProps> = ({
  selectedDelay = 'humano',
  onSelectDelay,
  showDescription = true,
  compact = false
}) => {
  return (
    <div className={`space-y-3 ${compact ? '' : 'mb-6'}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-brand-500" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
          Velocidade do Motor
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {DELAY_OPTIONS.map((option) => (
          <div
            key={option.id}
            onClick={() => onSelectDelay?.(option.id)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedDelay === option.id
                ? 'bg-brand-500/15 border-brand-500/60 shadow-lg shadow-brand-500/20'
                : 'bg-slate-900/30 border-white/10 hover:border-brand-500/30'
            }`}
          >
            <div className="text-3xl mb-2">{option.emoji}</div>
            <h4 className="font-black text-white text-sm uppercase">{option.label}</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {option.minDelay}-{option.maxDelay}s
            </p>
            {showDescription && (
              <p className="text-[10px] text-slate-500 mt-2">{option.description}</p>
            )}
          </div>
        ))}
      </div>

      {selectedDelay && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 mt-4">
          <p className="text-xs text-brand-300 font-black">
            ✓ {DELAY_OPTIONS.find(d => d.id === selectedDelay)?.label} selecionado
          </p>
          <p className="text-[11px] text-brand-200/70 mt-1">
            Intervalo de {DELAY_OPTIONS.find(d => d.id === selectedDelay)?.minDelay}s a {DELAY_OPTIONS.find(d => d.id === selectedDelay)?.maxDelay}s entre mensagens
          </p>
        </div>
      )}
    </div>
  );
};

export default DelayUI;
