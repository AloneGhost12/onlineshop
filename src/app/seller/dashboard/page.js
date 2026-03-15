'use client';

import { useEffect, useState } from 'react';
import { sellerAPI } from '@/lib/api';
import SellerShell from '@/components/seller/SellerShell';
import { DollarSign, Package, ReceiptText, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellerDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await sellerAPI.getDashboard();
        setData(response.data);
      } catch (error) {
        toast.error(error.message || 'Failed to load seller dashboard');
      }
    };

    loadDashboard();
  }, []);

  return (
    <SellerShell title="Seller Dashboard" subtitle="Track sales, stock, and commission performance for your storefront.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Revenue', value: `₹${data?.stats?.totalRevenue?.toLocaleString('en-IN') || 0}`, icon: DollarSign, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Orders', value: data?.stats?.totalOrders || 0, icon: ReceiptText, tone: 'bg-sky-50 text-sky-700' },
          { label: 'Products', value: data?.stats?.activeProducts || 0, icon: Package, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Low Stock', value: data?.stats?.lowStockProducts || 0, icon: TriangleAlert, tone: 'bg-amber-50 text-amber-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <div className="mt-4 space-y-3">
            {(data?.recentOrders || []).slice(0, 5).map((order) => (
              <div key={order._id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">₹{order.sellerRevenue?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Low Stock Products</h2>
          <div className="mt-4 space-y-3">
            {(data?.lowStockProducts || []).map((product) => (
              <div key={product._id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <div>
                  <p className="font-medium text-slate-900">{product.title}</p>
                  <p className="text-xs text-slate-500">Commission {product.commissionPercentage}%</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{product.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SellerShell>
  );
}