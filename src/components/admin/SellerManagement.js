'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { BadgeCheck, Clock3, Loader2, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellerManagement() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const loadSellers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSellers({ limit: 100 });
      setSellers(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const applyAction = async (seller, action) => {
    const key = `${seller._id}-${action}`;
    setActionLoading(key);
    try {
      const payload = { action };
      if (action === 'suspend') {
        const reason = prompt('Suspension reason (optional):', seller.suspensionReason || '');
        if (reason !== null) payload.reason = reason;
      }

      await adminAPI.updateSellerStatus(seller._id, payload);
      toast.success(`Seller ${action} action applied`);
      await loadSellers();
    } catch (error) {
      toast.error(error.message || 'Failed to update seller');
    } finally {
      setActionLoading('');
    }
  };

  const badgeClass = (seller) => {
    if (seller.isSuspended) return 'bg-red-100 text-red-700';
    if (seller.isVerified) return 'bg-emerald-100 text-emerald-700';
    return 'bg-amber-100 text-amber-700';
  };

  const badgeText = (seller) => {
    if (seller.isSuspended) return 'suspended';
    if (seller.isVerified) return 'verified';
    return 'pending';
  };

  const actionText = (action) => {
    const labels = {
      verify: 'Verified seller',
      unverify: 'Removed verification',
      suspend: 'Suspended seller',
      unsuspend: 'Removed suspension',
      revert: 'Reverted to pending verification',
    };

    return labels[action] || action;
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Seller</th>
                <th className="px-4 py-3 text-left font-semibold">Store</th>
                <th className="px-4 py-3 text-left font-semibold">Products</th>
                <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Moderation</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller._id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{seller.sellerName}</div>
                    <div className="text-xs text-slate-500">{seller.email}</div>
                    <div className="text-xs text-slate-400">{seller.phone}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{seller.storeName}</div>
                    <div className="text-xs text-slate-500">Joined {new Date(seller.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400 capitalize">Source: {String(seller.applicationSource || 'direct').replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div>{seller.activeProductCount} active</div>
                    <div className="text-xs text-slate-500">{seller.productCount} total</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-emerald-600">₹{seller.totalRevenue?.toLocaleString('en-IN') || 0}</div>
                    <div className="text-xs text-slate-500">{seller.totalOrders} orders</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeClass(seller)}`}>
                      {badgeText(seller)}
                    </span>
                    {seller.isSuspended && seller.suspensionReason && (
                      <div className="mt-2 max-w-[220px] text-xs text-slate-500">{seller.suspensionReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {seller.moderationHistory?.length ? (
                      <div className="space-y-2">
                        {seller.moderationHistory.slice(0, 3).map((entry) => (
                          <div key={entry._id || `${seller._id}-${entry.createdAt}-${entry.action}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                            <div className="flex items-center gap-2 text-slate-800">
                              <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-semibold">{actionText(entry.action)}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {new Date(entry.createdAt).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              By {entry.performedBy?.name || entry.performedBy?.email || 'Admin'}
                            </div>
                            {entry.reason && (
                              <div className="mt-1 text-xs text-slate-500">Reason: {entry.reason}</div>
                            )}
                          </div>
                        ))}
                        {seller.moderationHistory.length > 3 && (
                          <div className="text-xs text-slate-400">
                            Showing latest 3 of {seller.moderationHistory.length} events
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No moderation history yet</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => applyAction(seller, seller.isVerified ? 'unverify' : 'verify')}
                        disabled={actionLoading === `${seller._id}-verify` || actionLoading === `${seller._id}-unverify`}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        title={seller.isVerified ? 'Remove verification' : 'Verify seller'}
                      >
                        {seller.isVerified ? <ShieldCheck className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => applyAction(seller, seller.isSuspended ? 'unsuspend' : 'suspend')}
                        disabled={actionLoading === `${seller._id}-suspend` || actionLoading === `${seller._id}-unsuspend`}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                        title={seller.isSuspended ? 'Unsuspend seller' : 'Suspend seller'}
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => applyAction(seller, 'revert')}
                        disabled={actionLoading === `${seller._id}-revert`}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
                        title="Revert seller account to pending verification"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {sellers.map((seller) => (
              <div key={seller._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{seller.sellerName}</p>
                    <p className="text-xs text-slate-500 break-all">{seller.email}</p>
                    <p className="text-xs text-slate-400">{seller.phone}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeClass(seller)}`}>
                    {badgeText(seller)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Store: <span className="font-medium text-slate-700">{seller.storeName}</span></p>
                  <p>Joined: {new Date(seller.createdAt).toLocaleDateString()}</p>
                  <p>Source: {String(seller.applicationSource || 'direct').replace('_', ' ')}</p>
                  <p>Products: {seller.activeProductCount} active / {seller.productCount} total</p>
                  <p>Revenue: ₹{seller.totalRevenue?.toLocaleString('en-IN') || 0}</p>
                  <p>Orders: {seller.totalOrders}</p>
                  {seller.isSuspended && seller.suspensionReason && (
                    <p>Reason: {seller.suspensionReason}</p>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {seller.moderationHistory?.slice(0, 2).map((entry) => (
                    <div key={entry._id || `${seller._id}-${entry.createdAt}-${entry.action}`} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">{actionText(entry.action)}</p>
                      <p>{new Date(entry.createdAt).toLocaleString()}</p>
                      <p>By {entry.performedBy?.name || entry.performedBy?.email || 'Admin'}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => applyAction(seller, seller.isVerified ? 'unverify' : 'verify')}
                    disabled={actionLoading === `${seller._id}-verify` || actionLoading === `${seller._id}-unverify`}
                    className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                  >
                    {seller.isVerified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    onClick={() => applyAction(seller, seller.isSuspended ? 'unsuspend' : 'suspend')}
                    disabled={actionLoading === `${seller._id}-suspend` || actionLoading === `${seller._id}-unsuspend`}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    {seller.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    onClick={() => applyAction(seller, 'revert')}
                    disabled={actionLoading === `${seller._id}-revert`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
                  >
                    Revert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}