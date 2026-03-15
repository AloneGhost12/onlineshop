'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import { Package, Clock, Loader2, Truck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState('');

  const canCancelOrder = (status) => ['pending', 'confirmed', 'processing'].includes(String(status || '').toLowerCase());

  const getCancelMessage = (order) => {
    const status = String(order?.status || '').toLowerCase();
    if (canCancelOrder(status)) return '';
    if (status === 'cancelled') {
      return `Already cancelled${order?.cancelledAt ? ` on ${new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.`;
    }
    if (status === 'shipped' || status === 'delivered') {
      return 'Cannot cancel after shipment. Request return/refund if needed.';
    }
    if (status === 'refunded') {
      return 'Order already refunded.';
    }
    return 'Cancellation is not available for this order status.';
  };

  const getArrivalLabel = (order) => {
    if (order.status === 'delivered' && order.deliveredAt) {
      return `Delivered on ${new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    const etaDate = order.expectedDeliveryAt || (order.createdAt ? new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000) : null);
    if (!etaDate) return 'Arrival estimate unavailable';

    return `Arriving by ${new Date(etaDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = confirm('Cancel this order?');
    if (!confirmCancel) return;

    setCancellingOrderId(orderId);
    try {
      const response = await orderAPI.cancel(orderId, 'Cancelled by customer');
      setOrders((current) => current.map((order) => (order._id === orderId ? response.data : order)));
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId('');
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await orderAPI.getMyOrders({ limit: 20 });
        setOrders(data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Please sign in</h2>
        <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">My Orders</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No orders yet</h2>
          <Link href="/products" className="text-indigo-600 font-semibold hover:underline">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:shadow-md hover:border-indigo-100 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-slate-800">{order.orderNumber}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] || 'bg-slate-100'}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Order ID: {order._id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₹{order.totalPrice?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-500 capitalize">Payment: {order.paymentStatus}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="mx-1">•</span>
                <span>
                  {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                </span>
                <span className="mx-1">•</span>
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <Truck className="w-3.5 h-3.5" />
                  {getArrivalLabel(order)}
                </span>
              </div>

              {Number(order.promotionDiscount || 0) > 0 && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">Saved ₹{Number(order.promotionDiscount || 0).toLocaleString('en-IN')} via promotion</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={`/orders/${order._id}`} className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  View Details
                </Link>
                {canCancelOrder(order.status) && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order._id)}
                    disabled={cancellingOrderId === order._id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>

              {!canCancelOrder(order.status) && (
                <p className="mt-3 text-xs text-slate-500">{getCancelMessage(order)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
