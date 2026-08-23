import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface AccommodationSchema {
  name: string;
  description?: string;
  images?: string[];
  address?: string;
  district?: string;
  price?: number;
  avgRating?: number;
  reviewCount?: number;
}

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string;
  accommodation?: AccommodationSchema;
}

export const SEOHead: React.FC<SEOProps> = ({
  title = 'TroXinh - Tìm Phòng Trọ Sinh Viên Đã Kiểm Duyệt tại Hà Nội',
  description = 'Nền tảng tìm phòng trọ uy tín dành cho sinh viên và người đi làm tại Hà Nội. 100% phòng đã kiểm duyệt PCCC, giá minh bạch, kết nối trực tiếp với chủ trọ.',
  image = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=630&fit=crop',
  url,
  type = 'website',
  keywords = 'phòng trọ hà nội, thuê phòng sinh viên, nhà trọ cầu giấy, phòng trọ đống đa, bách khoa, đhqg hà nội',
  accommodation,
}) => {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://troxinh.vn';
  const currentUrl = url ? `${siteUrl}${url}` : typeof window !== 'undefined' ? window.location.href : 'https://troxinh.vn';
  const fullTitle = title.includes('TroXinh') || title.includes('Trọ Xinh') ? title : `${title} | TroXinh.vn`;

  // Schema.org JSON-LD Structured Data
  const structuredData = accommodation
    ? {
        '@context': 'https://schema.org',
        '@type': 'Accommodation',
        name: accommodation.name,
        description: accommodation.description || description,
        image: accommodation.images && accommodation.images.length > 0 ? accommodation.images : [image],
        address: {
          '@type': 'PostalAddress',
          streetAddress: accommodation.address || 'Hà Nội',
          addressLocality: accommodation.district || 'Hà Nội',
          addressRegion: 'Hà Nội',
          addressCountry: 'VN',
        },
        offers: accommodation.price
          ? {
              '@type': 'Offer',
              price: accommodation.price,
              priceCurrency: 'VND',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                unitText: 'MONTH',
              },
            }
          : undefined,
        aggregateRating:
          accommodation.avgRating && accommodation.reviewCount
            ? {
                '@type': 'AggregateRating',
                ratingValue: accommodation.avgRating,
                reviewCount: accommodation.reviewCount,
              }
            : undefined,
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Trọ Xinh Việt Nam',
        url: 'https://troxinh.vn',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://troxinh.vn/tim-kiem?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      };

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
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Trọ Xinh Hà Nội" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Script */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};
