import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SellerAuthProvider } from '@/context/SellerAuthContext';
import { ScrollProvider } from '@/context/ScrollContext';
import { DebugProvider } from '@/context/DebugContext';
import ConditionalNavbar from '@/components/layout/ConditionalNavbar';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'ShopVault — Premium Online Store',
  description: 'Discover premium products at unbeatable prices. Shop electronics, fashion, home & more with fast delivery and secure checkout.',
  keywords: 'ecommerce, online shopping, electronics, fashion, deals',
  icons: {
    icon: '/next.svg',
    shortcut: '/next.svg',
    apple: '/next.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <DebugProvider>
          <ScrollProvider>
            <AuthProvider>
              <SellerAuthProvider>
                <CartProvider>
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        borderRadius: '12px',
                        padding: '12px 16px',
                      },
                    }}
                  />
                  <ConditionalNavbar />
                  <main className="flex-1">{children}</main>
                  <ConditionalFooter />
                  <Analytics />
                </CartProvider>
              </SellerAuthProvider>
            </AuthProvider>
          </ScrollProvider>
        </DebugProvider>
      </body>
    </html>
  );
}
