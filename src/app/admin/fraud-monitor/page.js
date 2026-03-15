'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/lib/api';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FraudMonitorPage() {
  const { user, isAdmin, hasAdminAccess, hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const canManageUsers = hasPermission('MANAGE_USERS');

  const loadMonitor = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getFraudMonitor({ status: 'open', limit: 50 });
      setData(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load fraud monitor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageUsers) {
      loadMonitor();
    } else {
      setLoading(false);
    }
  }, [canManageUsers, loadMonitor]);

  const handleMarkSafe = async (log) => {
    const note = prompt('Optional review note:', 'Reviewed and confirmed safe') || '';
    const key = `safe-${log._id}`;
    setActionLoading(key);
    try {
      await adminAPI.markFraudLogSafe(log._id, { note });
      toast.success('Fraud event marked as safe');
      await loadMonitor();
    } catch (error) {
      toast.error(error.message || 'Failed to mark event as safe');
    } finally {
      setActionLoading('');
    }
  };

  const handleAccessAction = async (targetUser, action) => {
    const key = `${action}-${targetUser._id}`;
    const payload = { action };

    if (action === 'ban') {
      const reason = prompt('Ban reason:', 'Fraud risk threshold exceeded');
      if (reason === null) {
        return;
      }
      payload.reason = reason;
    }

    setActionLoading(key);
    try {
      await adminAPI.updateUserAccess(targetUser._id, payload);
      toast.success(`User ${action} action applied`);
      await loadMonitor();
    } catch (error) {
      toast.error(error.message || 'Failed to update user access');
    } finally {
      setActionLoading('');
    }
  };

  if (!user || !isAdmin || !hasAdminAccess || !canManageUsers) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Access denied</h2>
        <p className="mt-2 text-sm text-slate-500">You need user-management permission to view fraud monitoring.</p>
        <Link href="/admin" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to admin panel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to admin panel
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldAlert className="h-6 w-6 text-rose-600" /> Fraud Monitor
          </h1>
          <p className="mt-1 text-sm text-slate-500">Track suspicious logins, coupon abuse, failed payments, risky checkout patterns, and review account risk scores.</p>
        </div>
        <button
          onClick={loadMonitor}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Risk Threshold', value: data.threshold, tone: 'bg-rose-50 text-rose-700', icon: ShieldAlert },
              { label: 'Flagged Users', value: data.summary.flaggedUsers, tone: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
              { label: 'Verification Required', value: data.summary.verificationRequired, tone: 'bg-indigo-50 text-indigo-700', icon: ShieldCheck },
              { label: 'Open Fraud Events', value: data.summary.openEvents, tone: 'bg-sky-50 text-sky-700', icon: UserX },
              { label: 'Total Risk Score', value: data.summary.totalRiskScore, tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
            ].map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="mt-1 text-sm text-slate-500">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Flagged Users</h2>
              <p className="mt-1 text-sm text-slate-500">Accounts with active fraud risk or verification requirements.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">User</th>
                    <th className="px-6 py-3 text-left font-semibold">Risk</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Last Event</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.flaggedUsers || []).map((flaggedUser) => (
                    <tr key={flaggedUser._id} className="border-t border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{flaggedUser.name}</div>
                        <div className="text-xs text-slate-500">{flaggedUser.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-rose-600">{flaggedUser.fraudRiskScore}</div>
                        <div className="text-xs text-slate-500">{flaggedUser.orderCount} orders</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {flaggedUser.requiresVerification && (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">verification required</span>
                          )}
                          {flaggedUser.isFraudFlagged && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">flagged</span>
                          )}
                          {flaggedUser.isBlocked && (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">blocked</span>
                          )}
                          {flaggedUser.isBanned && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">banned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {flaggedUser.fraudLastEventAt ? new Date(flaggedUser.fraudLastEventAt).toLocaleString() : 'No events'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAccessAction(flaggedUser, flaggedUser.isBlocked ? 'unblock' : 'block')}
                            disabled={actionLoading === `block-${flaggedUser._id}` || actionLoading === `unblock-${flaggedUser._id}`}
                            className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-50"
                          >
                            {flaggedUser.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            onClick={() => handleAccessAction(flaggedUser, 'ban')}
                            disabled={actionLoading === `ban-${flaggedUser._id}`}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.flaggedUsers?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                        No flagged users right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.4fr,1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Suspicious Transactions</h2>
                <p className="mt-1 text-sm text-slate-500">Recent high-risk events generated by login, coupon, payment, and checkout checks.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {(data.logs || []).map((log) => (
                  <div key={log._id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{log.action}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Risk {log.riskScore}</span>
                          {log.requiresVerification && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">verification required</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {log.userId?.name || log.email || 'Unknown user'}
                        </div>
                        <div className="text-sm text-slate-500">{log.reason || 'No reason supplied'}</div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>IP: {log.ipAddress || 'unknown'}</span>
                          <span>Device: {log.device || 'unknown'}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {log.status === 'safe' ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Marked safe</span>
                        ) : (
                          <button
                            onClick={() => handleMarkSafe(log)}
                            disabled={actionLoading === `safe-${log._id}`}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                          >
                            Mark Safe
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.logs?.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-slate-500">No suspicious events in the current filter.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">IP Activity Logs</h2>
                <p className="mt-1 text-sm text-slate-500">Seven-day view of IP addresses with the most recorded fraud activity.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {(data.ipActivity || []).map((entry) => (
                  <div key={entry.ipAddress} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900">{entry.ipAddress}</div>
                        <div className="mt-1 text-xs text-slate-500">Last seen {new Date(entry.lastSeen).toLocaleString()}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(entry.actions || []).map((action) => (
                            <span key={action} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{action}</span>
                          ))}
                        </div>
                        {(entry.users || []).filter(Boolean).length > 0 && (
                          <div className="mt-3 text-xs text-slate-500">
                            Users: {entry.users.filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-rose-600">{entry.totalRiskScore}</div>
                        <div className="text-xs text-slate-500">risk score</div>
                        <div className="mt-2 text-sm font-semibold text-slate-800">{entry.totalEvents} events</div>
                      </div>
                    </div>
                  </div>
                ))}
                {data.ipActivity?.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-slate-500">No IP activity recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}