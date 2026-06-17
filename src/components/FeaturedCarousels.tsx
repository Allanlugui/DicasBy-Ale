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
    <div className="w-full overflow-hidden bg-stone-50 py-1 border-y border-stone-100">
      <div className="flex animate-scroll whitespace-nowrap gap-6 hover:[animation-play-state:paused]">
        {[...items, ...items, ...items].map((product, idx) => (
          <button
            key={`${product.id}-${idx}`}
            onClick={() => onItemClick(product)}
            className="inline-flex items-center gap-2 px-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded overflow-hidden border border-white shadow-sm shrink-0">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[10px] font-bold text-stone-800 leading-none truncate max-w-[120px]">{product.name}</span>
              <span className="text-[9px] font-black text-rose-500 mt-0.5">{formatCurrency(product.priceBRL)}</span>
            </div>
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
    <div className="w-full overflow-hidden bg-white py-6 border-y border-stone-100">
      <div className="flex animate-scroll-reverse whitespace-nowrap gap-12 sm:gap-24 hover:[animation-play-state:paused] items-center">
        {[...items, ...items, ...items].map((store, idx) => (
          <button
            key={`${store.id}-${idx}`}
            onClick={() => onItemClick(store.id)}
            className="inline-flex items-center group cursor-pointer"
          >
            <div className="h-10 sm:h-16 w-auto transition-all duration-300">
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl} 
                  alt={store.name} 
                  className="h-full w-auto object-contain opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all filter grayscale group-hover:grayscale-0" 
                />
              ) : (
                <span className="text-stone-300 group-hover:text-stone-900 font-black text-lg uppercase tracking-widest transition-colors">{store.name}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
