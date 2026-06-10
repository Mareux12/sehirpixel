import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { User, Shield, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const LoginModal: React.FC = () => {
  const { cities, setUser, connectSocket } = useGameStore();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/cities`)
      .then(res => res.json())
      .then(data => useGameStore.getState().setCities(data));
  }, []);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!displayName.trim()) {
      setError('Lütfen bir kullanıcı adı girin.');
      return;
    }

    if (displayName.trim().length < 2 || displayName.trim().length > 20) {
      setError('Kullanıcı adı 2-20 karakter olmalıdır.');
      return;
    }

    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email = decoded.email;

      // Use displayName as the username for chat, email for auth
      const res = await fetch(`${API_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, cityId: cities[0]?.id || 1 })
      });

      const data = await res.json();
      if (res.ok) {
        // Keep email as username for API, add displayName for chat/UI
        const userWithName = { ...data, displayName: displayName.trim() };
        setUser(userWithName);
        connectSocket();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Sunucu hatası. Tekrar deneyin.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="glass-strong rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md animate-slide-up relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        
        <div className="p-8 pt-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
              <Sparkles size={12} /> Gerçek Zamanlı Strateji Oyunu
            </div>
            <img src="/logo.png" alt="SehirPixel Logo" className="w-32 h-32 mx-auto mb-2 drop-shadow-2xl" />
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              SehirPixel
            </h1>
            <p className="text-slate-400 text-sm">
              Kullanıcı adını belirle ve Google ile giriş yap!
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-fade-in">
              <Shield size={16} className="text-red-400 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-slate-300 mb-2 font-semibold text-sm flex items-center gap-2">
                <User size={14} className="text-indigo-400" /> Kullanıcı Adı
              </label>
              <input
                type="text"
                placeholder="Sohbette görünecek adın..."
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError('');
                }}
                maxLength={20}
                className="w-full bg-slate-900/60 border border-slate-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-500"
              />
              <div className="text-[11px] text-slate-500 mt-1.5 text-right">{displayName.length}/20</div>
            </div>

            {/* Google Login */}
            <div className="pt-1 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Client ID eksik veya hatalı.')}
                theme="filled_black"
                shape="pill"
                text="continue_with"
                size="large"
              />
            </div>
            
            <p className="text-[11px] text-center text-slate-500 leading-relaxed">
              Şehrini oyun içinden seçebilirsin. Sohbette kullanıcı adınla yazışabilirsin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
