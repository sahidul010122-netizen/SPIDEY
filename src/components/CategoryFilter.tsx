import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CategoryItem } from '../types/settings';

interface ShopByCategoryProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories: CategoryItem[];
  headingTitle?: string;
}

export const CategoryFilter: React.FC<ShopByCategoryProps> = ({
  selectedCategory,
  onSelectCategory,
  categories = [],
  headingTitle = 'Shop by Category'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Strictly sort categories based on sortOrder / position
  const items = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return [...categories].sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
      return orderA - orderB;
    });
  }, [categories]);

  // Handle scroll to calculate active pagination dot
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 240;
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

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto"
    >
      {/* Centered Heading */}
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight">
          {headingTitle}
        </h2>
      </div>

      {/* Horizontal Carousel Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-3 px-1 snap-x snap-mandatory"
      >
        {items.map((cat) => {
          const isSelected =
            selectedCategory.toLowerCase() === cat.id.toLowerCase() ||
            selectedCategory.toLowerCase() === cat.name.toLowerCase();

          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => {
                if (isSelected) {
                  onSelectCategory('all');
                } else {
                  onSelectCategory(cat.id);
                }
              }}
              className={`snap-start shrink-0 w-[210px] sm:w-[240px] h-[100px] sm:h-[110px] rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-colors duration-200 select-none border ${
                isSelected
                  ? 'bg-gradient-to-br from-[#2d0a10] to-[#171217] border-red-600/80 text-white shadow-[0_10px_28px_-8px_rgba(220,38,38,0.45)]'
                  : 'bg-[#15151a] hover:bg-[#1c1c23] border-white/[0.08] hover:border-white/20 text-neutral-100'
              }`}
            >
              {/* Category Name on Left */}
              <div className="pl-2 flex-1 min-w-0 pr-2">
                <span className="text-sm sm:text-base font-bold tracking-tight block truncate">
                  {cat.name}
                </span>
                {cat.subtitle && (
                  <span className={`text-[10px] sm:text-[11px] block mt-0.5 truncate ${
                    isSelected ? 'text-red-200/80' : 'text-neutral-400'
                  }`}>
                    {cat.subtitle}
                  </span>
                )}
              </div>

              {/* Product Preview Image on Right */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#0e0e12] border border-white/10 shrink-0 flex items-center justify-center p-1">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-400 bg-[#18181f] rounded-xl">
                    {cat.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination Dot Indicators */}
      {items.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((cat, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToItem(idx)}
                aria-label={`Go to category ${cat.name}`}
                className={`transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? 'w-7 h-2 bg-red-600 rounded-full' 
                    : 'w-2 h-2 bg-neutral-700 rounded-full hover:bg-neutral-500'
                }`}
              />
            );
          })}
        </div>
      )}
    </motion.section>
  );
};
