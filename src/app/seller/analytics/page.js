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
  const hasRevenueData = chartData.some((entry) => entry.revenue > 0);

  return (
    <SellerShell title="Seller Analytics" subtitle="Understand revenue trends, commissions, and your best-performing products.">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">30 Day Seller Revenue</h2>
            <p className="text-xs text-slate-500">Daily trend with earnings per day</p>
          </div>

          {loading ? (
            <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 sm:h-72">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : chartData.length === 0 || !hasRevenueData ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No revenue data available yet.
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                  Max/day: <span className="font-semibold">₹{Math.round(maxRevenue).toLocaleString('en-IN')}</span>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Days shown: <span className="font-semibold">{chartData.length}</span>
                </div>
                <div className="col-span-2 rounded-xl bg-sky-50 px-3 py-2 text-sky-700 sm:col-span-1">
                  Scroll horizontally for full detail
                </div>
              </div>

              <div className="mt-4 overflow-x-auto pb-2">
                <div className="h-72 min-w-[760px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="h-full overflow-hidden rounded-xl bg-[linear-gradient(to_top,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[length:100%_25%]">
                    <div className="flex h-full items-end gap-2 px-2">
                      {chartData.map((entry, index) => {
                        const barHeightPx = Math.max(14, Math.round((entry.revenue / maxRevenue) * 170));

                        return (
                          <div key={entry.key} className="flex w-10 flex-col items-center justify-end sm:w-11">
                            <span className="mb-1 text-[10px] font-semibold text-slate-600">₹{Math.round(entry.revenue)}</span>
                            <div
                              title={`${entry.dateLabel}: Rs ${Math.round(entry.revenue)}`}
                              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 shadow-[0_6px_18px_rgba(16,185,129,0.25)]"
                              style={{ height: `${barHeightPx}px` }}
                            />
                            <span className="mt-1 text-[10px] text-slate-500">
                              {index % 2 === 0 || index === chartData.length - 1 ? entry.dateLabel : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
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