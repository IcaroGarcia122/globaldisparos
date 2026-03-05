import React from 'react';
import globeImg from '@/assets/globe.png';
import globeSpin from '@/assets/globe-spin.gif';

interface HeroProps {
  onCtaClick?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onCtaClick }) => {
  return (
    <section id="home" className="relative pt-24 md:pt-40 pb-24 md:pb-52 overflow-hidden px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-brand-600/5 blur-[120px] pointer-events-none"></div>

      {/* Globe background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] pointer-events-none opacity-[0.07] blur-[6px]">
        <img src={globeImg} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in shadow-lg">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Tecnologia Elite v2.6
            <img src={globeSpin} alt="" className="w-6 h-6 object-contain" />
          </div>
          
          <h1 className="text-5xl md:text-8xl font-[950] mb-8 leading-[0.9] text-white italic uppercase tracking-tighter">
            DOMINE A <br />
            <span className="gradient-text-blue">ESCALA GLOBAL</span>
          </h1>
          
          <p className="text-slate-400 text-base md:text-xl max-w-xl mx-auto lg:mx-0 mb-12 leading-relaxed font-medium">
            O ecossistema definitivo para disparos em massa. Estabilidade absoluta, proteção anti-ban e automação 100% cloud.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
            <button 
              onClick={onCtaClick}
              className="vip-cta-button w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-12 py-6 rounded-2xl text-lg font-black uppercase tracking-tight transition-all shadow-[0_20px_60px_rgba(37,99,235,0.4)] flex items-center justify-center gap-4 group active:scale-95"
            >
              Ativar Acesso VIP
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </button>
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => <img key={i} src={`https://i.pravatar.cc/100?u=${i+10}`} className="w-8 h-8 rounded-full border-2 border-[#000]" alt="" />)}
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">+15k Membros</span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-2xl lg:mt-0 scale-[0.85] origin-top-right">
          {/* Floating Badges */}
          <div className="absolute -top-10 -left-6 md:-left-16 z-30 animate-float hidden sm:block" style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-4 bg-[#1c2433]/90 backdrop-blur-xl border border-emerald-500/30 px-6 py-4 rounded-3xl shadow-2xl blue-glow">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">IA Proteção Ativa</div>
            </div>
          </div>

          <div className="absolute top-1/2 -right-8 md:-right-20 z-30 animate-float hidden sm:block" style={{ animationDelay: '2s' }}>
            <div className="flex items-center gap-4 bg-[#1c2433]/90 backdrop-blur-xl border border-brand-500/30 px-6 py-4 rounded-3xl shadow-2xl blue-glow">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14H11V21L20 10H13Z"/></svg>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">Disparo Instantâneo</div>
            </div>
          </div>

          <div className="absolute -bottom-10 -left-8 md:-left-20 z-30 animate-float hidden sm:block" style={{ animationDelay: '4s' }}>
            <div className="flex items-center gap-4 bg-[#1c2433]/90 backdrop-blur-xl border border-indigo-500/30 px-6 py-4 rounded-3xl shadow-2xl blue-glow">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              </div>
              <div className="text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">100% Cloud Hosting</div>
            </div>
          </div>

          {/* Main Dashboard Frame */}
          <div className="relative z-20 w-full bg-[#0b1121]/90 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in transition-all dashboard-panel">
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-brand-950/20">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/50 panel-dot" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/50 panel-dot" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/50 panel-dot" style={{ animationDelay: '0.3s' }}></div>
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic panel-title">PAINEL DE CONTROLE</div>
              <div className="w-12"></div>
            </div>

            <div className="p-8 md:p-12 space-y-10">
              <div className="grid grid-cols-2 gap-6 md:gap-8">
                <div className="bg-[#1c2433]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/5 hover:border-brand-500/20 transition-all group stat-card" style={{ animationDelay: '0.3s' }}>
                  <div className="text-[9px] text-slate-500 font-black mb-2 uppercase tracking-widest">MENSAGENS</div>
                  <div className="text-3xl md:text-5xl font-black text-white italic tracking-tighter mb-4 counter-value">12.840</div>
                  <div className="flex gap-1.5 h-1.5">
                    {[1,1,1,0].map((v, i) => (
                      <div key={i} className={`flex-1 rounded-full transition-all duration-700 ${v ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] bar-fill' : 'bg-slate-800'}`} style={{ animationDelay: `${0.5 + i * 0.15}s` }}></div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1c2433]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/5 hover:border-brand-500/20 transition-all group stat-card" style={{ animationDelay: '0.5s' }}>
                  <div className="text-[9px] text-slate-500 font-black mb-2 uppercase tracking-widest">CONVERSÃO</div>
                  <div className="text-3xl md:text-5xl font-black text-white italic tracking-tighter mb-4 counter-value">24%</div>
                  <div className="flex gap-1.5 h-1.5">
                    {[1,1,0,0].map((v, i) => (
                      <div key={i} className={`flex-1 rounded-full transition-all duration-700 ${v ? 'bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] bar-fill' : 'bg-slate-800'}`} style={{ animationDelay: `${0.7 + i * 0.15}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#060b16]/60 rounded-[2.5rem] border border-white/5 relative overflow-hidden group chart-container">
                <div className="flex items-end gap-2 md:gap-3 h-32 mb-8">
                  {[30, 55, 40, 85, 65, 45, 75, 55, 90, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-brand-900/10 rounded-t-xl relative overflow-hidden h-full">
                      <div className="absolute bottom-0 left-0 w-full bg-brand-600/60 shadow-[0_0_15px_rgba(59,130,246,0.3)] chart-bar" style={{ height: `${h}%`, animationDelay: `${0.8 + i * 0.08}s` }}></div>
                    </div>
                  ))}
                </div>
                <div className="h-1 bg-slate-800 w-full rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981] progress-bar"></div>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-emerald-500/5 p-6 rounded-[1.5rem] border border-emerald-500/10 success-message">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-lg success-icon">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div className="text-xs font-bold text-slate-400">
                  Campanha <span className="text-white italic">"Vendas Janeiro"</span> concluída com sucesso.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeInUp 1s ease-out forwards;
        }

        /* VIP CTA Button glow */
        .vip-cta-button {
          position: relative;
          overflow: hidden;
        }
        .vip-cta-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(59,130,246,0.6) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .vip-cta-button:hover::before {
          opacity: 1;
        }
        .vip-cta-button:hover {
          box-shadow: 0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.2);
        }

        /* Panel animations */
        .panel-dot {
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        .panel-title {
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .stat-card {
          animation: slideUp 0.6s ease-out both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .counter-value {
          animation: countGlow 3s ease-in-out infinite;
        }
        @keyframes countGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50% { text-shadow: 0 0 20px rgba(59,130,246,0.3); }
        }

        .bar-fill {
          animation: barGrow 0.8s ease-out both;
        }
        @keyframes barGrow {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }

        .chart-bar {
          animation: chartGrow 0.8s ease-out both;
        }
        @keyframes chartGrow {
          from { height: 0 !important; }
        }

        .progress-bar {
          animation: progressFill 1.5s ease-out 1.2s both;
          width: 0;
        }
        @keyframes progressFill {
          to { width: 50%; }
        }

        .success-message {
          animation: slideUp 0.6s ease-out 1.5s both;
        }

        .success-icon {
          animation: checkPop 0.4s ease-out 1.8s both;
        }
        @keyframes checkPop {
          from { transform: scale(0) rotate(-45deg); }
          to { transform: scale(1) rotate(0deg); }
        }

        .dashboard-panel:hover {
          border-color: rgba(59,130,246,0.15);
          box-shadow: 0 50px 100px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.08);
        }

        .chart-container:hover .chart-bar {
          filter: brightness(1.3);
        }
      `}} />
    </section>
  );
};

export default Hero;
