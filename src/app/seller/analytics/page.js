'use client';

import { useEffect, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import { sellerAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellerAnalyticsPage() {
  const [analytics, setAnalytics] = useState({ dailyRevenue: [], topProducts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const response = await sellerAPI.getAnalytics();
        setAnalytics(response.data || { dailyRevenue: [], topProducts: [] });
      } catch (error) {
        toast.error(error.message || 'Failed to load seller analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const chartData = (analytics.dailyRevenue || []).slice(-30).map((entry, index) => {
    const revenue = Number(entry?.revenue ?? entry?.totalRevenue ?? 0) || 0;
    const sourceLabel = String(entry?._id || entry?.date || entry?.day || `Day ${index + 1}`);
    const dateLabel = sourceLabel.length >= 10 && sourceLabel.includes('-')
      ? sourceLabel.slice(5)
      : sourceLabel;

    return {
      key: String(entry?._id || entry?.date || `day-${index}`),
      revenue,
      dateLabel,
    };
  });

  const maxRevenue = Math.max(...chartData.map((entry) => entry.revenue), 1);

  return (
    <SellerShell title="Seller Analytics" subtitle="Understand revenue trends, commissions, and your best-performing products.">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">30 Day Seller Revenue</h2>
            <p className="text-xs text-slate-500">Scroll horizontally on mobile</p>
          </div>

          {loading ? (
            <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 sm:h-72">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No revenue data available yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="relative min-w-[560px] sm:min-w-[720px]">
                <div className="absolute inset-0 pointer-events-none">
                  {[0, 1, 2, 3].map((line) => (
                    <div
                      key={line}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ bottom: `${line * 33.33}%` }}
                    />
                  ))}
                </div>

                <div className="flex h-64 items-end gap-1.5 pt-4 sm:h-72 sm:gap-2">
                  {chartData.map((entry, index) => (
                    <div key={entry.key} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        title={`${entry.dateLabel}: Rs ${Math.round(entry.revenue)}`}
                        className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-600 to-teal-400"
                        style={{ height: `${Math.max(10, Math.round((entry.revenue / maxRevenue) * 100))}%` }}
                      />
                    <div className="text-center text-[11px] text-slate-500">
                      <div>{index % 4 === 0 || index === chartData.length - 1 ? entry.dateLabel : ''}</div>
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

          {loading ? (
            <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          ) : analytics.topProducts.length === 0 ? (
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
                      <div className="mt-1 text-sm text-slate-500">{Number(product.totalUnits || product.units || 0)} units sold</div>
                    </div>
                    <div className="whitespace-nowrap text-sm font-semibold text-emerald-600">₹{(Number(product.revenue || product.totalRevenue || 0)).toLocaleString('en-IN')}</div>
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