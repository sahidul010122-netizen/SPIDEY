import { JerseyProduct } from '../types';

export const heroBannerImg = '';

export interface CategoryCardData {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
  tag?: string;
}

// Clean default state - Only user-uploaded categories and products are maintained
export const CATEGORY_CAROUSEL_ITEMS: CategoryCardData[] = [];

export const INITIAL_JERSEYS: JerseyProduct[] = [];
