// src/lib/seo.js
// Utilities for SEO: dynamic metadata, OG tags, canonical URLs

export const generateProductMetadata = (product, baseUrl = 'https://shopvault.com') => {
  return {
    title: `${product.name} | ShopVault - Buy Online`,
    description: `${product.description} - ₹${product.price}. Free shipping on orders over ₹500. Shop now!`,
    keywords: `${product.name}, ${product.category}, buy online, shop`,
    
    // Open Graph for social sharing (Facebook, LinkedIn, etc.)
    openGraph: {
      title: product.name,
      description: product.description || 'Amazing product at ShopVault',
      images: product.images && product.images.length > 0 
        ? [{ url: product.images[0], width: 1200, height: 630 }]
        : [],
      url: `${baseUrl}/product/${product._id}`,
      type: 'og:product',
      siteName: 'ShopVault',
    },
    
    // Twitter Card for Twitter sharing
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: (product.description || '').substring(0, 200),
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      creator: '@shopvault',
    },
    
    // Canonical URL (prevent duplicate content)
    canonical: `${baseUrl}/product/${product._id}`,
    
    // Alternative languages (if applicable)
    alternates: {
      canonical: `${baseUrl}/product/${product._id}`,
      languages: {
        'en-US': `${baseUrl}/en/product/${product._id}`,
      },
    },
  };
};

export const generateCategoryMetadata = (category, baseUrl = 'https://shopvault.com') => {
  return {
    title: `${category.name} | ShopVault - Buy Online`,
    description: `Shop ${category.name} at ShopVault. Huge selection, competitive prices, fast shipping.`,
    keywords: `${category.name}, online shopping, buy ${category.name}`,
    
    openGraph: {
      title: `${category.name} - ShopVault`,
      description: `Browse our collection of ${category.name}`,
      url: `${baseUrl}/products?category=${category._id}`,
      type: 'website',
      siteName: 'ShopVault',
    },
    
    canonical: `${baseUrl}/products?category=${category._id}`,
  };
};

export const generateBreadcrumbs = (items = []) => {
  // Breadcrumb schema for better navigation in search results
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

export const generateOrganizationSchema = (baseUrl = 'https://shopvault.com') => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShopVault',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Premium online shopping platform with fast delivery and secure checkout',
    sameAs: [
      'https://www.facebook.com/shopvault',
      'https://www.twitter.com/shopvault',
      'https://www.instagram.com/shopvault',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@shopvault.com',
      telephone: '+1-800-SHOP-VAULT',
    },
  };
};
