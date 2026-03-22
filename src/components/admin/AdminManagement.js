'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, STAFF_ROLES } from '@/lib/rbac';
import { Loader2, ShieldCheck, UserPlus2 } from 'lucide-react';
import toast from 'react-hot-toast';

const defaultForm = {
  name: '',
  email: '',
  password: '',
  role: 'ADMIN',
  permissions: ['MANAGE_PRODUCTS', 'MANAGE_USERS', 'MANAGE_ORDERS', 'MANAGE_COUPONS', 'VIEW_ANALYTICS', 'MANAGE_ADMINS'],
};

export default function AdminManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers({ adminOnly: true, limit: 100 });
      const rows = response.data || [];
      setStaff(rows);
      setDrafts(
        rows.reduce((acc, member) => {
          acc[member._id] = {
            role: member.role,
            permissions: member.permissions || [],
          };
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(error.message || 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const togglePermission = (state, permission) => {
    const nextPermissions = state.permissions.includes(permission)
      ? state.permissions.filter((item) => item !== permission)
      : [...state.permissions, permission];

    return {
      ...state,
      permissions: nextPermissions,
    };
  };

  const assignableStaffRoles = user?.role === 'SUPER_ADMIN'
    ? STAFF_ROLES
    : STAFF_ROLES.filter((role) => role !== 'SUPER_ADMIN');

  const editableMemberRoles = ['USER', ...assignableStaffRoles];

  const updateDraft = (userId, updater) => {
    setDrafts((current) => ({
      ...current,
      [userId]: typeof updater === 'function' ? updater(current[userId]) : updater,
    }));
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await adminAPI.createAdmin(form);
      toast.success('Admin account created');
      setForm(defaultForm);
      await loadStaff();
    } catch (error) {
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setCreating(false);
    }
  };

  const saveStaffMember = async (member) => {
    if (member._id === user?._id) {
      toast.error('Your own role cannot be changed here');
      return;
    }

    setSavingId(member._id);
    try {
      await adminAPI.updateUserRole(member._id, drafts[member._id]);
      toast.success('Permissions updated');
      await loadStaff();
    } catch (error) {
      toast.error(error.message || 'Failed to update staff permissions');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <form onSubmit={handleCreateAdmin} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <UserPlus2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Create Admin Staff</h3>
            <p className="text-sm text-slate-500">Create admin, moderator, support, or super admin accounts with explicit permissions.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-300" />
          <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-300" />
          <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} type="password" placeholder="Temporary password" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-300" />
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-300">
            {assignableStaffRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PERMISSIONS.map((permission) => {
            const selected = form.permissions.includes(permission);
            return (
              <button
                key={permission}
                type="button"
                onClick={() => setForm((current) => togglePermission(current, permission))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {permission}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Create admin
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-900">Admin Permissions</h3>
          <p className="text-sm text-slate-500">Assign and revoke permissions for staff accounts without touching regular users.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => {
              const draft = drafts[member._id] || { role: member.role, permissions: member.permissions || [] };
              return (
                <div key={member._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{member.name}</h4>
                      <p className="text-sm text-slate-500">{member.email}</p>
                      <p className="mt-2 text-xs text-slate-400">Last login: {member.lastLogin ? new Date(member.lastLogin).toLocaleString() : 'Never'}</p>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <select
                        value={draft.role}
                        onChange={(event) => updateDraft(member._id, (current) => ({ ...current, role: event.target.value }))}
                        disabled={member._id === user?._id}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 disabled:opacity-60"
                      >
                        {editableMemberRoles.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveStaffMember(member)}
                        disabled={savingId === member._id || member._id === user?._id}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {savingId === member._id ? 'Saving...' : 'Save access'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {PERMISSIONS.map((permission) => {
                      const enabled = draft.permissions.includes(permission);
                      return (
                        <button
                          key={permission}
                          type="button"
                          onClick={() => updateDraft(member._id, (current) => togglePermission(current, permission))}
                          disabled={member._id === user?._id}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          {permission}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}