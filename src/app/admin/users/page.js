'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/components/admin/UserManagement';

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500">Admin access required</p>
        <Link href="/auth/login" className="text-indigo-600 font-semibold mt-4 inline-block hover:underline">Sign In as Admin</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor user sessions and manage access controls.</p>
      </div>
      <UserManagement />
    </div>
  );
}
