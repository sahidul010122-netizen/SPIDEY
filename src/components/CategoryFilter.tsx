import React, { useRef, useState, useEffect } from 'react';
import { CATEGORY_CAROUSEL_ITEMS } from '../data/mockJerseys';

interface ShopByCategoryProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryFilter: React.FC<ShopByCategoryProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = CATEGORY_CAROUSEL_ITEMS;

  // Handle scroll to calculate active pagination dot
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 240; // approx width + gap
      const index = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(Math.max(index, 0), items.length - 1));
    }
  };

  const scrollToItem = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = 240;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto">
      {/* Centered Heading matching screenshot */}
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
          Shop by Category
        </h2>
      </div>

      {/* Horizontal Carousel Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-3 px-1 snap-x snap-mandatory"
      >
        {items.map((cat, idx) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase() || 
            (selectedCategory === 'all' && idx === 0 && false);

          return (
            <div
              key={cat.id}
              onClick={() => {
                if (selectedCategory === cat.id) {
                  onSelectCategory('all');
                } else {
                  onSelectCategory(cat.id);
                }
              }}
              className={`snap-start shrink-0 w-[210px] sm:w-[240px] h-[100px] sm:h-[110px] rounded-2xl sm:rounded-3xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                selectedCategory === cat.id
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'bg-[#f6f7f9] hover:bg-[#ededf2] text-neutral-900'
              }`}
            >
              {/* Category Name on Left */}
              <div className="pl-2 flex-1">
                <span className="text-sm sm:text-base font-bold tracking-tight block">
                  {cat.name}
                </span>
                {cat.subtitle && (
                  <span className={`text-[10px] sm:text-[11px] block mt-0.5 ${
                    selectedCategory === cat.id ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
                    {cat.subtitle}
                  </span>
                )}
              </div>

              {/* Product Preview Image on Right */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white/80 shrink-0 flex items-center justify-center shadow-inner">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Dot Indicators with Elongated Active Pill */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {items.map((cat, idx) => {
          const isActive = activeIndex === idx;
          return (
            <button
              key={cat.id}
              onClick={() => scrollToItem(idx)}
              aria-label={`Go to category ${cat.name}`}
              className={`transition-all duration-300 ${
                isActive 
                  ? 'w-7 h-2 bg-neutral-600 rounded-full' 
                  : 'w-2 h-2 bg-neutral-300 rounded-full hover:bg-neutral-400'
              }`}
            />
          );
        })}
      </div>
    </section>
  );
};
