import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string;
}

export const SEOHead: React.FC<SEOProps> = ({
  title = 'TroXinh - Tìm Phòng Trọ Sinh Viên Đã Kiểm Duyệt tại Hà Nội',
  description = 'Nền tảng tìm phòng trọ uy tín dành cho sinh viên và người đi làm tại Hà Nội. 100% phòng đã kiểm duyệt PCCC, giá minh bạch, kết nối trực tiếp với chủ trọ.',
  image = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=630&fit=crop',
  url,
  type = 'website',
  keywords = 'phòng trọ hà nội, thuê phòng sinh viên, nhà trọ cầu giấy, phòng trọ đống đa, bách khoa, đhqg hà nội',
}) => {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://troxinh.vn';
  const currentUrl = url ? `${siteUrl}${url}` : typeof window !== 'undefined' ? window.location.href : 'https://troxinh.vn';
  const fullTitle = title.includes('TroXinh') || title.includes('Trọ Xinh') ? title : `${title} | TroXinh.vn`;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Trọ Xinh Hà Nội" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
