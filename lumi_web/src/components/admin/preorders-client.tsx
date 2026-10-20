'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@/config/product';
import { ReauthModal } from '@/components/admin/reauth-modal';

interface PreorderRow {
  id: string;
  order_number: string;
  quantity: number;
  deposit_paise: number;
  total_paise: number;
  currency: string;
  payment_status: 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'abandoned';
  created_at: string;
  shipping_address: {
    fullName?: string;
    phone?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    addressLine1?: string;
  };
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  payments?: Array<{
    id: string;
    gateway: string;
    gateway_order_id: string;
    gateway_payment_id: string;
    amount_paise: number;
    status: string;
    method: string;
    signature_verified: boolean;
    verified_at: string;
  }>;
  order_status_history?: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
  }>;
}

type SortField = 'order_number' | 'customer' | 'date' | 'amount' | 'payment_status' | 'order_status';

export function PreordersClientPage() {
  const [orders, setOrders] = useState<PreorderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<PreorderRow | null>(null);

  // Status Change Dialog
  const [statusDialogOrder, setStatusDialogOrder] = useState<PreorderRow | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Refund Dialog & Re-auth
  const [refundDialogOrder, setRefundDialogOrder] = useState<PreorderRow | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setErrorMsg('Failed to load pre-orders directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchOrder = o.order_number.toLowerCase().includes(q);
        const matchName = o.profiles?.full_name?.toLowerCase().includes(q);
        const matchEmail = o.profiles?.email?.toLowerCase().includes(q);
        const matchAddrName = o.shipping_address?.fullName?.toLowerCase().includes(q);
        if (!matchOrder && !matchName && !matchEmail && !matchAddrName) return false;
      }

      if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;

      if (dateFilter !== 'all') {
        const days = dateFilter === '7d' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(o.created_at).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'order_number') {
        valA = a.order_number;
        valB = b.order_number;
      } else if (sortField === 'customer') {
        valA = a.profiles?.full_name || a.profiles?.email || '';
        valB = b.profiles?.full_name || b.profiles?.email || '';
      } else if (sortField === 'date') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        valA = a.deposit_paise;
        valB = b.deposit_paise;
      } else if (sortField === 'payment_status') {
        valA = a.payment_status;
        valB = b.payment_status;
      } else if (sortField === 'order_status') {
        valA = a.order_status;
        valB = b.order_status;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const promptStatusChange = (order: PreorderRow, newStatus: string) => {
    setStatusDialogOrder(order);
    setTargetStatus(newStatus);
    setStatusReason('');
    setDialogError(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialogOrder || !targetStatus) return;

    setStatusUpdating(true);
    setDialogError(null);

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: statusDialogOrder.id,
          action: 'update_status',
          newStatus: targetStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDialogError(data.error || 'Failed to update order status.');
        setStatusUpdating(false);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === statusDialogOrder.id
            ? {
                ...o,
                order_status: targetStatus as PreorderRow['order_status'],
              }
            : o
        )
      );

      if (selectedOrder?.id === statusDialogOrder.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, order_status: targetStatus as PreorderRow['order_status'] } : null
        );
      }

      setStatusDialogOrder(null);
    } catch {
      setDialogError('Network error while updating status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundDialogOrder) return;

    setRefundProcessing(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: refundDialogOrder.id,
          action: 'refund',
          reason: refundReason.trim() || 'Admin refund requested',
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.requireReauth) {
        setShowReauthModal(true);
        setRefundProcessing(false);
        return;
      }

      if (!res.ok) {
        alert(data.error || 'Failed to process refund.');
        setRefundProcessing(false);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === refundDialogOrder.id
            ? {
                ...o,
                order_status: 'cancelled',
                payment_status: 'refunded',
              }
            : o
        )
      );

      if (selectedOrder?.id === refundDialogOrder.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, order_status: 'cancelled', payment_status: 'refunded' } : null
        );
      }

      setRefundDialogOrder(null);
    } catch {
      alert('Network error while submitting refund.');
    } finally {
      setRefundProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <nav className="text-[12px] text-muted mb-1" aria-label="Breadcrumb">
            <span>Admin</span> / <span className="text-ink">Pre-orders</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] leading-[28px] sm:leading-[36px] font-semibold text-ink tracking-tight font-display">
              Pre-orders
            </h1>
            <span className="text-xs font-mono text-muted self-center">
              ({orders.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="px-3.5 py-1.5 bg-card border border-border text-ink hover:bg-canvas text-[12px] sm:text-[13px] font-medium rounded-[6px] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 sm:p-4 bg-card border border-border rounded-[8px] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 w-full md:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by order #, customer, or email..."
            className="w-full px-3 py-1.5 text-[13px] bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted focus:outline-none focus:border-[#6420AA]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by order status"
          >
            <option value="all">All order statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by payment status"
          >
            <option value="all">All payment statuses</option>
            <option value="paid">Paid</option>
            <option value="created">Created</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as 'all' | '7d' | '30d');
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by date range"
          >
            <option value="all">Date: All time</option>
            <option value="7d">Date: Last 7 days</option>
            <option value="30d">Date: Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted space-y-2">
            <div className="w-5 h-5 border-2 border-[#6420AA] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading pre-orders...</p>
          </div>
        ) : paginatedOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[13px] sm:text-[14px] leading-[20px] border-collapse">
              <thead className="bg-[#F1EFF8]/50 border-b border-border sticky top-0 z-10">
                <tr className="h-10 text-[12px] text-muted font-medium select-none">
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('order_number')}
                    aria-sort={sortField === 'order_number' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Order number {sortField === 'order_number' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('customer')}
                    aria-sort={sortField === 'customer' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Customer {sortField === 'customer' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('date')}
                    aria-sort={sortField === 'date' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 text-center">Qty</th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('amount')}
                    aria-sort={sortField === 'amount' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Deposit {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('payment_status')}
                    aria-sort={sortField === 'payment_status' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Payment {sortField === 'payment_status' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('order_status')}
                    aria-sort={sortField === 'order_status' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Order status {sortField === 'order_status' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedOrders.map((order) => {
                  const paymentPaid = order.payment_status === 'paid';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`h-12 hover:bg-canvas transition-colors cursor-pointer ${
                        selectedOrder?.id === order.id ? 'bg-[#6420AA]/5' : ''
                      }`}
                    >
                      <td className="px-4 font-mono text-[13px] text-ink font-medium">
                        {order.order_number}
                      </td>
                      <td className="px-4">
                        <span className="block font-medium text-ink">
                          {order.shipping_address?.fullName ||
                            order.profiles?.full_name ||
                            'Customer'}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {order.profiles?.email || '—'}
                        </span>
                      </td>
                      <td className="px-4 text-[12px] text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 text-center font-mono text-[13px] text-ink">
                        {order.quantity}
                      </td>
                      <td className="px-4 text-right font-mono text-[13px] text-ink [font-variant-numeric:tabular-nums]">
                        {formatPrice(order.deposit_paise)}
                      </td>
                      <td className="px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium capitalize ${
                            paymentPaid
                              ? 'bg-[#E6F4EE] text-[#12805C]'
                              : order.payment_status === 'refunded'
                              ? 'bg-[#F1EFF8] text-[#5B5670]'
                              : order.payment_status === 'failed'
                              ? 'bg-[#FDECEA] text-[#B42318]'
                              : 'bg-[#FFF3D6] text-[#8A5A00]'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td
                        className="px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={order.order_status}
                          onChange={(e) => promptStatusChange(order, e.target.value)}
                          className="px-2 py-1 text-[11px] bg-canvas border border-border rounded-[4px] text-ink font-medium capitalize focus:outline-none"
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="text-[12px] text-[#6420AA] hover:underline font-medium"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2 p-6">
            <p className="text-[14px] font-semibold text-ink">No matching pre-orders found</p>
            <p className="text-[12px] text-muted max-w-sm mx-auto">
              No orders matched your current filters. Orders appear after a customer initiates or completes checkout.
            </p>
          </div>
        )}

        {/* Pagination */}
        {sortedOrders.length > pageSize && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-muted">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, sortedOrders.length)} of {sortedOrders.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-card border border-border rounded-[4px] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-card border border-border rounded-[4px] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right-Side Order Detail Drawer */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-[1px]"
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-y-0 right-0 max-w-full sm:max-w-md w-full bg-card border-l border-border shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink font-mono">
                    {selectedOrder.order_number}
                  </h3>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium capitalize ${
                      selectedOrder.payment_status === 'paid'
                        ? 'bg-[#E6F4EE] text-[#12805C]'
                        : 'bg-[#FFF3D6] text-[#8A5A00]'
                    }`}
                  >
                    {selectedOrder.payment_status}
                  </span>
                </div>
                <p className="text-[12px] text-muted mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-muted hover:text-ink rounded-[4px]"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 sm:space-y-6">
              {/* Customer Info */}
              <div className="p-4 bg-canvas border border-border rounded-[8px] space-y-2">
                <h4 className="text-[13px] font-semibold text-ink">Customer</h4>
                <p className="text-[14px] font-medium text-ink">
                  {selectedOrder.shipping_address?.fullName ||
                    selectedOrder.profiles?.full_name ||
                    'Customer'}
                </p>
                <p className="text-[12px] text-muted">{selectedOrder.profiles?.email}</p>
                {selectedOrder.shipping_address?.phone && (
                  <p className="text-[12px] text-ink font-mono">
                    {selectedOrder.shipping_address.phone}
                  </p>
                )}
              </div>

              {/* Delivery Address */}
              <div className="p-4 bg-canvas border border-border rounded-[8px] space-y-1">
                <h4 className="text-[13px] font-semibold text-ink mb-1.5">Shipping Address</h4>
                <p className="text-[12px] text-ink">
                  {selectedOrder.shipping_address?.addressLine1 || 'No address line provided'}
                </p>
                <p className="text-[12px] text-ink">
                  {[
                    selectedOrder.shipping_address?.city,
                    selectedOrder.shipping_address?.state,
                    selectedOrder.shipping_address?.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>

              {/* Payment Details */}
              <div className="space-y-2">
                <h4 className="text-[14px] font-semibold text-ink">Payment Records</h4>
                {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-canvas border border-border rounded-[6px] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink uppercase text-[11px]">
                            {p.gateway} gateway
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium ${
                              p.status === 'paid'
                                ? 'bg-[#E6F4EE] text-[#12805C]'
                                : 'bg-[#FFF3D6] text-[#8A5A00]'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-muted truncate">
                          ID: {p.gateway_payment_id || p.gateway_order_id || p.id}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                          <span>Method: {p.method || 'UPI/Card'}</span>
                          <span>Verified: {p.signature_verified ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No gateway payment record linked.</p>
                )}
              </div>

              {/* Status History */}
              <div className="space-y-2">
                <h4 className="text-[14px] font-semibold text-ink">Audit & Status History</h4>
                {selectedOrder.order_status_history &&
                selectedOrder.order_status_history.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.order_status_history.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 bg-canvas border border-border rounded-[6px] text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-medium text-ink">
                          <span>
                            {h.from_status ? `${h.from_status} → ` : ''}
                            <strong className="text-[#6420AA]">{h.to_status}</strong>
                          </span>
                          <span className="text-[10px] text-muted font-mono">
                            {new Date(h.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {h.note && <p className="text-[11px] text-muted">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No previous status transitions recorded.</p>
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-border bg-card space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => promptStatusChange(selectedOrder, 'processing')}
                  disabled={selectedOrder.payment_status !== 'paid'}
                  className="flex-1 py-2 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-40"
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => setRefundDialogOrder(selectedOrder)}
                  disabled={selectedOrder.payment_status !== 'paid'}
                  className="px-4 py-2 bg-[#FDECEA] hover:bg-[#FECDCA] text-[#B42318] text-xs font-medium rounded-[6px] transition-colors disabled:opacity-40"
                >
                  Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Dialog */}
      {statusDialogOrder && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card border border-border rounded-[8px] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-[18px] leading-[28px] font-semibold text-ink">
                Confirm Status Transition
              </h3>
              <p className="text-[12px] text-muted mt-1">
                Updating order <strong className="font-mono text-ink">{statusDialogOrder.order_number}</strong> from{' '}
                <span className="text-muted font-medium">{statusDialogOrder.order_status}</span> to{' '}
                <span className="text-[#6420AA] font-semibold">{targetStatus}</span>.
              </p>
            </div>

            {dialogError && (
              <div className="p-2.5 rounded-[6px] bg-[#FDECEA] border border-[#FECDCA] text-xs text-[#B42318]">
                {dialogError}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-ink mb-1">
                Reason / Internal audit note (optional)
              </label>
              <textarea
                rows={2}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Operational reason for changing this order's status..."
                className="w-full p-2.5 text-xs bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted focus:outline-none focus:border-[#6420AA]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusDialogOrder(null)}
                disabled={statusUpdating}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={statusUpdating}
                className="px-4 py-2 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
              >
                {statusUpdating ? 'Updating...' : 'Confirm change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Dialog */}
      {refundDialogOrder && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card border border-border rounded-[8px] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-[18px] leading-[28px] font-semibold text-[#B42318]">
                Issue Pre-order Refund
              </h3>
              <p className="text-[12px] text-muted mt-1 leading-relaxed">
                You are about to issue a full deposit refund of{' '}
                <strong className="text-ink font-mono">{formatPrice(refundDialogOrder.deposit_paise)}</strong> for order{' '}
                <strong className="font-mono text-ink">{refundDialogOrder.order_number}</strong>. This action cancels the order and writes an immutable event to the audit trail.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink mb-1">
                Mandatory refund reason
              </label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer cancelled via support request #1042"
                className="w-full px-3 py-2 text-xs bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#B42318]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundDialogOrder(null)}
                disabled={refundProcessing}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refundProcessing || !refundReason.trim()}
                className="px-4 py-2 bg-[#B42318] hover:bg-[#911C13] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
              >
                {refundProcessing ? 'Processing refund...' : 'Execute refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reauth Modal for Refund */}
      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleConfirmRefund}
        actionTitle="Authorize customer refund"
      />
    </div>
  );
}
