// src/components/SEO/ProductSchema.jsx
// Adds JSON-LD structured data for better search results
// Shows rich snippets with price, rating, availability in Google

export default function ProductSchema({ product, baseUrl = 'https://shopvault.com' }) {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images && product.images.length > 0 
      ? product.images.map(img => {
          // If it's a Cloudinary URL, ensure it returns the right format
          return typeof img === 'string' ? img : img.url;
        })
      : undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'ShopVault',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product._id}`,
      priceCurrency: 'USD',
      price: product.price?.toString(),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock > 0 
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'ShopVault',
      },
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.toString(),
        ratingCount: product.numReviews?.toString() || '0',
        bestRating: '5',
        worstRating: '1',
      },
    }),
    ...(product.category && {
      category: product.category,
    }),
    sku: product.sku || product._id,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
