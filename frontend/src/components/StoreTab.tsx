import React, { useEffect, useState } from 'react';
import { useGameStore, type Product } from '../store/useGameStore';
import { ShoppingBag, Star, Sparkles, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// TODO: Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

export const StoreTab: React.FC = () => {
  const { storeProducts, fetchStoreProducts, user } = useGameStore();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreProducts();
  }, [fetchStoreProducts]);

  const handlePurchase = async (product: Product) => {
    if (!user) return;
    setLoadingProductId(product.id);
    try {
      const res = await fetch('http://localhost:3000/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, userId: user.id }),
      });
      const data = await res.json();
      
      if (data.id) {
        const stripe = await stripePromise;
        // @ts-ignore
        await stripe?.redirectToCheckout({ sessionId: data.id });
      }
    } catch (error) {
      console.error('Purchase failed', error);
    } finally {
      setLoadingProductId(null);
    }
  };

  const hasCosmetic = (productId: string) => {
    return user?.cosmetics?.some(c => c.productId === productId);
  };

  const groupedProducts = storeProducts.reduce((acc, p) => {
    if (!acc[p.type]) acc[p.type] = [];
    acc[p.type].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'frame': return <div className="w-6 h-6 rounded-md border-2 border-amber-400" />;
      case 'badge': return <Star size={16} className="text-amber-400" />;
      case 'nameColor': return <Sparkles size={16} className="text-pink-400" />;
      case 'supporter': return <Crown size={16} className="text-purple-400" />;
      default: return <ShoppingBag size={16} />;
    }
  };

  const getTypeName = (type: string) => {
    switch(type) {
      case 'frame': return 'Çerçeveler';
      case 'badge': return 'Rozetler';
      case 'nameColor': return 'İsim Efektleri';
      case 'supporter': return 'Premium Abonelik';
      default: return 'Diğer';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <ShoppingBag size={16} className="text-pink-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Kozmetik Mağazası</h2>
            <div className="text-[10px] text-slate-400">Oyununa hava kat! (Avantaj sağlamaz)</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedProducts).map(([type, products]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              {getTypeIcon(type)}
              <h3 className="text-white font-semibold text-sm">{getTypeName(type)}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => {
                const owned = product.type === 'supporter' ? user?.isSupporter : hasCosmetic(product.id);
                return (
                  <div key={product.id} className="glass rounded-xl p-3 flex flex-col items-center text-center gap-2 relative overflow-hidden group">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      {getTypeIcon(product.type)}
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">{product.name}</div>
                    <div className="text-[10px] font-semibold text-emerald-400">{product.price} ₺</div>
                    
                    {owned ? (
                      <button disabled className="mt-2 w-full py-1.5 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
                        <Check size={12} /> Sahip
                      </button>
                    ) : (
                      <button 
                        onClick={() => handlePurchase(product)}
                        disabled={loadingProductId === product.id}
                        className="mt-2 w-full py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors"
                      >
                        {loadingProductId === product.id ? 'Bekleyin...' : 'Satın Al'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Crown icon as fallback
const Crown = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);
