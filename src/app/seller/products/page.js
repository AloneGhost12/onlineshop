'use client';

import { useEffect, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import ImageUpload from '@/components/product/ImageUpload';
import { categoryAPI, sellerAPI } from '@/lib/api';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  title: '',
  description: '',
  price: '',
  comparePrice: '',
  stock: '',
  category: '',
  brand: '',
  images: [{ url: '', alt: '' }],
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        sellerAPI.getProducts(),
        categoryAPI.getAll(),
      ]);
      setProducts(productResponse.data || []);
      setCategories(categoryResponse.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load seller products');
    }
  };

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          sellerAPI.getProducts(),
          categoryAPI.getAll(),
        ]);

        if (ignore) {
          return;
        }

        setProducts(productResponse.data || []);
        setCategories(categoryResponse.data || []);
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || 'Failed to load seller products');
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        comparePrice: Number(form.comparePrice) || 0,
        stock: Number(form.stock),
        images: form.images.filter((image) => image.url),
      };

      if (editingId) {
        await sellerAPI.updateProduct(editingId, payload);
        toast.success('Seller product updated');
      } else {
        await sellerAPI.createProduct(payload);
        toast.success('Seller product created');
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to save seller product');
    }
  };

  const startEdit = (product) => {
    setEditingId(product._id);
    setShowForm(true);
    setForm({
      title: product.title,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice || '',
      stock: product.stock,
      category: product.category?._id || product.category,
      brand: product.brand || '',
      images: product.images?.length ? product.images : [{ url: '', alt: '' }],
    });
  };

  const removeProduct = async (productId) => {
    if (!confirm('Remove this seller product from the marketplace?')) return;
    try {
      await sellerAPI.deleteProduct(productId);
      toast.success('Seller product removed');
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to remove product');
    }
  };

  return (
    <SellerShell
      title="Seller Products"
      subtitle="Create, edit, and manage stock for products owned by your store."
      action={
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white sm:w-auto">
          <Plus className="h-4 w-4" />
          Add product
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Product title" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
            <input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} placeholder="Brand" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="md:col-span-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm" rows={4} />
            <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="Price" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
            <input type="number" value={form.comparePrice} onChange={(event) => setForm((current) => ({ ...current, comparePrice: event.target.value }))} placeholder="Compare price" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
            <input type="number" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} placeholder="Stock" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
            <div className="md:col-span-2">
              <ImageUpload
                images={form.images}
                onChange={(images) => setForm((current) => ({ ...current, images }))}
                maxImages={5}
              />
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Commission is set by the platform admin. Current payout rate is shown per product after creation.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setShowForm(false)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:w-auto">Cancel</button>
            <button type="submit" className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white sm:w-auto">{editingId ? 'Update Product' : 'Create Product'}</button>
          </div>
        </form>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-left font-semibold">Price</th>
                <th className="px-4 py-3 text-left font-semibold">Stock</th>
                <th className="px-4 py-3 text-left font-semibold">Commission</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-t border-slate-100">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{product.title}</div>
                    <div className="text-xs text-slate-500">{product.category?.name || product.category}</div>
                  </td>
                  <td className="px-4 py-4">₹{product.price?.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4">{product.stock}</td>
                  <td className="px-4 py-4">{product.commissionPercentage}%</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(product)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
                      <button onClick={() => removeProduct(product._id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {products.map((product) => (
            <div key={product._id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{product.title}</p>
              <p className="mt-1 text-xs text-slate-500">{product.category?.name || product.category}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <p>Price: <span className="font-semibold text-slate-800">₹{product.price?.toLocaleString('en-IN')}</span></p>
                <p>Stock: <span className="font-semibold text-slate-800">{product.stock}</span></p>
                <p>Commission: <span className="font-semibold text-slate-800">{product.commissionPercentage}%</span></p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => startEdit(product)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
                <button onClick={() => removeProduct(product._id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SellerShell>
  );
}