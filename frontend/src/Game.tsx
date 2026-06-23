import { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { LoginModal } from './components/LoginModal';
import { Map } from './components/Map';
import { Leaderboard } from './components/Leaderboard';
import { Chat } from './components/Chat';
import { CityLeadersTab } from './components/CityLeadersTab';
import { ProfileTab } from './components/ProfileTab';

import { LogOut, Trophy, Crown, User as UserIcon } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Game() {
  const {
    user,
    setCities,
    setPixels,
    setStats,
    connectSocket,
    logout,
    fetchCityLeaders,
  } = useGameStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<'leaderboard' | 'cityLeaders' | 'profile' | null>(window.innerWidth > 768 ? 'leaderboard' : null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [citiesRes, mapRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/cities`),
          fetch(`${API_URL}/api/map`),
          fetch(`${API_URL}/api/stats`)
        ]);

        setCities(await citiesRes.json());
        setPixels(await mapRes.json());
        setStats(await statsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      connectSocket();
      fetchCityLeaders();
    }
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast.success('Satın alma başarılı 🥳');
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#060B18]">
      {!user && <LoginModal />}

      {user && (
        <button
          onClick={logout}
          className="absolute top-4 right-4 text-white"
        >
          <LogOut />
        </button>
      )}

      <Map />
      {user && <Chat />}

      <div className="absolute right-4 top-4 z-40 flex flex-col items-end pointer-events-none">
        <div className="flex gap-2 mb-2 pointer-events-auto">
          <button 
            onClick={() => setActiveTab(activeTab === 'leaderboard' ? null : 'leaderboard')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'leaderboard' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'glass text-slate-400 hover:text-indigo-400'}`}
          >
            <Trophy size={18} />
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === 'cityLeaders' ? null : 'cityLeaders')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'cityLeaders' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'glass text-slate-400 hover:text-amber-400'}`}
          >
            <Crown size={18} />
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === 'profile' ? null : 'profile')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'profile' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'glass text-slate-400 hover:text-emerald-400'}`}
          >
            <UserIcon size={18} />
          </button>
        </div>

        <div className={`pointer-events-auto w-[calc(100vw-2rem)] md:w-80 transition-all duration-300 origin-top-right ${activeTab ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
          <div className="h-[60vh] md:h-auto max-h-[80vh] overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'cityLeaders' && <CityLeadersTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}