import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SellerAuthProvider } from '@/context/SellerAuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'ShopVault — Premium Online Store',
  description: 'Discover premium products at unbeatable prices. Shop electronics, fashion, home & more with fast delivery and secure checkout.',
  keywords: 'ecommerce, online shopping, electronics, fashion, deals',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
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
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </CartProvider>
          </SellerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
