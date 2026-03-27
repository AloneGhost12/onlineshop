'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { checkoutAPI, orderAPI } from '@/lib/api';
import { MapPin, CreditCard, CheckCircle, Shield, Copy, QrCode, ExternalLink, Gift, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MERCHANT_UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'anp8696@oksbi';
const MERCHANT_STATIC_QR_PATH = process.env.NEXT_PUBLIC_UPI_QR_URL || '';
const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';

const normalizeImageUrl = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const value = imageUrl.trim();
  if (value.includes('photo-1507473885765-e6ed057ab6fe')) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  return value;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promotionPreview, setPromotionPreview] = useState({
    promotionDiscount: 0,
    appliedPromotions: [],
    strategy: 'none',
  });

  const [address, setAddress] = useState({
    name: user?.name || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: 'India',
    phone: user?.phone || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [upiReferenceId, setUpiReferenceId] = useState('');
  const [staticQrFailed, setStaticQrFailed] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  const subtotal = Number(cart.totalPrice || 0);
  const couponDiscount = Number(cart.discountAmount || 0);
  const promotionDiscount = Number(promotionPreview.promotionDiscount || 0);
  const totalDiscount = Math.min(subtotal, couponDiscount + promotionDiscount);
  const discountedSubtotal = Number(Math.max(0, subtotal - totalDiscount));
  const tax = Math.round(discountedSubtotal * 0.18);
  const shipping = discountedSubtotal >= 500 ? 0 : 49;
  const total = discountedSubtotal + tax + shipping;
  const loyaltyPointsPreview = Math.max(0, Math.floor(Number(total || 0) / 100) * 5);
  const upiAmount = Number(total || 0).toFixed(2);
  // Keep the UPI intent minimal for maximum scanner compatibility.
  const upiUri = `upi://pay?pa=${MERCHANT_UPI_ID}&am=${upiAmount}&cu=INR`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`;
  const hasStaticQr = Boolean(String(MERCHANT_STATIC_QR_PATH || '').trim());
  const qrImageSrc = hasStaticQr && !staticQrFailed ? MERCHANT_STATIC_QR_PATH : upiQrUrl;

  useEffect(() => {
    const loadPromotionPreview = async () => {
      if (!user || !cart?.items?.length) {
        setPromotionPreview({
          promotionDiscount: 0,
          appliedPromotions: [],
          strategy: 'none',
        });
        return;
      }

      try {
        const response = await checkoutAPI.applyPromotions();
        setPromotionPreview({
          promotionDiscount: Number(response?.data?.promotionDiscount || 0),
          appliedPromotions: response?.data?.appliedPromotions || [],
          strategy: response?.data?.strategy || 'none',
        });
      } catch {
        setPromotionPreview({
          promotionDiscount: 0,
          appliedPromotions: [],
          strategy: 'none',
        });
      }
    };

    loadPromotionPreview();
  }, [user, cart.items, cart.itemCount, cart.totalPrice]);

  useEffect(() => {
    if (user?.referral?.referredBy) {
      setReferralCode('');
      return;
    }

    setReferralCode((current) => current || '');
  }, [user]);

  const handlePlaceOrder = async () => {
    // Validate address
    if (!address.name || !address.street || !address.city || !address.state || !address.zipCode || !address.phone) {
      toast.error('Please fill in all address fields');
      return;
    }

    if (paymentMethod === 'upi' && !upiReferenceId.trim()) {
      toast.error('Enter UPI transaction/reference ID after payment');
      return;
    }

    setLoading(true);
    try {
      const data = await orderAPI.create({
        shippingAddress: address,
        paymentMethod,
        paymentStatus: paymentMethod === 'upi' ? 'paid' : undefined,
        paymentId: paymentMethod === 'upi' ? upiReferenceId.trim() : undefined,
        paymentResult: paymentMethod === 'upi'
          ? {
              status: 'paid',
              method: 'upi',
              message: 'Payment marked as paid with customer provided UPI reference',
            }
          : undefined,
        referralCode: !user?.referral?.referredBy ? referralCode.trim().toUpperCase() : undefined,
      });
      await Promise.allSettled([
        Promise.resolve(clearCart()),
        refreshUser ? refreshUser() : Promise.resolve(null),
      ]);
      toast.success('Order placed successfully! 🎉');
      router.push(`/orders/${data.data._id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Please sign in</h2>
        <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(MERCHANT_UPI_ID);
      toast.success('UPI ID copied');
    } catch {
      toast.error('Unable to copy UPI ID');
    }
  };

  const copyUpiUri = async () => {
    try {
      await navigator.clipboard.writeText(upiUri);
      toast.success('UPI payment link copied');
    } catch {
      toast.error('Unable to copy UPI payment link');
    }
  };

  const openUpiApp = () => {
    if (typeof window !== 'undefined') {
      window.location.href = upiUri;
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Cart is empty</h2>
        <Link href="/products" className="text-indigo-600 font-semibold hover:underline">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Checkout</h1>

      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">One-page optimized checkout enabled</p>
        <p className="mt-1 text-indigo-700">Fill shipping, payment, and review all in one screen for faster completion.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" /> Shipping Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name', full: true },
                { key: 'phone', label: 'Phone', full: false },
                { key: 'street', label: 'Street Address', full: true },
                { key: 'city', label: 'City', full: false },
                { key: 'state', label: 'State', full: false },
                { key: 'zipCode', label: 'ZIP Code', full: false },
                { key: 'country', label: 'Country', full: false },
              ].map((f) => (
                <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">{f.label}</label>
                  <input
                    type="text"
                    required
                    value={address[f.key]}
                    onChange={(e) => setAddress({ ...address, [f.key]: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="text-sm font-semibold text-amber-900 mb-1.5 block flex items-center gap-2">
                <Gift className="w-4 h-4" /> Referral Code (Optional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                disabled={Boolean(user?.referral?.referredBy)}
                placeholder="SVABC123"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
              />
              <p className="mt-1 text-xs text-amber-700">
                {user?.referral?.referredBy
                  ? 'Referral already linked to your account.'
                  : 'Apply referral reward on your first successful order.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" /> Payment Method
            </h2>
            <div className="space-y-3">
              {[
                { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive' },
                { value: 'card', label: 'Credit / Debit Card', desc: 'Stripe integration (demo)' },
                { value: 'upi', label: 'UPI Payment', desc: 'Google Pay, PhonePe, etc.' },
              ].map((pm) => (
                <label
                  key={pm.value}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === pm.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={pm.value}
                    checked={paymentMethod === pm.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{pm.label}</p>
                    <p className="text-xs text-slate-500">{pm.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {paymentMethod === 'upi' && (
              <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-indigo-800">
                  <QrCode className="h-4 w-4" />
                  <p className="text-sm font-semibold">Scan to pay exact amount</p>
                </div>

                <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageSrc}
                    alt="UPI QR"
                    onError={() => setStaticQrFailed(true)}
                    className="h-40 w-40 rounded-xl border border-indigo-200 bg-white p-2"
                  />
                  <div className="space-y-3">
                    {hasStaticQr && !staticQrFailed ? (
                      <p className="text-xs text-emerald-700">Using your original merchant QR code</p>
                    ) : hasStaticQr ? (
                      <p className="text-xs text-amber-700">Original QR unavailable, using generated UPI QR fallback</p>
                    ) : (
                      <p className="text-xs text-indigo-700">Using generated UPI QR</p>
                    )}

                    <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm">
                      <p className="text-slate-500">Pay to UPI ID</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 break-all">{MERCHANT_UPI_ID}</p>
                        <button type="button" onClick={copyUpiId} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm">
                      <p className="text-slate-500">Amount to pay</p>
                      <p className="mt-1 text-lg font-bold text-indigo-700">₹{Number(total || 0).toLocaleString('en-IN')}</p>
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm">
                      <p className="text-slate-500">UPI payment link</p>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <p className="break-all text-xs font-medium text-slate-700">{upiUri}</p>
                        <button type="button" onClick={copyUpiUri} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">UPI Transaction / Reference ID</label>
                      <input
                        type="text"
                        value={upiReferenceId}
                        onChange={(event) => setUpiReferenceId(event.target.value)}
                        placeholder="Enter UTR / reference after payment"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                      <p className="mt-1 text-xs text-slate-500">Required to place UPI order.</p>
                    </div>

                    <button
                      type="button"
                      onClick={openUpiApp}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open UPI App Directly
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" /> Review Your Order
            </h2>

            <div className="mb-4 p-4 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Shipping to:</h3>
              <p className="text-sm text-slate-600">{address.name}</p>
              <p className="text-sm text-slate-500">{address.street}, {address.city}, {address.state} {address.zipCode}</p>
              <p className="text-sm text-slate-500">{address.phone}</p>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Payment:</h3>
              <p className="text-sm text-slate-600 capitalize">{paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}</p>
              {paymentMethod === 'upi' && (
                <>
                  <p className="mt-1 text-sm text-slate-500">UPI ID: {MERCHANT_UPI_ID}</p>
                  <p className="text-sm text-slate-500">Reference ID: {upiReferenceId || 'Not entered'}</p>
                </>
              )}
            </div>

            {promotionPreview.appliedPromotions.length > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="text-sm font-semibold text-emerald-800 mb-2">Auto-applied promotions</h3>
                <div className="space-y-2">
                  {promotionPreview.appliedPromotions.map((promotion) => (
                    <div key={promotion.promotionId || `${promotion.type}-${promotion.promotionName}`} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-700">{promotion.promotionName} ({promotion.type})</span>
                      <span className="font-semibold text-emerald-800">-₹{Number(promotion.discountAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-emerald-700">Strategy: {promotionPreview.strategy}</p>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div key={item._id} className="flex items-center gap-3 text-sm">
                  <Image
                    src={normalizeImageUrl(item.product?.images?.[0]?.url)}
                    alt={item.product?.title || 'Cart item'}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{item.product?.title}</p>
                    <p className="text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">₹{item.subtotal?.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Place Order — ₹{total.toLocaleString('en-IN')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 sticky top-24">
            <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
              {couponDiscount > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Coupon Discount {cart.coupon?.code ? `(${cart.coupon.code})` : ''}</span><span className="text-green-600">-₹{couponDiscount.toLocaleString('en-IN')}</span></div>
              )}
              {promotionDiscount > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Promotion Discount</span><span className="text-emerald-600">-₹{promotionDiscount.toLocaleString('en-IN')}</span></div>
              )}
              {promotionPreview.appliedPromotions.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                  {promotionPreview.appliedPromotions.map((promotion) => (
                    <div key={promotion.promotionId || `${promotion.type}-${promotion.promotionName}`} className="flex justify-between text-xs text-emerald-700">
                      <span>{promotion.promotionName}</span>
                      <span>-₹{Number(promotion.discountAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">GST (18%)</span><span>₹{tax.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center justify-between text-xs text-amber-800">
                  <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Loyalty points on this order</span>
                  <span className="font-semibold">+{loyaltyPointsPreview}</span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-bold"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
