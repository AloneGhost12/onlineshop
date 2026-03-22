'use client';

import { useEffect, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import { sellerAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);

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