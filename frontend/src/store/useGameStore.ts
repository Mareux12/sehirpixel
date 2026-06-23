import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

export interface UserCosmetic {
  id: number;
  productId: string;
}

export interface User {
  id: number;
  username: string; // email - used for API/auth
  displayName: string; // shown in chat & UI
  cityId: number;
  lastPlacedTime: string | null;
  isSupporter: boolean;
  equippedFrame: string | null;
  equippedBadge: string | null;
  equippedNameColor: string | null;
  cosmetics?: UserCosmetic[];
  totalPixelsPlaced?: number;
}

export interface City {
  id: number;
  name: string;
  color: string;
}

export interface Pixel {
  id: number;
  x: number;
  y: number;
  cityId: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  color: string;
  pixelCount: number;
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  isSupporter?: boolean;
  equippedFrame?: string | null;
  equippedBadge?: string | null;
  equippedNameColor?: string | null;
  isLeader?: boolean;
}

export interface CityLeaderData {
  cityId: number;
  cityName: string;
  userId: number;
  username: string;
  displayName: string;
  cycleEnd: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  stripePriceId: string;
}

interface GameState {
  user: User | null;
  cities: City[];
  pixels: Pixel[];
  leaderboard: LeaderboardEntry[];
  totalUsers: number;
  onlineUsers: number;
  totalPixels: number;
  cooldownRemaining: number;
  socket: Socket | null;
  lastUpdatedPixel: Pixel | null;
  chatMessages: ChatMessage[];
  cityLeaders: CityLeaderData[];
  storeProducts: Product[];
  
  setUser: (user: User) => void;
  setCities: (cities: City[]) => void;
  setPixels: (pixels: Pixel[]) => void;
  updatePixel: (x: number, y: number, cityId: number) => void;
  setStats: (stats: any) => void;
  setOnlineUsers: (count: number) => void;
  connectSocket: () => void;
  setCooldown: (seconds: number) => void;
  changeCity: (cityId: number) => Promise<void>;
  sendChatMessage: (message: string) => void;
  fetchCityLeaders: () => Promise<void>;
  fetchStoreProducts: () => Promise<void>;
  logout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = API_URL;

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  cities: [],
  pixels: [],
  leaderboard: [],
  totalUsers: 0,
  onlineUsers: 0,
  totalPixels: 0,
  cooldownRemaining: 0,
  socket: null,
  lastUpdatedPixel: null,
  chatMessages: [],
  cityLeaders: [],
  storeProducts: [],

  setUser: (user) => {
    set({ user });
    localStorage.setItem('pixel_user', JSON.stringify(user));
  },

  changeCity: async (cityId) => {
    const { user, setUser } = get();
    if (!user) return;
    const res = await fetch(`${API_URL}/api/change-city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, cityId })
    });
    if (res.ok) {
      const updatedUser = await res.json();
      // Keep displayName and cosmetics from existing user state if not provided
      setUser({ ...updatedUser, displayName: user.displayName, cosmetics: updatedUser.cosmetics || user.cosmetics });
    }
  },

  fetchCityLeaders: async () => {
    const res = await fetch(`${API_URL}/api/leaders`);
    if (res.ok) {
      const cityLeaders = await res.json();
      set({ cityLeaders });
    }
  },

  fetchStoreProducts: async () => {
    const res = await fetch(`${API_URL}/api/products`);
    if (res.ok) {
      const storeProducts = await res.json();
      set({ storeProducts });
    }
  },

  setCities: (cities) => set({ cities }),
  
  setPixels: (pixels) => set({ pixels }),

  updatePixel: (x, y, cityId) => {
    set((state) => ({
      pixels: state.pixels.map(p => p.x === x && p.y === y ? { ...p, cityId } : p)
    }));
  },

  setStats: (stats) => {
    set({
      totalUsers: stats.totalUsers || get().totalUsers,
      totalPixels: stats.totalPixels || get().totalPixels,
      leaderboard: stats.leaderboard || get().leaderboard,
    });
  },

  setOnlineUsers: (count) => set({ onlineUsers: count }),

  setCooldown: (seconds) => set({ cooldownRemaining: seconds }),

  sendChatMessage: (message) => {
    const { socket, user, cityLeaders } = get();
    if (!socket || !user || !message.trim()) return;
    const isLeader = cityLeaders.some(l => l.userId === user.id);
    socket.emit('chat_message', { 
      username: user.displayName, 
      message: message.trim(),
      isSupporter: user.isSupporter,
      equippedFrame: user.equippedFrame,
      equippedBadge: user.equippedBadge,
      equippedNameColor: user.equippedNameColor,
      isLeader
    });
  },

  connectSocket: () => {
    const { user, socket: currentSocket, logout } = get();
    if (!user || currentSocket) return;
    
    const socket = io(SOCKET_URL, {
      auth: { username: user.username }
    });

    socket.on('init', (data) => {
      set({ 
        pixels: data.pixels, 
        leaderboard: data.leaderboard,
        totalUsers: data.totalUsers,
        onlineUsers: data.onlineUsers,
        totalPixels: data.totalPixels,
        lastUpdatedPixel: null
      });
    });

    socket.on('force_logout', () => {
      alert('Aynı kullanıcı adı ile başka bir cihazdan giriş yapıldı. Oturumunuz kapatılıyor.');
      logout();
    });

    socket.on('pixel_update', (pixel: { x: number, y: number, cityId: number }) => {
      get().updatePixel(pixel.x, pixel.y, pixel.cityId);
      set({ lastUpdatedPixel: pixel as Pixel });
    });

    socket.on('error', (errMessage: string) => {
      toast.error(errMessage, {
        style: { background: '#1e293b', color: '#fff' }
      });
    });

    socket.on('user_update', (data: { totalPixelsPlaced: number }) => {
      const { user } = get();
      if (user) {
        set({ user: { ...user, totalPixelsPlaced: data.totalPixelsPlaced } });
        localStorage.setItem('pixel_user', JSON.stringify({ ...user, totalPixelsPlaced: data.totalPixelsPlaced }));
      }
    });

    socket.on('stats_update', (data: any) => {
      const updates: Partial<GameState> = {};
      if (data.leaderboard) updates.leaderboard = data.leaderboard;
      if (data.totalPixels !== undefined) updates.totalPixels = data.totalPixels;
      if (Object.keys(updates).length > 0) set(updates);
    });

    socket.on('online_users', (count: number) => {
      set({ onlineUsers: count });
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      set((state) => ({
        chatMessages: [...state.chatMessages.slice(-100), msg] // keep last 100
      }));
    });

    socket.on('new_leaders', (leaders: CityLeaderData[]) => {
      set({ cityLeaders: leaders });
      // Notify user if they became leader
      const { user } = get();
      if (user && leaders.some(l => l.userId === user.id)) {
        // Here we could trigger a global toast event. Let's do it in the UI component
      }
    });

    socket.on('purchase_success', (data: { userId: number, productId: string }) => {
      const { user } = get();
      if (user && data.userId === user.id) {
        // Need to refetch user or update local state
        // For simplicity, we can reload or emit an event
        window.location.href = '/?payment=success'; // simple way to refresh state
      }
    });

    socket.on('error', (msg: string) => {
      console.error('Socket error:', msg);
    });

    set({ socket });
  },

  logout: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    localStorage.removeItem('pixel_user');
    set({ user: null, socket: null, chatMessages: [] });
  }
}));
