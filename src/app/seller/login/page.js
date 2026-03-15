'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Store, Mail, Lock, ArrowRight } from 'lucide-react';
import { useSellerAuth } from '@/context/SellerAuthContext';
import toast from 'react-hot-toast';

export default function SellerLoginPage() {
  const router = useRouter();
  const { loginSeller } = useSellerAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await loginSeller(form.email, form.password);
      toast.success('Seller account connected');
      router.push('/seller/dashboard');
    } catch (error) {
      toast.error(error.message || 'Seller login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Seller Login</h1>
          <p className="mt-2 text-sm text-slate-500">Access your marketplace storefront dashboard after admin verification.</p>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          If your seller application is still pending, login will be blocked until admin approval.
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="seller@example.com" className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm" />
          </div>
          <div className="text-right">
            <Link href="/seller/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Signing in...' : <>Enter Seller Hub <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New seller? <Link href="/seller/register" className="font-semibold text-emerald-600">Create seller account</Link>
        </p>
      </div>
    </div>
  );
}