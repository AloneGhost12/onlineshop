'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { sellerAPI } from '@/lib/api';
import { ArrowRight, KeyRound, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SellerResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await sellerAPI.resetPassword(token, password);
      toast.success('Seller password reset successful');
      router.push('/seller/login');
    } catch (error) {
      toast.error(error.message || 'Failed to reset seller password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Reset Seller Password</h1>
          <p className="mt-2 text-sm text-slate-500">Set a new password for your seller account.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Resetting...' : <>Reset seller password <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Back to <Link href="/seller/login" className="font-semibold text-emerald-600">seller login</Link>
        </p>
      </div>
    </div>
  );
}
