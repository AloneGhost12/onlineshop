'use client';

import { Moon, Sun } from 'lucide-react';
import SellerShell from '@/components/seller/SellerShell';
import { useTheme } from '@/context/ThemeContext';

export default function SellerSettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <SellerShell
      title="Seller Settings"
      subtitle="Control appearance preferences for your seller workspace."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appearance</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Dark mode</h2>
        <p className="mt-1 text-sm text-slate-500">Use dark mode while managing products, orders, and analytics.</p>

        <button
          type="button"
          onClick={toggleTheme}
          className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            isDarkMode
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-slate-900 text-white hover:bg-slate-700'
          }`}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </div>
    </SellerShell>
  );
}
