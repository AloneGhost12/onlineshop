'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { orderAPI } from '@/lib/api';
import { Package, MapPin, CreditCard, CheckCircle, Loader2, ArrowLeft, Ban, Truck, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressLabel from '@/components/orders/AddressLabel';
import { generateAddressLabelPDF } from '@/lib/pdfGenerator';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const addressLabelRef = useRef(null);

  const canCancelOrder = (status) => ['pending', 'confirmed', 'processing'].includes(String(status || '').toLowerCase());

  const getCancelMessage = (currentOrder) => {
    const status = String(currentOrder?.status || '').toLowerCase();
    if (canCancelOrder(status)) return '';
    if (status === 'cancelled') {
      return `This order is already cancelled${currentOrder?.cancelledAt ? ` on ${new Date(currentOrder.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.`;
    }
    if (status === 'shipped' || status === 'delivered') {
      return 'Cancellation is not available after shipment. Please use return/refund support.';
    }
    if (status === 'refunded') {
      return 'Order is already refunded.';
    }
    return 'Cancellation is not available for this order status.';
  };

  const arrivalDate = order?.expectedDeliveryAt
    ? new Date(order.expectedDeliveryAt)
    : order?.createdAt
      ? new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000)
      : null;

  const timelineEntries = [
    { label: 'Order placed', date: order?.createdAt },
    { label: 'Expected arrival', date: arrivalDate, optional: true },
    { label: 'Delivered', date: order?.deliveredAt, optional: true },
    { label: 'Cancelled', date: order?.cancelledAt, optional: true },
  ].filter((entry) => entry.date || !entry.optional);

  const handleCancel = async () => {
    const confirmCancel = confirm('Cancel this order?');
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const response = await orderAPI.cancel(order._id, 'Cancelled by customer');
      setOrder(response.data);
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!addressLabelRef.current) {
      toast.error('Address label element not found');
      return;
    }

    setDownloadingPDF(true);
    try {
      await generateAddressLabelPDF(addressLabelRef.current, order.orderNumber);
      toast.success('Address label downloaded successfully');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(error.message || 'Failed to download address label');
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await orderAPI.getById(params.id);
        setOrder(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (params.id) loadOrder();
  }, [params.id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!order) return <div className="text-center py-20"><h2 className="text-xl font-bold">Order not found</h2></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/orders" className="flex items-center gap-2 text-sm text-indigo-600 font-semibold mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-slate-400 mt-1">Order ID: {order._id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold px-4 py-2 rounded-xl capitalize ${
            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
            'bg-indigo-100 text-indigo-700'
          }`}>
            {order.status}
          </span>
          <button
            type="button"
            onClick={handleDownloadLabel}
            disabled={downloadingPDF}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            title="Download delivery address as PDF for printing"
          >
            <Download className="w-4 h-4" />
            {downloadingPDF ? 'Downloading...' : 'Download Label'}
          </button>
          {canCancelOrder(order.status) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {!canCancelOrder(order.status) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {getCancelMessage(order)}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-indigo-500" /><h3 className="font-semibold text-sm">Shipping Address</h3></div>
          <p className="text-sm text-slate-600">{order.shippingAddress?.name}</p>
          <p className="text-sm text-slate-500">{order.shippingAddress?.street}</p>
          <p className="text-sm text-slate-500">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
          <p className="text-sm text-slate-500">{order.shippingAddress?.phone}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-3"><CreditCard className="w-4 h-4 text-indigo-500" /><h3 className="font-semibold text-sm">Payment</h3></div>
          <p className="text-sm text-slate-600 capitalize">{order.paymentMethod}</p>
          <p className={`text-sm font-medium capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{order.paymentStatus}</p>
          {order.paymentId && <p className="text-xs text-slate-500 mt-1">Transaction: {order.paymentId}</p>}
          {order.cancelledAt && order.cancellationReason && <p className="text-xs text-red-600 mt-2">Reason: {order.cancellationReason}</p>}
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-indigo-500" /><h3 className="font-semibold text-sm">Summary</h3></div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{order.subtotal?.toLocaleString('en-IN')}</span></div>
            {Number(order.couponDiscount || 0) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Coupon Discount</span><span className="text-green-600">-₹{Number(order.couponDiscount || 0).toLocaleString('en-IN')}</span></div>
            )}
            {Number(order.promotionDiscount || 0) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Promotion Discount</span><span className="text-emerald-600">-₹{Number(order.promotionDiscount || 0).toLocaleString('en-IN')}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>₹{order.tax?.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{order.shippingCost === 0 ? 'Free' : `₹${order.shippingCost}`}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>₹{order.totalPrice?.toLocaleString('en-IN')}</span></div>
          </div>
          {Array.isArray(order.promotions) && order.promotions.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
              <p className="font-semibold text-emerald-800 mb-1">Applied Promotions</p>
              <div className="space-y-1">
                {order.promotions.map((promotion, index) => (
                  <div key={`${promotion.promotionId || promotion.promotionName}-${index}`} className="flex items-center justify-between text-emerald-700">
                    <span>{promotion.promotionName}</span>
                    <span>-₹{Number(promotion.discountAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-200/60">
        <h2 className="font-bold text-slate-900 mb-4">Tracking Timeline</h2>
        <div className="space-y-3">
          {timelineEntries.map((entry) => (
            <div key={entry.label} className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-indigo-100 p-1">
                {entry.label.toLowerCase().includes('arrival') ? <Truck className="w-3.5 h-3.5 text-indigo-600" /> : <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{entry.label}</p>
                <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <h2 className="font-bold text-slate-900 mb-4">Items ({order.items?.length})</h2>
      <div className="space-y-3">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/60">
            {item.image && (
              <Image
                src={item.image}
                alt={item.title}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
              <p className="text-sm text-slate-500">Qty: {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}</p>
            </div>
            <p className="font-bold text-slate-900">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Hidden Address Label for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <AddressLabel ref={addressLabelRef} order={order} />
      </div>
    </div>
  );
}
