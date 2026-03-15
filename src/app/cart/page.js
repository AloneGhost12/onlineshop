'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { cart, updateQuantity, removeItem, loading, applyCoupon } = useCart();
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = Number(cart.totalPrice || 0);
  const discountedSubtotal = Number(cart.finalPrice || subtotal);
  const discountAmount = Number(cart.discountAmount || 0);
  const tax = Math.round(discountedSubtotal * 0.18);
  const shipping = discountedSubtotal >= 500 ? 0 : 49;
  const grandTotal = Math.round(discountedSubtotal + tax + shipping);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponCode.trim().toUpperCase());
      setCouponCode('');
    } catch {
      // Toast is already shown by CartContext.applyCoupon
    } finally {
      setCouponLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to view your cart</h2>
        <p className="text-slate-500 mb-6">You need to be logged in to manage your cart</p>
        <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Sign In <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-6">Add some products to get started!</p>
        <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Shopping Cart ({cart.itemCount} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item._id}
              className="flex gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 hover:shadow-md transition-shadow animate-fade-in"
            >
              {/* Image */}
              <Link href={`/product/${item.product?._id}`} className="flex-shrink-0">
                <Image
                  src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                  alt={item.product?.title}
                  width={112}
                  height={112}
                  sizes="(max-width: 640px) 96px, 112px"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl"
                />
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.product?._id}`}>
                  <h3 className="font-semibold text-slate-800 line-clamp-2 hover:text-indigo-600 transition-colors text-sm sm:text-base">
                    {item.product?.title}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  ₹{item.product?.price?.toLocaleString('en-IN')}
                </p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal + Remove */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600">
                      ₹{item.subtotal?.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => removeItem(item._id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal ({cart.itemCount} items)</span>
                <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Coupon Discount {cart.coupon?.code ? `(${cart.coupon.code})` : ''}</span>
                  <span className="font-medium text-green-600">-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">GST (18%)</span>
                <span className="font-medium">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className={`font-medium ${discountedSubtotal >= 500 ? 'text-green-600' : ''}`}>
                  {discountedSubtotal >= 500 ? 'FREE' : '₹49'}
                </span>
              </div>

              <div className="pt-1">
                <label className="text-xs text-slate-500 block mb-1.5">Have a coupon?</label>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
                  >
                    {couponLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="text-xl font-bold text-slate-900">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {discountedSubtotal < 500 && (
              <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700 mb-4">
                Add ₹{(500 - discountedSubtotal).toLocaleString('en-IN')} more for free shipping!
              </div>
            )}

            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
              id="checkout-btn"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </Link>

            <Link href="/products" className="block text-center text-sm text-indigo-600 font-medium mt-3 hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
