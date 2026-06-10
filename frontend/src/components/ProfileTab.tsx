import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { User, LogOut, ShieldCheck, Crown } from 'lucide-react';

export const ProfileTab: React.FC = () => {
  const { user, logout } = useGameStore();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <User size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Profilim</h2>
            <div className="text-[10px] text-slate-400">{user.username}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex flex-col items-center justify-center p-6 bg-slate-800/50 rounded-2xl border border-white/5">
          <div className="relative">
            <div className={`w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4 ${user.equippedFrame ? `border-2 ${user.equippedFrame}` : ''}`}>
              <span className={`text-2xl font-bold ${user.equippedNameColor || 'text-white'}`}>
                {user.displayName?.charAt(0).toUpperCase()}
              </span>
            </div>
            {user.isSupporter && (
              <div className="absolute -top-2 -right-2 bg-purple-500 p-1.5 rounded-lg shadow-lg">
                <Crown size={14} className="text-white" />
              </div>
            )}
          </div>
          <h3 className={`text-xl font-bold ${user.equippedNameColor || 'text-white'}`}>
            {user.displayName}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            {user.isSupporter && (
              <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck size={12} /> Premium
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold text-sm mb-3">İstatistikler</h3>
          <div className="p-4 glass rounded-xl flex items-center justify-between">
            <span className="text-sm text-slate-300">Toplam Yerleştirilen Piksel</span>
            <span className="text-lg font-bold text-indigo-400">{user.totalPixelsPlaced || 0}</span>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};
