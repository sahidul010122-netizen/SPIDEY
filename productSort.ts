import { JerseyProduct } from '../types';

/**
 * Sorts products strictly adhering to:
 * 1. Pinned ("Top") products float to the absolute top.
 * 2. Multiple pinned items are sorted by their sequential pinnedOrder / pinnedAt.
 * 3. Non-pinned products are sorted by their drag-and-drop sortOrder / position index.
 */
export const sortProductsWithPinned = (products: JerseyProduct[]): JerseyProduct[] => {
  if (!Array.isArray(products)) return [];
  return [...products].sort((a, b) => {
    const aPinned = Boolean(a.isPinned);
    const bPinned = Boolean(b.isPinned);

    // 1. Pinned products always come first
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }

    // 2. If both are pinned, sort by their sequential pinnedOrder / pinnedAt timestamp
    if (aPinned && bPinned) {
      const orderA = typeof a.pinnedOrder === 'number' ? a.pinnedOrder : (typeof a.pinnedAt === 'number' ? a.pinnedAt : 0);
      const orderB = typeof b.pinnedOrder === 'number' ? b.pinnedOrder : (typeof b.pinnedAt === 'number' ? b.pinnedAt : 0);
      if (orderA !== orderB) return orderA - orderB;
    }

    // 3. Fallback to normal drag-and-drop sortOrder / position
    const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
    const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
    return orderA - orderB;
  });
};
