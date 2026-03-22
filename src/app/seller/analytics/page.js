'use client';

import { useEffect, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import { sellerAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SellerAnalyticsPage() {
  const [analytics, setAnalytics] = useState({ dailyRevenue: [], topProducts: [] });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await sellerAPI.getAnalytics();
        setAnalytics(response.data || { dailyRevenue: [], topProducts: [] });
      } catch (error) {
        toast.error(error.message || 'Failed to load seller analytics');
      }
    };

    loadAnalytics();
  }, []);

  const maxRevenue = Math.max(...analytics.dailyRevenue.map((entry) => entry.revenue || 0), 1);

  return (
    <SellerShell title="Seller Analytics" subtitle="Understand revenue trends, commissions, and your best-performing products.">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">30 Day Seller Revenue</h2>
            <p className="text-xs text-slate-500">Scroll horizontally on mobile</p>
          </div>

          {analytics.dailyRevenue.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No revenue data available yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex h-64 min-w-[560px] items-end gap-1.5 sm:h-72 sm:min-w-[720px] sm:gap-2">
                {analytics.dailyRevenue.map((entry, index) => (
                  <div key={entry._id} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-600 to-teal-400" style={{ height: `${Math.max(10, Math.round((entry.revenue / maxRevenue) * 100))}%` }} />
                    <div className="text-center text-[11px] text-slate-500">
                      <div>{index % 4 === 0 || index === analytics.dailyRevenue.length - 1 ? entry._id.slice(5) : ''}</div>
                      <div className="font-semibold text-slate-700">₹{Math.round(entry.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Top Products</h2>

          {analytics.topProducts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No top products data yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.topProducts.map((product) => (
                <div key={product._id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{product.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{product.totalUnits} units sold</div>
                    </div>
                    <div className="whitespace-nowrap text-sm font-semibold text-emerald-600">₹{product.revenue?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SellerShell>
  );
}