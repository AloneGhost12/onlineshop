'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Edit, Loader2, Power, TicketPercent, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const defaultForm = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscount: '',
  expiryDate: '',
  usageLimit: '',
  isActive: true,
  visibility: 'public',
  allowedUsers: [],
};

export default function CouponManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState({ totalCoupons: 0, activeCoupons: 0, totalUses: 0 });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [assignCouponId, setAssignCouponId] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const couponById = useMemo(
    () => Object.fromEntries(coupons.map((coupon) => [coupon._id, coupon])),
    [coupons]
  );

  const loadCoupons = async (query = '') => {
    setLoading(true);
    try {
      const data = await adminAPI.getCoupons({ limit: 100, search: query || undefined });
      setCoupons(data.data || []);
      setAnalytics(data.analytics || { totalCoupons: 0, activeCoupons: 0, totalUses: 0 });
    } catch (error) {
      toast.error(error.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const userData = await adminAPI.getUsers({ limit: 200 });
      setUsers(userData.data || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadCoupons();
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingCoupon(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 16) : '',
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
      visibility: coupon.visibility,
      allowedUsers: (coupon.allowedUsers || []).map((id) => id.toString()),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    if (!form.expiryDate) {
      toast.error('Expiry date is required');
      return;
    }

    if (form.visibility === 'targeted' && form.allowedUsers.length === 0) {
      toast.error('Targeted coupon requires at least one user');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        expiryDate: new Date(form.expiryDate).toISOString(),
        usageLimit: Number(form.usageLimit) || 0,
        isActive: form.isActive,
        visibility: form.visibility,
        allowedUsers: form.allowedUsers,
      };

      if (editingCoupon) {
        await adminAPI.updateCoupon(editingCoupon._id, payload);
        toast.success('Coupon updated');
      } else {
        await adminAPI.createCoupon(payload);
        toast.success('Coupon created');
      }

      setShowForm(false);
      resetForm();
      await loadCoupons(search);
    } catch (error) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await adminAPI.deleteCoupon(couponId);
      toast.success('Coupon deleted');
      await loadCoupons(search);
    } catch (error) {
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await adminAPI.updateCoupon(coupon._id, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? 'Coupon disabled' : 'Coupon enabled');
      await loadCoupons(search);
    } catch (error) {
      toast.error(error.message || 'Failed to update coupon status');
    }
  };

  const openAssign = (coupon) => {
    setAssignCouponId(coupon._id);
    setSelectedUserIds((coupon.allowedUsers || []).map((id) => id.toString()));
  };

  const handleAssign = async () => {
    if (!assignCouponId) return;
    try {
      await adminAPI.assignCoupon({ couponId: assignCouponId, userIds: selectedUserIds });
      toast.success('Users assigned');
      setAssignCouponId(null);
      setSelectedUserIds([]);
      await loadCoupons(search);
    } catch (error) {
      toast.error(error.message || 'Failed to assign users');
    }
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <p className="text-sm text-slate-500">Total Coupons</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.totalCoupons}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <p className="text-sm text-slate-500">Active Coupons</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{analytics.activeCoupons}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
          <p className="text-sm text-slate-500">Total Uses</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{analytics.totalUses}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon code"
            className="w-full sm:w-72 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={() => loadCoupons(search)}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
        >
          <TicketPercent className="w-4 h-4" /> New Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Visibility</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Expiry</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{coupon.code}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}%`
                        : `Rs ${coupon.discountValue.toLocaleString('en-IN')}`}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700">{coupon.visibility}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {coupon.usedCount}
                      {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ' / unlimited'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(coupon.expiryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(coupon)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => openAssign(coupon)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Assign users">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(coupon)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Enable or disable">
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(coupon._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {coupons.map((coupon) => (
              <div key={coupon._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{coupon.code}</p>
                    <p className="text-xs text-slate-600 capitalize">{coupon.visibility}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {coupon.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>
                    Discount: {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `Rs ${coupon.discountValue.toLocaleString('en-IN')}`}
                  </p>
                  <p>Usage: {coupon.usedCount}{coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ' / unlimited'}</p>
                  <p>Expiry: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => openEdit(coupon)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700">Edit</button>
                  <button onClick={() => openAssign(coupon)} className="rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700">Assign</button>
                  <button onClick={() => handleToggleActive(coupon)} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Toggle</button>
                  <button onClick={() => handleDelete(coupon._id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[88vh] overflow-y-auto animate-scale-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Discount Type</label>
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Discount Value</label>
                <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Min Order Amount</label>
                <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Max Discount</label>
                <input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Usage Limit</label>
                <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Expiry Date</label>
                <input type="datetime-local" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Visibility</label>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="targeted">Targeted</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-indigo-600" />
                <label className="text-sm font-medium text-slate-700">Coupon is active</label>
              </div>

              {(form.visibility === 'targeted' || form.visibility === 'private') && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Allowed Users</label>
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                    {users.map((user) => (
                      <label key={user._id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.allowedUsers.includes(user._id)}
                          onChange={() => {
                            const next = form.allowedUsers.includes(user._id)
                              ? form.allowedUsers.filter((id) => id !== user._id)
                              : [...form.allowedUsers, user._id];
                            setForm({ ...form, allowedUsers: next });
                          }}
                          className="accent-indigo-600"
                        />
                        <span>{user.name} ({user.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignCouponId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[84vh] overflow-y-auto animate-scale-in">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Assign Users</h2>
            <p className="text-sm text-slate-500 mb-4">Coupon: {couponById[assignCouponId]?.code || '-'}</p>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
              {users.map((user) => (
                <label key={user._id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user._id)}
                    onChange={() => toggleUser(user._id)}
                    className="accent-indigo-600"
                  />
                  <span>{user.name} ({user.email})</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => { setAssignCouponId(null); setSelectedUserIds([]); }} className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleAssign} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">Save assignments</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
