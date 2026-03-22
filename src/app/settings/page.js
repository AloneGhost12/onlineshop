'use client';

import Link from 'next/link';
import { Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="mb-2 text-xl font-bold">Please sign in</h2>
        <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Customize your account experience.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Appearance</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Dark mode</h2>
            <p className="mt-1 text-sm text-slate-500">Switch between light and dark theme for your account.</p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isDarkMode
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h3>
        <div className="mt-3 flex items-center gap-3 text-slate-700">
          <User className="h-4 w-4" />
          <span>{user.name} ({user.role})</span>
        </div>
        <Link href="/profile" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
          Manage profile details
        </Link>
      </div>
    </div>
  );
}
