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

  // We repeat items multiple times to ensure the carousel is filled even on wide screens
  const duplicatedItems = [...items, ...items, ...items, ...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-white py-10 sm:py-16 border-y border-stone-100">
      <div className="flex animate-scroll whitespace-nowrap gap-16 sm:gap-40 hover:[animation-play-state:paused] items-center">
        {duplicatedItems.map((store, idx) => (
          <button
            key={`${store.id}-${idx}`}
            onClick={() => onItemClick(store.id)}
            className="inline-flex items-center group cursor-pointer shrink-0"
          >
            <div className="h-10 sm:h-20 w-auto transition-all duration-500">
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl} 
                  alt={store.name} 
                  className="h-full w-auto object-contain opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" 
                />
              ) : (
                <span className="text-stone-300 group-hover:text-rose-600 font-black text-2xl sm:text-4xl uppercase tracking-tighter transition-colors">{store.name}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
