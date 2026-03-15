'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart();
  const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';

  const normalizeImageUrl = (url) => {
    const value = String(url || '').trim();
    if (!value) return FALLBACK_IMAGE_URL;

    if (value.includes('photo-1507473885765-e6ed057ab6fe')) {
      return FALLBACK_IMAGE_URL;
    }

    return value;
  };
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

    const imageUrl = normalizeImageUrl(product.images?.[0]?.url);
  const sellerName = product.sellerId?.storeName || product.sellerStoreName;
  const isVerifiedSeller = Boolean(product.sellerId?.isVerified);

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-200/60 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 animate-fade-in opacity-0 stagger-${Math.min(index + 1, 6)}`}
    >
      {/* Image */}
      <Link href={`/product/${product._id}`} className="relative block aspect-square overflow-hidden bg-slate-50">
        <Image
          src={imageUrl}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
        />
        {discount > 0 && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-lg shadow-lg">
            -{discount}%
          </div>
        )}
        {product.featured && (
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg">
            ⭐ Featured
          </div>
        )}

        {/* Quick actions overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <button
            onClick={(e) => { e.preventDefault(); addToCart(product._id); }}
            className="px-5 py-2.5 bg-white text-slate-800 rounded-xl text-sm font-semibold hover:bg-indigo-500 hover:text-white transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {product.category && (
          <p className="text-xs font-medium text-indigo-500 mb-1.5 uppercase tracking-wide">
            {product.category.name || product.category}
          </p>
        )}

        {/* Title */}
        <Link href={`/product/${product._id}`}>
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
            {product.title}
          </h3>
        </Link>

        {sellerName && (
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Sold by {sellerName}</span>
            {isVerifiedSeller && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Seller
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating || 0)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            ({product.numReviews || 0})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">
            ₹{product.price?.toLocaleString('en-IN')}
          </span>
          {product.comparePrice > product.price && (
            <span className="text-sm text-slate-400 line-through">
              ₹{product.comparePrice?.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Stock indicator */}
        {product.stock <= 5 && product.stock > 0 && (
          <p className="text-xs text-red-500 font-medium mt-2">
            Only {product.stock} left!
          </p>
        )}
        {product.stock === 0 && (
          <p className="text-xs text-slate-400 font-medium mt-2">Out of stock</p>
        )}
      </div>
    </div>
  );
}
