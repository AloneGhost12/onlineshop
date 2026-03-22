'use client';

import { useEffect, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import { sellerAPI } from '@/lib/api';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);

  const handleDownloadDeliveryDetails = (order) => {
    if (typeof window === 'undefined') return;

    const lines = [
      `Order Number: ${order.orderNumber || '-'}`,
      `Order ID: ${order._id || '-'}`,
      `Created At: ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '-'}`,
      `Status: ${order.status || 'pending'}`,
      '',
      'Customer Details',
      `Name: ${order.user?.name || order.shippingAddress?.name || 'Not provided'}`,
      `Email: ${order.user?.email || 'Email not available'}`,
      `Phone: ${order.shippingAddress?.phone || order.user?.phone || 'Phone not available'}`,
      '',
      'Delivery Address',
      `Street: ${order.shippingAddress?.street || '-'}`,
      `City: ${order.shippingAddress?.city || '-'}`,
      `State: ${order.shippingAddress?.state || '-'}`,
      `Zip Code: ${order.shippingAddress?.zipCode || '-'}`,
      `Country: ${order.shippingAddress?.country || '-'}`,
      '',
      'Seller Items',
      ...(order.items || []).map((item, index) => (
        `${index + 1}. ${item.title || 'Item'} | Qty: ${item.quantity || 0} | Seller Revenue: Rs ${Number(item.sellerRevenue || 0).toLocaleString('en-IN')}`
      )),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderNumber || 'order'}-delivery-details.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Delivery details downloaded');
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await sellerAPI.getOrders();
        setOrders(response.data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to load seller orders');
      }
    };

    loadOrders();
  }, []);

  return (
    <SellerShell title="Seller Orders" subtitle="Review only the order items that belong to your store.">
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-sm text-slate-700">
                <div>Seller Revenue: <span className="font-semibold text-emerald-600">₹{order.sellerRevenue?.toLocaleString('en-IN') || 0}</span></div>
                <div>Platform Fee: <span className="font-semibold">₹{order.platformRevenue?.toLocaleString('en-IN') || 0}</span></div>
                <div className="mt-1">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {order.status || 'pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => handleDownloadDeliveryDetails(order)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <Download className="h-4 w-4" /> Download delivery details
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer details</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{order.user?.name || order.shippingAddress?.name || 'Not provided'}</p>
                <p className="mt-1 text-sm text-slate-600 break-all">{order.user?.email || 'Email not available'}</p>
                <p className="mt-1 text-sm text-slate-600">{order.shippingAddress?.phone || order.user?.phone || 'Phone not available'}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery address</p>
                {order.shippingAddress ? (
                  <div className="mt-2 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.street}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Address not available for this order.</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(order.items || []).map((item) => (
                <div key={`${order._id}-${item.product}`} className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity} • Commission {item.commissionPercentage}%</p>
                  </div>
                  <div className="text-left text-sm sm:text-right">
                    <div className="font-semibold text-slate-900">₹{item.sellerRevenue?.toLocaleString('en-IN') || 0}</div>
                    <div className="text-xs text-slate-500">Platform ₹{item.platformRevenue?.toLocaleString('en-IN') || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SellerShell>
  );
}