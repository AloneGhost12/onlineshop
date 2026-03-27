// app/sitemap.js
// Dynamically generate sitemap for all products, categories, and pages
// Google recommends sitemaps for better indexing

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopvault.com';

  // 1. Static pages
  const staticPages = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // 2. Fetch categories from API
  let categoryPages = [];
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    if (response.ok) {
      const categories = await response.json();
      categoryPages = (categories.data || []).map((cat) => ({
        url: `${baseUrl}/products?category=${encodeURIComponent(cat.name)}`,
        lastModified: new Date(cat.updatedAt || new Date()),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch categories for sitemap:', error);
  }

  // 3. Fetch products from API
  let productPages = [];
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products?limit=50000`,
      { next: { revalidate: 3600 } } // Cache for 1 hour - products change frequently
    );
    if (response.ok) {
      const data = await response.json();
      const products = data.data || [];
      productPages = products.map((product) => ({
        url: `${baseUrl}/product/${product._id}`,
        lastModified: new Date(product.updatedAt || product.createdAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  // Note: Split large sitemaps (Google limit is 50,000 URLs per sitemap)
  return [...staticPages, ...categoryPages, ...productPages];
}
