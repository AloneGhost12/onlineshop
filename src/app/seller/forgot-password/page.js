'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, KeyRound } from 'lucide-react';
import { sellerAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SellerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await sellerAPI.forgotPassword(email);
      setResetUrl(response?.data?.resetUrl || '');
      toast.success('If seller account exists, reset details are ready.');
    } catch (error) {
      toast.error(error.message || 'Failed to process forgot password request');
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
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Seller Forgot Password</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your seller email to generate a secure reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seller@example.com"
              className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Generating link...' : <>Generate seller reset link <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        {resetUrl && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Seller reset link generated:</p>
            <a href={resetUrl} className="mt-2 block break-all font-medium underline">
              {resetUrl}
            </a>
            <p className="mt-2 text-xs">Link expires in 15 minutes.</p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Back to <Link href="/seller/login" className="font-semibold text-emerald-600">seller login</Link>
        </p>
      </div>
    </div>
  );
}
