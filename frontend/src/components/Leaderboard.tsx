import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Users, Activity, Crown, Medal, Award } from 'lucide-react';

const rankIcons = [
  <Crown size={16} className="text-yellow-400" />,
  <Medal size={16} className="text-slate-300" />,
  <Award size={16} className="text-amber-600" />,
];

export const Leaderboard: React.FC = () => {
  const { leaderboard, totalPixels, onlineUsers, cityLeaders } = useGameStore();

  return (
    <div className="w-80 glass-strong h-full flex flex-col z-10 relative border-l border-white/5">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-bold flex items-center gap-2.5 mb-5 text-white">
          <div className="p-1.5 rounded-lg bg-yellow-500/15">
            <Trophy size={18} className="text-yellow-400" />
          </div>
          Liderlik Tablosu
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 p-3.5 rounded-xl border border-white/5 group hover:border-indigo-500/20 transition-colors">
            <div className="text-slate-500 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider font-medium">
              <Activity size={12}/> Toplam Piksel
            </div>
            <div className="font-bold text-xl text-white tracking-tight">{totalPixels.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900/50 p-3.5 rounded-xl border border-white/5 group hover:border-emerald-500/20 transition-colors">
            <div className="text-slate-500 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider font-medium">
              <Users size={12}/> Çevrimiçi
            </div>
            <div className="font-bold text-xl text-emerald-400 tracking-tight">{onlineUsers}</div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {leaderboard.map((city, index) => {
          const percentage = totalPixels > 0 ? ((city.pixelCount / totalPixels) * 100) : 0;
          const isTop3 = index < 3;
          const leader = cityLeaders.find((l: any) => l.cityId === city.id);

          return (
            <div 
              key={city.id} 
              className={`glass rounded-xl p-3 flex items-center gap-3 transition-all duration-300 ${isTop3 ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5'}`}
            >
              {/* Rank number or icon */}
              <div className="w-6 flex justify-center shrink-0">
                {isTop3 ? rankIcons[index] : <span className="font-bold text-slate-500 text-sm">{index + 1}</span>}
              </div>

              {/* City Color Dot */}
              <div 
                className="w-3 h-3 rounded-full shrink-0 shadow-lg" 
                style={{ backgroundColor: city.color, boxShadow: `0 0 10px ${city.color}80` }}
              />

              {/* Name and count */}
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-1.5 font-semibold text-sm truncate ${isTop3 ? 'text-white' : 'text-slate-300'}`}>
                  {city.name}
                  {leader && (
                    <div className="group/leader relative flex items-center">
                      <Crown size={12} className="text-amber-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/leader:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                        Lider: {leader.displayName}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">{city.pixelCount.toLocaleString()} piksel</div>
              </div>

              {/* Percentage bar */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-xs font-bold text-slate-400">%{percentage.toFixed(1)}</div>
                <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: city.color
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
