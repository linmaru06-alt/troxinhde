import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface AccommodationSchema {
  name: string;
  description?: string;
  images?: string[];
  address?: string;
  district?: string;
  price?: number;
  area?: number;
  amenities?: string[];
  avgRating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  pcccPassed?: boolean;
}

export interface ProductSchema {
  name: string;
  description?: string;
  images?: string[];
  price?: number;
  condition?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItemSchema {
  question: string;
  answer: string;
}

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string;
  noindex?: boolean;
  isHome?: boolean;
  accommodation?: AccommodationSchema;
  product?: ProductSchema;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItemSchema[];
}

export const SEOHead: React.FC<SEOProps> = ({
  title = 'TroXinh - Tìm Phòng Trọ Sinh Viên Đã Kiểm Duyệt tại Hà Nội',
  description = 'Nền tảng tìm phòng trọ uy tín dành cho sinh viên và người đi làm tại Hà Nội. 100% phòng đã kiểm duyệt PCCC, giá minh bạch, kết nối trực tiếp với chủ trọ.',
  image = '/images/hero-banner.webp',
  url,
  type = 'website',
  keywords = 'phòng trọ hà nội, thuê phòng sinh viên, nhà trọ cầu giấy, phòng trọ đống đa, bách khoa, đhqg hà nội',
  noindex = false,
  isHome = false,
  accommodation,
  product,
  breadcrumbs,
  faqs,
}) => {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://troxinh.vn';
  const currentUrl = url ? `${siteUrl}${url}` : typeof window !== 'undefined' ? window.location.href : 'https://troxinh.vn';
  const fullTitle = title.includes('TroXinh') || title.includes('Trọ Xinh') ? title : `${title} | TroXinh.vn`;

  // Schema.org JSON-LD Structured Data Builder (Using Google @graph Recommended Format)
  const graph: any[] = [];

  // 1. BreadcrumbList Schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
      })),
    });
  }

  // 2. FAQPage Schema
  if (faqs && faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  // 3. Primary Entity Schemas
  if (accommodation) {
    graph.push({
      '@type': 'Apartment',
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
      geo: {
        '@type': 'GeoCoordinates',
        latitude: accommodation.latitude || 21.0285,
        longitude: accommodation.longitude || 105.8542,
      },
      numberOfRooms: 1,
      ...(accommodation.area
        ? {
            floorSize: {
              '@type': 'QuantitativeValue',
              value: accommodation.area,
              unitCode: 'MTK',
            },
          }
        : {}),
      ...(Array.isArray(accommodation.amenities) && accommodation.amenities.length > 0
        ? {
            amenityFeature: accommodation.amenities.map((item) => ({
              '@type': 'LocationFeatureSpecification',
              name: item,
              value: true,
            })),
          }
        : {}),
      offers: accommodation.price
        ? {
            '@type': 'Offer',
            price: accommodation.price,
            priceCurrency: 'VND',
            availability: 'https://schema.org/InStock',
            validFrom: '2026-01-01',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: accommodation.price,
              priceCurrency: 'VND',
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
    });
  } else if (product) {
    graph.push({
      '@type': 'Product',
      name: product.name,
      image: product.images && product.images.length > 0 ? product.images : [image],
      description: product.description || description,
      offers: {
        '@type': 'Offer',
        price: product.price || 0,
        priceCurrency: 'VND',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/UsedCondition',
      },
    });
  } else if (isHome) {
    // Homepage Rich Entities: WebSite + RealEstateAgent (Local Business)
    graph.push(
      {
        '@type': 'WebSite',
        name: 'Trọ Xinh Việt Nam',
        url: 'https://troxinh.vn',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://troxinh.vn/tim-kiem?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'RealEstateAgent',
        name: 'Trọ Xinh - Nền Tảng Tìm Trọ & Quản Lý Nhà Trọ Đã Kiểm Duyệt',
        url: 'https://troxinh.vn',
        logo: `${siteUrl}/images/logo.png`,
        image: `${siteUrl}/images/hero-banner.webp`,
        description: 'Nền tảng kết nối trực tiếp chủ trọ và người thuê phòng, tìm bạn ở ghép, thanh lý đồ cũ sinh viên tại Hà Nội với 100% phòng được kiểm duyệt PCCC.',
        telephone: '0888110789',
        priceRange: '1.500.000 VND - 10.000.000 VND',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '18 Ngõ 167 Tây Sơn, P. Quang Trung',
          addressLocality: 'Đống Đa',
          addressRegion: 'Hà Nội',
          addressCountry: 'VN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 21.0117,
          longitude: 105.8236,
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Hà Nội, Việt Nam',
        },
        sameAs: [
          'https://www.facebook.com/troxinh.vn',
          'https://www.tiktok.com/@troxinh.vn',
          'https://zalo.me/0888110789',
        ],
      }
    );
  } else {
    // Default Website Schema
    graph.push({
      '@type': 'WebSite',
      name: 'Trọ Xinh Việt Nam',
      url: 'https://troxinh.vn',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://troxinh.vn/tim-kiem?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={currentUrl} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Trọ Xinh Hà Nội" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />

      {/* JSON-LD Script */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};
