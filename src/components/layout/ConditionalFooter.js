'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/layout/Footer';

const sellerAuthPages = new Set([
  '/seller/login',
  '/seller/register',
  '/seller/forgot-password',
]);

const shouldShowFooter = (pathname) => {
  if (!pathname) return true;

  if (pathname.startsWith('/seller/reset-password/')) {
    return true;
  }

  if (sellerAuthPages.has(pathname)) {
    return true;
  }

  return !pathname.startsWith('/seller/');
};

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (!shouldShowFooter(pathname)) {
    return null;
  }

  return <Footer />;
}
