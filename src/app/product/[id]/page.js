'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { productAPI } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { BadgeCheck, ShoppingCart, Star, Minus, Plus, ChevronRight, Truck, Shield, RefreshCw, Package, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

const normalizeImageUrl = (url) => {
  const value = String(url || '').trim();
  if (!value) return FALLBACK_IMAGE_URL;

  // Some old seed URLs are no longer available on Unsplash.
  if (value.includes('photo-1507473885765-e6ed057ab6fe')) {
    return FALLBACK_IMAGE_URL;
  }

  return value;
};

export default function ProductDetailPage() {
  const params = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
  });

  const loadProduct = useCallback(async () => {
    try {
      const data = await productAPI.getById(params.id);
      setProduct(data.data);
    } catch (error) {
      toast.error('Product not found');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadReviews = useCallback(async () => {
    try {
      setReviewLoading(true);
      const data = await productAPI.getReviews(params.id, { limit: 20 });
      setReviews(data.data || []);
    } catch (error) {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [params.id]);

  const loadReviewEligibility = useCallback(async () => {
    if (!user) {
      setReviewEligibility(null);
      return;
    }

    try {
      const data = await productAPI.getReviewEligibility(params.id);
      setReviewEligibility(data.data);
    } catch (error) {
      setReviewEligibility(null);
    }
  }, [params.id, user]);

  useEffect(() => {
    if (params.id) loadProduct();
  }, [params.id, loadProduct]);

  useEffect(() => {
    if (params.id) loadReviews();
  }, [params.id, loadReviews]);

  useEffect(() => {
    if (params.id) loadReviewEligibility();
  }, [params.id, loadReviewEligibility]);

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    const comment = String(reviewForm.comment || '').trim();
    if (!comment) {
      toast.error('Please write a short review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      await productAPI.createReview(params.id, {
        rating: Number(reviewForm.rating),
        title: reviewForm.title,
        comment,
      });

      toast.success('Review submitted successfully');
      setReviewForm({ rating: 5, title: '', comment: '' });
      await Promise.all([loadReviews(), loadReviewEligibility(), loadProduct()]);
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square skeleton rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 w-24 skeleton" />
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-32 skeleton" />
            <div className="h-10 w-40 skeleton" />
            <div className="h-20 w-full skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Product not found</h2>
        <Link href="/products" className="text-indigo-600 font-medium hover:underline">
          Browse all products
        </Link>
      </div>
    );
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const images = product.images?.length > 0
    ? product.images.map((image) => ({ ...image, url: normalizeImageUrl(image?.url) }))
    : [{ url: FALLBACK_IMAGE_URL, alt: 'Product' }];
  const sellerName = product.sellerId?.storeName || product.sellerStoreName;
  const sellerContactName = product.sellerId?.sellerName;
  const isVerifiedSeller = Boolean(product.sellerId?.isVerified);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
        <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/products" className="hover:text-indigo-600 transition-colors">Products</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{product.title}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
        {/* Images */}
        <div className="space-y-4 animate-fade-in">
          <div className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60">
            <Image
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt || product.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === i
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.title} preview ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="animate-slide-up">
          {/* Category & Brand */}
          <div className="flex items-center gap-2 mb-3">
            {product.category && (
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide bg-indigo-50 px-2.5 py-1 rounded-lg">
                {product.category.name || product.category}
              </span>
            )}
            {product.brand && (
              <span className="text-xs font-medium text-slate-500">{product.brand}</span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-snug">
            {product.title}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg">
              <Star className="w-4 h-4 text-green-600 fill-green-600" />
              <span className="text-sm font-bold text-green-700">{product.rating || 0}</span>
            </div>
            <span className="text-sm text-slate-500">{product.numReviews || 0} reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-4 mb-6 pb-6 border-b border-slate-100">
            <span className="text-3xl font-bold text-slate-900">
              ₹{product.price?.toLocaleString('en-IN')}
            </span>
            {product.comparePrice > product.price && (
              <>
                <span className="text-xl text-slate-400 line-through">
                  ₹{product.comparePrice?.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                  {discount}% OFF
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-slate-600 leading-relaxed mb-6">
            {product.description}
          </p>

          {sellerName && (
            <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">Sold by {sellerName}</p>
                    {isVerifiedSeller && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified Seller
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {sellerContactName ? `Managed by ${sellerContactName}` : 'Marketplace seller'}
                  </p>
                  {!isVerifiedSeller && (
                    <p className="mt-2 text-xs text-amber-600">
                      Verification pending. Platform quality checks are still in progress.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Specifications */}
          {product.specifications?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Specifications</h3>
              <div className="space-y-2">
                {product.specifications.map((spec, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="w-28 text-slate-500 flex-shrink-0">{spec.key}</span>
                    <span className="text-slate-800 font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-14 text-center font-semibold text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 transition-colors"
                disabled={quantity >= product.stock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => addToCart(product._id, quantity)}
              disabled={product.stock === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              id="add-to-cart-btn"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {/* Stock info */}
          <div className="flex items-center gap-2 text-sm mb-8">
            <Package className="w-4 h-4 text-slate-400" />
            {product.stock > 10 ? (
              <span className="text-green-600 font-medium">In Stock</span>
            ) : product.stock > 0 ? (
              <span className="text-amber-600 font-medium">Only {product.stock} left!</span>
            ) : (
              <span className="text-red-500 font-medium">Out of Stock</span>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'Over ₹500' },
              { icon: Shield, label: 'Genuine Product', sub: '100% Authentic' },
              { icon: RefreshCw, label: 'Easy Returns', sub: '30 Days' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <item.icon className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-5">Customer Reviews</h2>

        {reviewLoading ? (
          <p className="text-sm text-slate-500">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="space-y-4 mb-8">
            {reviews.map((review) => (
              <article key={review._id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-slate-900">{review.user?.name || 'Verified Buyer'}</p>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < review.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.title ? <p className="text-sm font-semibold text-slate-800 mb-1">{review.title}</p> : null}
                <p className="text-sm text-slate-600">{review.comment}</p>
              </article>
            ))}
          </div>
        )}

        {!user ? (
          <p className="text-sm text-slate-600">
            Please <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">log in</Link> to review this product after purchase.
          </p>
        ) : reviewEligibility?.canReview ? (
          <form onSubmit={handleSubmitReview} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Write a Review</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Average</option>
                <option value={2}>2 - Poor</option>
                <option value={1}>1 - Very Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={100}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Summarize your experience"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comment</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tell other buyers what you liked or disliked"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        ) : reviewEligibility?.hasReviewed ? (
          <p className="text-sm text-emerald-700">You already reviewed this product.</p>
        ) : (
          <p className="text-sm text-slate-600">You can review this product after it is delivered to you.</p>
        )}
      </section>
    </div>
  );
}
