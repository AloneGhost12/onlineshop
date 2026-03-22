'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || 'India',
    },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Please sign in</h2>
        <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/25">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
            }`}>{user.role}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-5">
        <h3 className="font-bold text-slate-900 mb-2">Edit Profile</h3>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" placeholder="+91 98765 43210" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2 block">
            <MapPin className="w-4 h-4" /> Address
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Street" className="sm:col-span-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} />
            <input placeholder="City" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
            <input placeholder="State" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
            <input placeholder="ZIP Code" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.address.zipCode} onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })} />
            <input placeholder="Country" className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              value={form.address.country} onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-6">
        <h3 className="font-bold text-slate-900">Appearance Settings</h3>
        <p className="mt-1 text-sm text-slate-500">Choose your preferred theme for the app.</p>
        <button
          type="button"
          onClick={toggleTheme}
          className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            isDarkMode
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-slate-900 text-white hover:bg-slate-700'
          }`}
        >
          {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
        <Link href="/settings" className="ml-3 text-sm font-semibold text-indigo-600 hover:underline">
          Open full settings
        </Link>
      </div>
    </div>
  );
}
