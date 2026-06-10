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
    useState<'leaderboard' | 'cityLeaders' | 'profile'>('leaderboard');

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

      <div className="absolute right-4 top-4 w-80 flex flex-col">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('leaderboard')}>
            <Trophy />
          </button>
          <button onClick={() => setActiveTab('cityLeaders')}>
            <Crown />
          </button>
          <button onClick={() => setActiveTab('profile')}>
            <UserIcon />
          </button>
        </div>

        <div>
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'cityLeaders' && <CityLeadersTab />}
          {activeTab === 'profile' && <ProfileTab />}
        </div>
      </div>

      <Toaster />
    </div>
  );
}