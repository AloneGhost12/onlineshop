'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Settings, Store, X } from 'lucide-react';
import { useSellerAuth } from '@/context/SellerAuthContext';

const navigation = [
  { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Products', icon: Package },
  { href: '/seller/orders', label: 'Orders', icon: ReceiptText },
  { href: '/seller/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/seller/settings', label: 'Settings', icon: Settings },
];

export default function SellerShell({ title, subtitle, children, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { seller, logoutSeller, loading } = useSellerAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-slate-500">Loading seller hub...</div>;
  }

  if (!seller) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Seller access required</h1>
        <p className="mt-3 text-slate-500">Sign in with a seller account or create one to manage your marketplace storefront.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/seller/login" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Seller Login</Link>
          <Link href="/seller/register" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Create Seller Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px,1fr] lg:px-8">
      <aside className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Seller Store</p>
          <h2 className="mt-2 text-xl font-semibold">{seller.storeName}</h2>
          <p className="mt-1 text-sm text-white/80">{seller.sellerName}</p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={async () => {
            await logoutSeller();
            router.push('/seller/login');
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out seller
        </button>
      </aside>

      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
          <button
            onClick={() => setMobileNavOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
          >
            <span>Seller Menu</span>
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {mobileNavOpen && (
            <div className="mt-3 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={async () => {
                  await logoutSeller();
                  setMobileNavOpen(false);
                  router.push('/seller/login');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out seller
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {action}
        </div>
        {children}
      </section>
    </div>
  );
}