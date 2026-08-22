import React from 'react';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  fallbackType?: 'room' | 'building' | 'avatar' | 'marketplace' | 'review';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  priority = false,
  fallbackType,
  onError,
  ...rest
}) => {
  // Generate .webp replacement path if string ends with .jpg/.jpeg/.png
  const isLocalImage = !src.startsWith('http') && !src.startsWith('data:');
  const webpSrc = isLocalImage ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp') : src;

  return (
    <picture className="contents">
      {isLocalImage && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding="async"
        onError={onError}
        {...rest}
      />
    </picture>
  );
};
