import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Product, Store } from '../types';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface ProductCarouselProps {
  items: Product[];
  onItemClick: (product: Product) => void;
}

export function ProductCarousel({ items, onItemClick }: ProductCarouselProps) {
  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-stone-50/50 py-2 border-y border-stone-100">
      <div className="flex animate-scroll whitespace-nowrap gap-8 hover:[animation-play-state:paused]">
        {[...items, ...items, ...items].map((product, idx) => (
          <button
            key={`${product.id}-${idx}`}
            onClick={() => onItemClick(product)}
            className="inline-flex items-center gap-3 px-4 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm shrink-0">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter leading-none mb-0.5">{product.brand || 'Destaque'}</span>
              <span className="text-sm font-bold text-stone-800 leading-none truncate max-w-[150px]">{product.name}</span>
              <span className="text-[10px] font-black text-stone-400 mt-0.5">{formatCurrency(product.priceBRL)}</span>
            </div>
            <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-rose-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

interface StoreCarouselProps {
  items: Store[];
  onItemClick: (storeId: string) => void;
}

export function StoreCarousel({ items, onItemClick }: StoreCarouselProps) {
  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-stone-900 py-3">
      <div className="flex animate-scroll-reverse whitespace-nowrap gap-12 hover:[animation-play-state:paused]">
        {[...items, ...items, ...items].map((store, idx) => (
          <button
            key={`${store.id}-${idx}`}
            onClick={() => onItemClick(store.id)}
            className="inline-flex items-center gap-4 group cursor-pointer"
          >
            <div className="h-6 w-auto opacity-50 group-hover:opacity-100 transition duration-300">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-auto object-contain grayscale invert hover:grayscale-0 hover:invert-0 transition" />
              ) : (
                <span className="text-white font-bold text-xs uppercase tracking-widest">{store.name}</span>
              )}
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-700"></span>
          </button>
        ))}
      </div>
    </div>
  );
}
