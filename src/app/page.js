'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/product/ProductCard';
import { productAPI, categoryAPI } from '@/lib/api';
import {
  ArrowRight, Truck, Shield, RefreshCw, Headphones,
  ChevronRight, Sparkles, Zap, TrendingUp
} from 'lucide-react';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [featuredRes, catRes] = await Promise.all([
          productAPI.getFeatured(8),
          categoryAPI.getAll(),
        ]);
        setFeatured(featuredRes.data || []);
        setCategories(catRes.data || []);
      } catch (error) {
        console.error('Failed to load home data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* ─── Hero Section ───────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              New Season Collection is Here
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 animate-slide-up">
              Discover Premium
              <span className="block bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                Products You&apos;ll Love
              </span>
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
              Shop the latest trends with unbeatable prices. Free shipping on orders over ₹500. 
              Secure checkout and fast delivery guaranteed.
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 rounded-2xl font-semibold hover:bg-indigo-50 transition-all shadow-xl shadow-black/10 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-0.5"
                id="hero-shop-now"
              >
                Shop Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/products?featured=true"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 backdrop-blur-sm text-white rounded-2xl font-semibold hover:bg-white/25 transition-all border border-white/20"
              >
                <TrendingUp className="w-5 h-5" /> Trending
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Badges ───────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'Orders over ₹500' },
              { icon: Shield, title: 'Secure Payment', desc: '256-bit encryption' },
              { icon: RefreshCw, title: 'Easy Returns', desc: '30-day return window' },
              { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                  <badge.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{badge.title}</p>
                  <p className="text-xs text-slate-500">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ─────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Shop by Category</h2>
              <p className="text-slate-500 text-sm mt-1">Find exactly what you&apos;re looking for</p>
            </div>
            <Link href="/products" className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <Link
                key={cat._id}
                href={`/products?category=${cat._id}`}
                className={`group relative overflow-hidden rounded-2xl aspect-square animate-fade-in opacity-0 stagger-${i + 1}`}
              >
                <Image
                  src={cat.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 16vw"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white text-sm font-semibold">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Featured Products ──────────────────────── */}
      <section className="bg-slate-50/80 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-400/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Featured Products</h2>
                <p className="text-slate-500 text-sm">Handpicked just for you</p>
              </div>
            </div>
            <Link href="/products?featured=true" className="hidden sm:flex text-indigo-600 text-sm font-semibold hover:text-indigo-700 items-center gap-1 transition-colors">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden">
                  <div className="aspect-square skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-16 skeleton" />
                    <div className="h-4 w-full skeleton" />
                    <div className="h-3 w-20 skeleton" />
                    <div className="h-5 w-24 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {featured.map((product, i) => (
                <ProductCard key={product._id} product={product} index={i} />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
            >
              Explore All Products <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Promo Banner ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-10 md:p-14">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 max-w-lg">
            <p className="text-indigo-300 font-semibold text-sm uppercase tracking-wider mb-3">Limited Time Offer</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Get 20% Off Your First Order
            </h2>
            <p className="text-slate-400 mb-6">
              Sign up today and get exclusive access to deals, new arrivals, and more. Use code: <span className="text-indigo-300 font-mono font-bold">WELCOME20</span>
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold hover:bg-indigo-50 transition-all shadow-xl"
            >
              Create Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
