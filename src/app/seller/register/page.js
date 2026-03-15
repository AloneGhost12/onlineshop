'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Mail, Phone, Store, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSellerAuth } from '@/context/SellerAuthContext';
import toast from 'react-hot-toast';

export default function SellerRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { registerSeller, applySeller } = useSellerAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sellerName: user?.name || '',
    storeName: '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.sellerName.trim()) {
      toast.error('Seller name is required');
      return;
    }

    if (!form.storeName.trim()) {
      toast.error('Store name is required');
      return;
    }

    if (!user && !form.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!form.phone.trim()) {
      toast.error('Phone is required');
      return;
    }

    if (!form.password || form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await applySeller({
          sellerName: form.sellerName,
          storeName: form.storeName,
          phone: form.phone,
          password: form.password,
        });
      } else {
        await registerSeller(form);
      }

      toast.success('Seller application submitted. Waiting for admin verification.');
      router.push('/seller/login');
    } catch (error) {
      toast.error(error.message || 'Failed to create seller account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Create Seller Account</h1>
          <p className="mt-2 text-sm text-slate-500">Submit a seller application. Admin approval is required before seller access is enabled.</p>
        </div>

        {user && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You are applying as an existing user account ({user.email}). Your application status will be <span className="font-semibold">waiting for verification</span> until admin approval.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input required value={form.sellerName} onChange={(event) => setForm((current) => ({ ...current, sellerName: event.target.value }))} placeholder="Seller name" className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm" />
          </div>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input required value={form.storeName} onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))} placeholder="Store name" className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm" />
          </div>
          <div className="relative md:col-span-2">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" required={!user} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="seller@store.com" disabled={Boolean(user)} className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm" />
          </div>
          <input type="password" required minLength={6} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          <button type="submit" disabled={loading} className="md:col-span-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Submitting application...' : <>Submit seller application <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already selling? <Link href="/seller/login" className="font-semibold text-emerald-600">Seller login</Link>
        </p>
      </div>
    </div>
  );
}