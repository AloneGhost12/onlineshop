'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/rbac';
import { Ban, Clock3, Download, Loader2, ShieldOff, ShieldX, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [roleLoading, setRoleLoading] = useState('');
  const [roleDrafts, setRoleDrafts] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getUsers({ limit: 100 });
      const rows = data.data || [];
      setUsers(rows);
      setRoleDrafts(
        rows.reduce((acc, user) => {
          acc[user._id] = user.role;
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const assignableRoles = currentUser?.role === 'SUPER_ADMIN'
    ? ROLES
    : ROLES.filter((role) => role !== 'SUPER_ADMIN');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadSessionHistory = async (user, nextStatus = historyFilter, page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await adminAPI.getUserSessions(user._id, {
        status: nextStatus,
        page,
        limit: 10,
      });
      setHistoryUser(response.user || user);
      setHistoryRows(response.data || []);
      setHistorySummary(response.summary || null);
      setHistoryPagination(response.pagination || null);
      setHistoryFilter(nextStatus);
      setHistoryOpen(true);
    } catch (error) {
      toast.error(error.message || 'Failed to load session history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportSessionHistory = () => {
    if (!historyRows.length || !historyUser || typeof window === 'undefined') {
      toast.error('No session history available to export');
      return;
    }

    const header = [
      'Login Time',
      'Logout Time',
      'Status',
      'IP Address',
      'Device',
      'Browser',
      'OS',
      'Country',
      'City',
      'Duration Minutes',
    ];
    const rows = historyRows.map((session) => [
      session.loginTime || '',
      session.logoutTime || '',
      session.sessionStatus || '',
      session.ipAddress || '',
      session.device || '',
      session.browser || '',
      session.os || '',
      session.country || '',
      session.city || '',
      session.durationMinutes ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(historyUser.email || 'user').replace(/[^a-z0-9]/gi, '_')}_sessions.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const applyAction = async (user, action) => {
    const key = `${user._id}-${action}`;
    setActionLoading(key);
    try {
      const payload = { action };
      if (action === 'ban') {
        const reason = prompt('Enter ban reason (optional):', user.banReason || '');
        if (reason !== null) payload.reason = reason;
      }

      await adminAPI.updateUserAccess(user._id, payload);
      const actionLabel = action === 'ban' ? 'banned' : action === 'block' ? 'blocked' : 'unblocked';
      toast.success(`User ${actionLabel} successfully`);
      await loadUsers();
      if (historyOpen && historyUser?._id === user._id) {
        await loadSessionHistory(user, historyFilter, historyPagination?.page || 1);
      }
    } catch (error) {
      toast.error(error.message || `Failed to ${action} user`);
    } finally {
      setActionLoading('');
    }
  };

  const saveRole = async (user) => {
    const nextRole = roleDrafts[user._id];
    if (!nextRole || nextRole === user.role) {
      return;
    }

    setRoleLoading(user._id);
    try {
      await adminAPI.updateUserRole(user._id, { role: nextRole });
      toast.success('User role updated');
      await loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setRoleLoading('');
    }
  };

  const statusPill = (user) => {
    if (user.isBanned) return 'bg-red-100 text-red-700';
    if (user.isBlocked) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const statusText = (user) => {
    if (user.isBanned) return 'banned';
    if (user.isBlocked) return 'blocked';
    return 'active';
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryUser(null);
    setHistoryRows([]);
    setHistorySummary(null);
    setHistoryPagination(null);
    setHistoryFilter('all');
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">IP Address</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Device</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Orders</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Role</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{user.email}</div>
                      <div className="text-xs text-slate-500">{user.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{user.activity?.ipAddress || '-'}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {user.activity
                        ? `${user.activity.device} / ${user.activity.browser} / ${user.activity.os}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {user.activity ? `${user.activity.city}, ${user.activity.country}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{user.orderCount || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusPill(user)}`}>
                        {statusText(user)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {hasPermission('MANAGE_ADMINS') ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={roleDrafts[user._id] || user.role}
                            onChange={(event) => setRoleDrafts((current) => ({ ...current, [user._id]: event.target.value }))}
                            disabled={user._id === currentUser?._id}
                            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300"
                          >
                            {assignableRoles.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveRole(user)}
                            disabled={user._id === currentUser?._id || roleLoading === user._id || (roleDrafts[user._id] || user.role) === user.role}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                          >
                            {roleLoading === user._id ? 'Saving' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-700">{user.role}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => loadSessionHistory(user, 'all', 1)}
                          disabled={historyLoading && historyUser?._id === user._id}
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 disabled:opacity-40"
                          title="View session history"
                        >
                          <Clock3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyAction(user, 'block')}
                          disabled={actionLoading === `${user._id}-block` || user.isBanned}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                          title="Block user"
                        >
                          <ShieldX className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyAction(user, 'unblock')}
                          disabled={actionLoading === `${user._id}-unblock`}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40"
                          title="Unblock user"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyAction(user, 'ban')}
                          disabled={actionLoading === `${user._id}-ban`}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Ban user"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm p-4 sm:p-8">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
            <div className="w-full max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Login Timeline</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">{historyUser?.email || 'User session history'}</h3>
                  <p className="mt-1 text-sm text-slate-500">{historyUser?.name || 'User'} activity across recent authenticated sessions.</p>
                </div>
                <button
                  onClick={closeHistory}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close session history"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto px-6 py-5 max-h-[calc(90vh-88px)]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Sessions</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{historySummary?.totalSessions || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-500">Active</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-700">{historySummary?.activeSessions || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-amber-500">Blocked Sessions</div>
                    <div className="mt-2 text-2xl font-semibold text-amber-700">{historySummary?.blockedSessions || 0}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <select
                      value={historyFilter}
                      onChange={(event) => loadSessionHistory(historyUser, event.target.value, 1)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    >
                      <option value="all">All sessions</option>
                      <option value="active">Active only</option>
                      <option value="closed">Closed only</option>
                      <option value="blocked">Blocked only</option>
                    </select>
                    <div className="text-sm text-slate-500">
                      Latest login: {historySummary?.latestLogin ? new Date(historySummary.latestLogin).toLocaleString() : '-'}
                    </div>
                  </div>
                  <button
                    onClick={exportSessionHistory}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : historyRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center text-slate-500">
                    No sessions found for the selected filter.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Login</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Logout</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Network</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Device</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((session) => (
                            <tr key={session._id} className="border-t border-slate-100 align-top">
                              <td className="px-4 py-3 text-slate-700">{new Date(session.loginTime).toLocaleString()}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {session.logoutTime ? new Date(session.logoutTime).toLocaleString() : 'Still active'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                    session.sessionStatus === 'blocked'
                                      ? 'bg-amber-100 text-amber-700'
                                      : session.sessionStatus === 'active'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {session.sessionStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{session.ipAddress || '-'}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {session.device} / {session.browser} / {session.os}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{session.city}, {session.country}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {session.durationMinutes ? `${session.durationMinutes} min` : 'Active'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {historyPagination?.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      Page {historyPagination.page} of {historyPagination.pages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadSessionHistory(historyUser, historyFilter, historyPagination.page - 1)}
                        disabled={historyPagination.page <= 1 || historyLoading}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadSessionHistory(historyUser, historyFilter, historyPagination.page + 1)}
                        disabled={historyPagination.page >= historyPagination.pages || historyLoading}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
