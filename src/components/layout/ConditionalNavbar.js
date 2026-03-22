'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';

const sellerAuthPages = new Set([
  '/seller/login',
  '/seller/register',
  '/seller/forgot-password',
]);

const shouldShowNavbar = (pathname) => {
  if (!pathname) return true;

  if (pathname.startsWith('/seller/reset-password/')) {
    return true;
  }

  if (sellerAuthPages.has(pathname)) {
    return true;
  }

  return !pathname.startsWith('/seller/');
};

export default function ConditionalNavbar() {
  const pathname = usePathname();

  if (!shouldShowNavbar(pathname)) {
    return null;
  }

  return <Navbar />;
}
