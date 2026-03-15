import Link from 'next/link';
import { Store, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ShopVault</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your one-stop destination for premium products. Quality meets convenience with ShopVault.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="hover:text-indigo-400 transition-colors">All Products</Link></li>
              <li><Link href="/products?featured=true" className="hover:text-indigo-400 transition-colors">Featured</Link></li>
              <li><Link href="/orders" className="hover:text-indigo-400 transition-colors">Track Order</Link></li>
              <li><Link href="/profile" className="hover:text-indigo-400 transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-white font-semibold mb-4">Help</h3>
            <ul className="space-y-2.5 text-sm">
              <li><span className="hover:text-indigo-400 transition-colors cursor-pointer">FAQ</span></li>
              <li><span className="hover:text-indigo-400 transition-colors cursor-pointer">Shipping Policy</span></li>
              <li><span className="hover:text-indigo-400 transition-colors cursor-pointer">Returns & Refunds</span></li>
              <li><span className="hover:text-indigo-400 transition-colors cursor-pointer">Privacy Policy</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                support@shopvault.com
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                +91 98765 43210
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Bangalore, Karnataka, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} ShopVault. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
