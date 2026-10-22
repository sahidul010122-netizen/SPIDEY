import React from 'react';
import { 
  Truck, ShieldCheck, RotateCcw, Award, 
  CheckCircle2, Zap, Package, Heart, Sparkles, Star
} from 'lucide-react';

interface TrustBadgeIconProps {
  icon?: string;
  className?: string;
  defaultIcon?: 'truck' | 'shield' | 'rotate-ccw';
}

export const TrustBadgeIcon: React.FC<TrustBadgeIconProps> = ({ 
  icon, 
  className = 'w-4 h-4 text-neutral-700',
  defaultIcon = 'truck'
}) => {
  const iconKey = (icon || defaultIcon || 'truck').trim().toLowerCase();

  // If it's a URL or image path (custom uploaded icon)
  if (iconKey.startsWith('http://') || iconKey.startsWith('https://') || iconKey.startsWith('/') || iconKey.startsWith('data:')) {
    return (
      <img 
        src={icon} 
        alt="" 
        referrerPolicy="no-referrer" 
        className={`${className} object-contain inline-block`} 
      />
    );
  }

  switch (iconKey) {
    case 'shield':
    case 'shieldcheck':
    case 'shield-check':
    case 'security':
      return <ShieldCheck className={className} />;
    case 'rotate-ccw':
    case 'rotateccw':
    case 'return':
    case 'refund':
      return <RotateCcw className={className} />;
    case 'award':
    case 'badge':
    case 'medal':
      return <Award className={className} />;
    case 'check-circle':
    case 'checkcircle':
    case 'check':
      return <CheckCircle2 className={className} />;
    case 'zap':
    case 'fast':
    case 'lightning':
      return <Zap className={className} />;
    case 'package':
    case 'box':
      return <Package className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'sparkles':
    case 'magic':
      return <Sparkles className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'truck':
    case 'delivery':
    case 'shipping':
    default:
      return <Truck className={className} />;
  }
};
