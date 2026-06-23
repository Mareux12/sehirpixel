import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { User, Shield, Sparkles, Key } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const LoginModal: React.FC = () => {
  const { cities, setUser, connectSocket } = useGameStore();
  const [isLoginTab, setIsLoginTab] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/cities`)
      .then(res => res.json())
      .then(data => {
        useGameStore.getState().setCities(data);
        if (data.length > 0) setSelectedCityId(data[0].id);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Lütfen kullanıcı adı ve şifre girin.');
      return;
    }

    if (!isLoginTab && (username.trim().length < 2 || username.trim().length > 20)) {
      setError('Kullanıcı adı 2-20 karakter olmalıdır.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isLoginTab ? '/api/login' : '/api/register';
      const body = isLoginTab 
        ? { username: username.trim(), password }
        : { username: username.trim(), password, cityId: selectedCityId || 1 };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data);
        connectSocket();
      } else {
        setError(data.error || 'Bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="glass-strong rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md animate-slide-up relative overflow-hidden flex flex-col max-h-full">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        
        <div className="p-6 md:p-8 pt-8 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
              <Sparkles size={12} /> Gerçek Zamanlı Strateji Oyunu
            </div>
            <img src="/logo.png" alt="SehirPixel Logo" className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-2 drop-shadow-2xl" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              SehirPixel
            </h1>
          </div>

          <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl mb-6 border border-white/5">
            <button 
              type="button"
              onClick={() => { setIsLoginTab(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLoginTab ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Kayıt Ol
            </button>
            <button 
              type="button"
              onClick={() => { setIsLoginTab(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLoginTab ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Giriş Yap
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-fade-in">
              <Shield size={16} className="text-red-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold text-sm flex items-center gap-2">
                <User size={14} className="text-indigo-400" /> Kullanıcı Adı
              </label>
              <input
                type="text"
                placeholder={isLoginTab ? "Kullanıcı adınız..." : "Oyundaki adın (Sohbette bu görünecek)"}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                maxLength={20}
                required
                className="w-full bg-slate-900/60 border border-slate-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-semibold text-sm flex items-center gap-2">
                <Key size={14} className="text-indigo-400" /> Şifre
              </label>
              <input
                type="password"
                placeholder="Şifreniz (En az 6 karakter)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                minLength={6}
                required
                className="w-full bg-slate-900/60 border border-slate-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-500"
              />
            </div>

            {!isLoginTab && (
              <div>
                <label className="block text-slate-300 mb-1.5 font-semibold text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Şehrini (Rengini) Seç
                </label>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(Number(e.target.value))}
                  className="w-full bg-slate-900/60 border border-slate-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm appearance-none"
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id} style={{ color: city.color }}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Lütfen bekleyin...' : (isLoginTab ? 'Giriş Yap' : 'Kayıt Ol ve Başla')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

