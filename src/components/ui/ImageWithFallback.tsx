import React, { useState } from 'react';
import { getOptimizedImageUrl, ImagePreset } from '../../lib/cloudinary';
import { Home, Building2, User, Package, ImageOff } from 'lucide-react';

export interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  preset?: ImagePreset;
  fallback?: 'room' | 'building' | 'avatar' | 'item';
  className?: string;
  loading?: 'lazy' | 'eager';
  width?: number | string;
  height?: number | string;
  onClick?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  preset = 'thumbnail',
  fallback = 'room',
  className = 'w-full h-full object-cover',
  loading = 'lazy',
  width,
  height,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = src ? getOptimizedImageUrl(src, preset) : '';

  if (!src || hasError) {
    const getInitials = (name: string) => {
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
      <div
        className={`flex flex-col items-center justify-center select-none ${
          fallback === 'avatar' ? 'bg-emerald-50 text-[#006d37]' : 'bg-gray-100 text-gray-400'
        } ${className}`}
        style={{ width, height }}
        onClick={onClick}
      >
        {fallback === 'room' && (
          <>
            <Home className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-[10px] font-medium text-gray-400">Chưa có ảnh</span>
          </>
        )}

        {fallback === 'building' && (
          <>
            <Building2 className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-[10px] font-medium text-gray-400">Chưa có ảnh</span>
          </>
        )}

        {fallback === 'item' && (
          <>
            <Package className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-[10px] font-medium text-gray-400">Chưa có ảnh</span>
          </>
        )}

        {fallback === 'avatar' && (
          <div className="font-bold text-sm sm:text-base tracking-wider">
            {alt ? getInitials(alt) : <User className="w-6 h-6" />}
          </div>
        )}
      </div>
    );
  }

  const isLocalImage = optimizedSrc && !optimizedSrc.startsWith('http') && !optimizedSrc.startsWith('data:');
  const webpSrc = isLocalImage ? optimizedSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp') : '';

  return (
    <picture className="contents">
      {isLocalImage && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        onError={() => setHasError(true)}
        className={className}
        onClick={onClick}
      />
    </picture>
  );
};
