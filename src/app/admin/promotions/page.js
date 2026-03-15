'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/lib/api';
import { ArrowLeft, CalendarClock, Loader2, Megaphone, Pencil, Power, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const promotionTypes = [
  'FIRST_ORDER',
  'FESTIVAL',
  'CATEGORY_DISCOUNT',
  'BUY_ONE_GET_ONE',
  'FLASH_SALE',
];

const discountTypes = ['percentage', 'fixed'];

const emptyForm = {
  promotionName: '',
  type: 'FESTIVAL',
  discountType: 'percentage',
  discountValue: '',
  eligibleProducts: '',
  eligibleCategories: '',
  minOrderAmount: '',
  maxDiscount: '',
  startDate: '',
  endDate: '',
  combinable: false,
  isActive: true,
};

const toApiArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const fromDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const buildPayload = (form) => ({
  promotionName: form.promotionName.trim(),
  type: form.type,
  discountType: form.discountType,
  discountValue: Number(form.discountValue || 0),
  eligibleProducts: toApiArray(form.eligibleProducts),
  eligibleCategories: toApiArray(form.eligibleCategories),
  minOrderAmount: Number(form.minOrderAmount || 0),
  maxDiscount: Number(form.maxDiscount || 0),
  startDate: form.startDate,
  endDate: form.endDate,
  combinable: Boolean(form.combinable),
  isActive: Boolean(form.isActive),
});

const getStatus = (promotion) => {
  const now = Date.now();
  const start = new Date(promotion.startDate).getTime();
  const end = new Date(promotion.endDate).getTime();

  if (!promotion.isActive) return 'disabled';
  if (start > now) return 'scheduled';
  if (end < now) return 'expired';
  return 'active';
};

export default function PromotionsAdminPage() {
  const { user, isAdmin, hasAdminAccess, hasPermission } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [editingPromotionId, setEditingPromotionId] = useState('');
  const [form, setForm] = useState(emptyForm);

  const canManagePromotions = hasPermission('MANAGE_COUPONS');

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPromotions({ status: statusFilter });
      setPromotions(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (canManagePromotions) {
      loadPromotions();
    } else {
      setLoading(false);
    }
  }, [canManagePromotions, loadPromotions]);

  const promotionSummary = useMemo(() => {
    const totals = {
      active: 0,
      scheduled: 0,
      expired: 0,
      disabled: 0,
      totalDiscountGiven: 0,
      totalUsage: 0,
    };

    for (const promotion of promotions) {
      totals[getStatus(promotion)] += 1;
      totals.totalDiscountGiven += Number(promotion.totalDiscountGiven || 0);
      totals.totalUsage += Number(promotion.usageCount || 0);
    }

    return totals;
  }, [promotions]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingPromotionId('');
  };

  const handleSave = async () => {
    if (!form.promotionName.trim()) {
      toast.error('Promotion name is required');
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error('Start date and end date are required');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (editingPromotionId) {
        await adminAPI.updatePromotion(editingPromotionId, payload);
        toast.success('Promotion updated');
      } else {
        await adminAPI.createPromotion(payload);
        toast.success('Promotion created');
      }

      resetForm();
      await loadPromotions();
    } catch (error) {
      toast.error(error.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotionId(promotion._id);
    setForm({
      promotionName: promotion.promotionName || '',
      type: promotion.type || 'FESTIVAL',
      discountType: promotion.discountType || 'percentage',
      discountValue: String(promotion.discountValue ?? ''),
      eligibleProducts: (promotion.eligibleProducts || []).join(', '),
      eligibleCategories: (promotion.eligibleCategories || []).join(', '),
      minOrderAmount: String(promotion.minOrderAmount ?? ''),
      maxDiscount: String(promotion.maxDiscount ?? ''),
      startDate: fromDateForInput(promotion.startDate),
      endDate: fromDateForInput(promotion.endDate),
      combinable: Boolean(promotion.combinable),
      isActive: Boolean(promotion.isActive),
    });
  };

  const handleDisable = async (promotion) => {
    const key = `disable-${promotion._id}`;
    setActionLoading(key);
    try {
      await adminAPI.deletePromotion(promotion._id);
      toast.success('Promotion disabled');
      await loadPromotions();
    } catch (error) {
      toast.error(error.message || 'Failed to disable promotion');
    } finally {
      setActionLoading('');
    }
  };

  const toggleActive = async (promotion) => {
    const key = `toggle-${promotion._id}`;
    setActionLoading(key);
    try {
      await adminAPI.updatePromotion(promotion._id, {
        isActive: !promotion.isActive,
      });
      toast.success(!promotion.isActive ? 'Promotion enabled' : 'Promotion disabled');
      await loadPromotions();
    } catch (error) {
      toast.error(error.message || 'Failed to update promotion state');
    } finally {
      setActionLoading('');
    }
  };

  if (!user || !isAdmin || !hasAdminAccess || !canManagePromotions) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900">Access denied</h2>
        <p className="mt-2 text-sm text-slate-500">You need coupon-management permission to manage promotions.</p>
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
            <Megaphone className="h-6 w-6 text-amber-600" /> Promotions
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create, schedule, update, disable, and track automatic checkout promotions.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired/Disabled</option>
          </select>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Active', value: promotionSummary.active },
          { label: 'Scheduled', value: promotionSummary.scheduled },
          { label: 'Expired', value: promotionSummary.expired },
          { label: 'Disabled', value: promotionSummary.disabled },
          { label: 'Usage Count', value: promotionSummary.totalUsage },
          { label: 'Discount Given', value: `₹${promotionSummary.totalDiscountGiven.toLocaleString('en-IN')}` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{editingPromotionId ? 'Edit Promotion' : 'Create Promotion'}</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Promotion Name</label>
            <input
              value={form.promotionName}
              onChange={(event) => setForm({ ...form, promotionName: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Summer Festival Offer"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              {promotionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Discount Type</label>
            <select
              value={form.discountType}
              onChange={(event) => setForm({ ...form, discountType: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              {discountTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Discount Value</label>
            <input
              type="number"
              min="0"
              value={form.discountValue}
              onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Min Order Amount</label>
            <input
              type="number"
              min="0"
              value={form.minOrderAmount}
              onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Max Discount</label>
            <input
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="0 for unlimited"
            />
          </div>

          <div className="xl:col-span-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Eligible Products (comma separated product IDs)</label>
            <input
              value={form.eligibleProducts}
              onChange={(event) => setForm({ ...form, eligibleProducts: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="67ac..., 67ad..."
            />
          </div>

          <div className="xl:col-span-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Eligible Categories (comma separated category IDs)</label>
            <input
              value={form.eligibleCategories}
              onChange={(event) => setForm({ ...form, eligibleCategories: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="67be..., 67bf..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.combinable}
                onChange={(event) => setForm({ ...form, combinable: event.target.checked })}
              />
              Combinable
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {editingPromotionId ? 'Update Promotion' : 'Create Promotion'}
          </button>
          {editingPromotionId && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Promotion Performance</h2>
          <div className="text-sm text-slate-500">{promotions.length} promotions</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Promotion</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Usage</th>
                  <th className="px-4 py-3 text-left font-semibold">Discount Given</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => {
                  const status = getStatus(promotion);
                  return (
                    <tr key={promotion._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{promotion.promotionName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {promotion.discountType === 'percentage' ? `${promotion.discountValue}%` : `₹${promotion.discountValue}`} discount
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{promotion.type}</td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div className="inline-flex items-center gap-1 font-semibold text-slate-700"><CalendarClock className="h-3.5 w-3.5" /> From</div>
                        <div>{new Date(promotion.startDate).toLocaleString()}</div>
                        <div className="mt-2">To {new Date(promotion.endDate).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'scheduled'
                              ? 'bg-sky-100 text-sky-700'
                              : status === 'expired'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                        }`}>{status}</span>
                        {promotion.combinable && (
                          <div className="mt-2 text-xs text-indigo-600">Combinable</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="font-semibold">{promotion.usageCount || 0}</div>
                        <div className="text-xs text-slate-500">Orders: {promotion.totalOrders || 0}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-emerald-600">₹{Number(promotion.totalDiscountGiven || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(promotion)}
                            className="rounded-xl border border-indigo-200 px-3 py-2 text-indigo-700"
                            title="Edit promotion"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(promotion)}
                            disabled={actionLoading === `toggle-${promotion._id}`}
                            className="rounded-xl border border-amber-200 px-3 py-2 text-amber-700 disabled:opacity-60"
                            title={promotion.isActive ? 'Disable promotion' : 'Enable promotion'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDisable(promotion)}
                            disabled={actionLoading === `disable-${promotion._id}`}
                            className="rounded-xl border border-red-200 px-3 py-2 text-red-600 disabled:opacity-60"
                            title="Disable promotion"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No promotions found for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
