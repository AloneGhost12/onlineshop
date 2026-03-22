'use client';

import { useEffect, useRef, useState } from 'react';
import SellerShell from '@/components/seller/SellerShell';
import { sellerAPI } from '@/lib/api';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressLabel from '@/components/orders/AddressLabel';
import { generateAddressLabelPDF } from '@/lib/pdfGenerator';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingOrderId, setDownloadingOrderId] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const labelRefs = useRef({});

  const filteredOrders = orders.filter((order) => {
    const sellerStatus = order.sellerDeliveryStatus || (order.status === 'delivered' ? 'delivered' : 'pending');

    if (statusFilter === 'all') {
      return true;
    }

    if (statusFilter === 'delivered') {
      return sellerStatus === 'delivered';
    }

    return sellerStatus !== 'delivered';
  });

  const handleToggleDelivered = async (order) => {
    const isDelivered = (order.sellerDeliveryStatus || (order.status === 'delivered' ? 'delivered' : 'pending')) === 'delivered';

    setUpdatingOrderId(order._id);
    try {
      const response = await sellerAPI.updateOrderDeliveryStatus(order._id, !isDelivered);
      const updatedOrder = response.data;

      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder._id === order._id ? { ...currentOrder, ...updatedOrder } : currentOrder
      )));

      toast.success(!isDelivered ? 'Order marked as delivered' : 'Order marked as not delivered');
    } catch (error) {
      toast.error(error.message || 'Failed to update delivery status');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const handleDownloadDeliveryDetails = async (order) => {
    const labelElement = labelRefs.current?.[order._id];
    if (!labelElement) {
      toast.error('Delivery label is not ready yet. Please try again.');
      return;
    }

    setDownloadingOrderId(order._id);
    try {
      await generateAddressLabelPDF(labelElement, order.orderNumber);
      toast.success('Delivery details downloaded as PDF');
    } catch (error) {
      console.error('Seller PDF download error:', error);
      toast.error(error.message || 'Failed to download delivery details PDF');
    } finally {
      setDownloadingOrderId('');
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await sellerAPI.getOrders();
        setOrders(response.data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to load seller orders');
      }
    };

    loadOrders();
  }, []);

  return (
    <SellerShell title="Seller Orders" subtitle="Review only the order items that belong to your store.">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('delivered')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            statusFilter === 'delivered'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Delivered ({orders.filter((order) => (order.sellerDeliveryStatus || (order.status === 'delivered' ? 'delivered' : 'pending')) === 'delivered').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('not-delivered')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            statusFilter === 'not-delivered'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Not Delivered ({orders.filter((order) => (order.sellerDeliveryStatus || (order.status === 'delivered' ? 'delivered' : 'pending')) !== 'delivered').length})
        </button>
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          (() => {
            const sellerStatus = order.sellerDeliveryStatus || (order.status === 'delivered' ? 'delivered' : 'pending');
            return (
          <div key={order._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Ordered by <span className="font-semibold">{order.user?.name || order.shippingAddress?.name || 'Customer'}</span>
                </p>
              </div>
              <div className="text-sm text-slate-700">
                <div>Seller Revenue: <span className="font-semibold text-emerald-600">₹{order.sellerRevenue?.toLocaleString('en-IN') || 0}</span></div>
                <div>Platform Fee: <span className="font-semibold">₹{order.platformRevenue?.toLocaleString('en-IN') || 0}</span></div>
                <div>Items: <span className="font-semibold">{(order.items || []).length}</span></div>
                <div className="mt-1">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {sellerStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setExpandedOrderId((current) => (current === order._id ? '' : order._id))}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {expandedOrderId === order._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expandedOrderId === order._id ? 'Hide details' : 'View details'}
              </button>
            </div>

            {expandedOrderId === order._id && (
              <>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadDeliveryDetails(order)}
                    disabled={downloadingOrderId === order._id}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingOrderId === order._id ? 'Downloading PDF...' : 'Download delivery details (PDF)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDelivered(order)}
                    disabled={updatingOrderId === order._id}
                    className="ml-2 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {updatingOrderId === order._id
                      ? 'Updating...'
                      : sellerStatus === 'delivered'
                        ? 'Mark as Not Delivered'
                        : 'Mark as Delivered'}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer details</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{order.user?.name || order.shippingAddress?.name || 'Not provided'}</p>
                    <p className="mt-1 text-sm text-slate-600 break-all">{order.user?.email || 'Email not available'}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.shippingAddress?.phone || order.user?.phone || 'Phone not available'}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery address</p>
                    {order.shippingAddress ? (
                      <div className="mt-2 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.street}</p>
                        <p>
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Address not available for this order.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(order.items || []).map((item) => (
                    <div key={`${order._id}-${item.product}`} className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">Qty {item.quantity} • Commission {item.commissionPercentage}%</p>
                      </div>
                      <div className="text-left text-sm sm:text-right">
                        <div className="font-semibold text-slate-900">₹{item.sellerRevenue?.toLocaleString('en-IN') || 0}</div>
                        <div className="text-xs text-slate-500">Platform ₹{item.platformRevenue?.toLocaleString('en-IN') || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <AddressLabel ref={(element) => {
                if (element) {
                  labelRefs.current[order._id] = element;
                }
              }} order={order} />
            </div>
          </div>
            );
          })()
        ))}

        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No orders found for this filter.
          </div>
        )}
      </div>
    </SellerShell>
  );
}