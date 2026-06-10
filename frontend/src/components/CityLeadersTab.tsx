import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Crown } from 'lucide-react';

export const CityLeadersTab: React.FC = () => {
  const { cityLeaders, fetchCityLeaders } = useGameStore();

  useEffect(() => {
    fetchCityLeaders();
  }, [fetchCityLeaders]);

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Crown size={16} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Şehir Liderleri</h2>
            <div className="text-[10px] text-slate-400">Güncel 81 il liderleri</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cityLeaders.length === 0 ? (
          <div className="text-center text-slate-500 text-xs mt-10">
            Henüz lider yok. Liderler her 6 saatte bir hesaplanır.
          </div>
        ) : (
          cityLeaders.map((leader) => (
            <div key={leader.cityId} className="glass rounded-xl p-3 flex items-center gap-3 animate-fade-in hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center relative shrink-0">
                <Crown size={18} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm truncate">{leader.displayName}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">{leader.cityName} Lideri</div>
              </div>
              <div className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md shrink-0">
                Bitiş: {new Date(leader.cycleEnd).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
