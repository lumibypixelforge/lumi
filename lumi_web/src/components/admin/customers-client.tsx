'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@/config/product';
import { ReauthModal } from '@/components/admin/reauth-modal';

interface CustomerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  segment: 'confirmed_buyer' | 'interested' | 'prospect';
  marketing_consent: boolean | null;
  marketing_consent_at: string | null;
  paid_order_count: number | null;
  total_order_count: number | null;
  engagement_score: number | null;
  signup_source?: Record<string, string> | null;
  created_at: string | null;
  last_login_at: string | null;
}

interface NoteItem {
  id: string;
  note: string;
  created_at: string;
}

interface CustomerDetail {
  customer: CustomerRow;
  notes: NoteItem[];
  followUp: { status: string; next_action_at?: string } | null;
  orders: Array<{
    id: string;
    order_number: string;
    quantity: number;
    deposit_paise: number;
    payment_status: string;
    order_status: string;
    created_at: string;
  }>;
}

type SortField =
  | 'customer'
  | 'phone'
  | 'segment'
  | 'orders'
  | 'engagement'
  | 'consent'
  | 'created_at';

export function CustomersClientPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [segmentTab, setSegmentTab] = useState<'all' | 'confirmed_buyer' | 'interested' | 'prospect'>('all');
  const [consentFilter, setConsentFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'has_phone' | 'no_phone'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('new');
  const [savingNote, setSavingNote] = useState(false);

  // Re-auth modal for CSV export
  const [showReauthModal, setShowReauthModal] = useState(false);

  // Engagement tooltip
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/customers', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load customers');
      }
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setErrorMsg('Failed to load customer directory. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch Drawer Detail
  useEffect(() => {
    if (!selectedCustomerId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/customers/${selectedCustomerId}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
          setFollowUpStatus(data.followUp?.status || 'new');
        }
      } catch {
        // Failed
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetail();
  }, [selectedCustomerId]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: customers.length, confirmed_buyer: 0, interested: 0, prospect: 0 };
    customers.forEach((c) => {
      if (counts[c.segment] !== undefined) {
        counts[c.segment]++;
      }
    });
    return counts;
  }, [customers]);

  // Filtered and Sorted customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (segmentTab !== 'all' && c.segment !== segmentTab) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = c.full_name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      if (consentFilter === 'yes' && !c.marketing_consent) return false;
      if (consentFilter === 'no' && c.marketing_consent) return false;

      if (phoneFilter === 'has_phone' && !c.phone) return false;
      if (phoneFilter === 'no_phone' && c.phone) return false;

      if (dateFilter !== 'all' && c.created_at) {
        const days = dateFilter === '7d' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(c.created_at).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [customers, segmentTab, search, consentFilter, phoneFilter, dateFilter]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'customer') {
        valA = a.full_name || a.email || '';
        valB = b.full_name || b.email || '';
      } else if (sortField === 'phone') {
        valA = a.phone || '';
        valB = b.phone || '';
      } else if (sortField === 'segment') {
        valA = a.segment;
        valB = b.segment;
      } else if (sortField === 'orders') {
        valA = a.paid_order_count || 0;
        valB = b.paid_order_count || 0;
      } else if (sortField === 'engagement') {
        valA = a.engagement_score || 0;
        valB = b.engagement_score || 0;
      } else if (sortField === 'consent') {
        valA = a.marketing_consent ? 1 : 0;
        valB = b.marketing_consent ? 1 : 0;
      } else if (sortField === 'created_at') {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0;
        valB = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
  const paginatedCustomers = sortedCustomers.slice(
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !newNote.trim()) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', note: newNote.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setDetail((prev) =>
          prev ? { ...prev, notes: [data.note, ...prev.notes] } : null
        );
        setNewNote('');
      }
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateFollowUp = async (newStatus: string) => {
    if (!selectedCustomerId) return;
    setFollowUpStatus(newStatus);

    await fetch(`/api/admin/customers/${selectedCustomerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_follow_up', followUpStatus: newStatus }),
    });
  };

  const handleExportConsented = async () => {
    try {
      const res = await fetch('/api/admin/export?consented=true');
      if (res.status === 403) {
        const data = await res.json();
        if (data.requireReauth) {
          setShowReauthModal(true);
          return;
        }
      }

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumi_customers_consented_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      alert('Failed to export CSV. Please re-authenticate.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-[12px] text-muted mb-1" aria-label="Breadcrumb">
            <span>Admin</span> / <span className="text-ink">Customers</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] leading-[36px] font-semibold text-ink tracking-tight font-display">
              Customers
            </h1>
            <span className="text-xs font-mono text-muted self-center">
              ({customers.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            className="px-3.5 py-1.5 bg-card border border-border text-ink hover:bg-canvas text-[13px] font-medium rounded-[6px] transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleExportConsented}
            className="px-3.5 py-1.5 bg-[#6420AA] hover:bg-[#52198D] text-white text-[13px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export consented (CSV)</span>
          </button>
        </div>
      </div>

      {/* Segmented Tabs with Counts */}
      <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-[8px] overflow-x-auto no-scrollbar">
        {(
          [
            { key: 'all', label: 'All', count: tabCounts.all },
            { key: 'confirmed_buyer', label: 'Confirmed buyers', count: tabCounts.confirmed_buyer },
            { key: 'interested', label: 'Interested', count: tabCounts.interested },
            { key: 'prospect', label: 'Prospects', count: tabCounts.prospect },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSegmentTab(tab.key);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-[12px] sm:text-[13px] font-medium rounded-[6px] transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              segmentTab === tab.key
                ? 'bg-[#6420AA] text-white'
                : 'text-muted hover:text-ink hover:bg-canvas'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-[4px] font-mono ${
                segmentTab === tab.key ? 'bg-white/20 text-white' : 'bg-border/60 text-muted'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3.5 sm:p-4 bg-card border border-border rounded-[8px] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 w-full md:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by customer name, email, or phone number..."
            className="w-full px-3 py-1.5 text-[13px] bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted focus:outline-none focus:border-[#6420AA]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={consentFilter}
            onChange={(e) => {
              setConsentFilter(e.target.value as 'all' | 'yes' | 'no');
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by marketing consent"
          >
            <option value="all">Consent: All</option>
            <option value="yes">Consent: Opted-in</option>
            <option value="no">Consent: Declined</option>
          </select>

          <select
            value={phoneFilter}
            onChange={(e) => {
              setPhoneFilter(e.target.value as 'all' | 'has_phone' | 'no_phone');
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by phone existence"
          >
            <option value="all">Phone: All</option>
            <option value="has_phone">Has phone</option>
            <option value="no_phone">No phone</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as 'all' | '7d' | '30d');
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
            aria-label="Filter by joined date"
          >
            <option value="all">Joined: All time</option>
            <option value="7d">Joined: Last 7 days</option>
            <option value="30d">Joined: Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 bg-[#FDECEA] border border-[#FECDCA] rounded-[8px] flex items-center justify-between text-xs text-[#B42318]">
          <span>{errorMsg}</span>
          <button
            onClick={fetchCustomers}
            className="underline font-semibold hover:text-[#B42318]/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Customers Table */}
      <div className="bg-card border border-border rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted space-y-2">
            <div className="w-5 h-5 border-2 border-[#6420AA] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading customer directory...</p>
          </div>
        ) : paginatedCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-[13px] sm:text-[14px] leading-[20px] border-collapse">
              <thead className="bg-[#F1EFF8]/50 border-b border-border sticky top-0 z-10">
                <tr className="h-10 text-[12px] text-muted font-medium select-none">
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('customer')}
                    aria-sort={sortField === 'customer' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Customer {sortField === 'customer' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('phone')}
                    aria-sort={sortField === 'phone' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Phone {sortField === 'phone' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('segment')}
                    aria-sort={sortField === 'segment' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Segment {sortField === 'segment' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink text-right"
                    onClick={() => handleSort('orders')}
                    aria-sort={sortField === 'orders' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Orders {sortField === 'orders' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink text-right relative"
                    onClick={() => handleSort('engagement')}
                    aria-sort={sortField === 'engagement' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      Engagement {sortField === 'engagement' && (sortAsc ? '↑' : '↓')}
                      <span
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setShowScoreTooltip(true);
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          setShowScoreTooltip(false);
                        }}
                        className="text-muted hover:text-ink cursor-help text-[11px]"
                      >
                        ℹ
                      </span>
                    </span>

                    {showScoreTooltip && (
                      <div className="absolute right-4 top-8 z-30 p-2.5 bg-ink text-white text-[11px] font-normal rounded-[4px] shadow-lg max-w-[220px] text-left leading-normal">
                        Score weights: View pricing (+1), Click preorder (+2), Start checkout (+3), Payment (+5) over 30 days.
                      </div>
                    )}
                  </th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('consent')}
                    aria-sort={sortField === 'consent' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Marketing consent {sortField === 'consent' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4">Source</th>
                  <th
                    className="px-4 cursor-pointer hover:text-ink"
                    onClick={() => handleSort('created_at')}
                    aria-sort={sortField === 'created_at' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    Joined {sortField === 'created_at' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCustomers.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`h-12 hover:bg-canvas transition-colors cursor-pointer ${
                        selectedCustomerId === c.id ? 'bg-[#6420AA]/5' : ''
                      }`}
                    >
                      <td className="px-4">
                        <span className="block font-medium text-ink">
                          {c.full_name || 'Anonymous User'}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {c.email || '—'}
                        </span>
                      </td>
                      <td className="px-4 text-[13px] text-muted">
                        {c.phone || <span className="text-muted/40">—</span>}
                      </td>
                      <td className="px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${
                            c.segment === 'confirmed_buyer'
                              ? 'bg-[#E6F4EE] text-[#12805C]'
                              : c.segment === 'interested'
                              ? 'bg-[#FFF3D6] text-[#8A5A00]'
                              : 'bg-[#F1EFF8] text-[#5B5670]'
                          }`}
                        >
                          {c.segment === 'confirmed_buyer'
                            ? 'Confirmed buyer'
                            : c.segment === 'interested'
                            ? 'Interested'
                            : 'Prospect'}
                        </span>
                      </td>
                      <td className="px-4 text-right font-mono text-[13px] text-ink [font-variant-numeric:tabular-nums]">
                        {c.paid_order_count || 0}
                      </td>
                      <td className="px-4 text-right font-mono text-[13px] text-ink [font-variant-numeric:tabular-nums]">
                        {c.engagement_score || 0} pts
                      </td>
                      <td className="px-4 text-[13px]">
                        <span
                          title={
                            c.marketing_consent_at
                              ? `Consented on ${new Date(c.marketing_consent_at).toLocaleString()}`
                              : 'No consent recorded'
                          }
                          className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${
                            c.marketing_consent
                              ? 'bg-[#E6F4EE] text-[#12805C]'
                              : 'bg-[#F1EFF8] text-[#5B5670]'
                          }`}
                        >
                          {c.marketing_consent ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 text-[12px] text-muted">
                        {c.signup_source?.utm_source || 'direct'}
                      </td>
                      <td className="px-4 text-[12px] text-muted">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerId(c.id);
                          }}
                          className="text-[12px] text-[#6420AA] hover:underline font-medium"
                        >
                          Drawer →
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
            <p className="text-[14px] font-semibold text-ink">No matching customers found</p>
            <p className="text-[12px] text-muted max-w-sm mx-auto">
              No registered profiles match your current search or segment filter. Try adjusting your filter parameters.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {sortedCustomers.length > pageSize && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-muted">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, sortedCustomers.length)} of{' '}
              {sortedCustomers.length}
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

      {/* Right-Side Detail Drawer */}
      {selectedCustomerId && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-[1px]"
          onClick={() => setSelectedCustomerId(null)}
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
                <h3 className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink">
                  Customer Profile
                </h3>
                <p className="text-[12px] text-muted">
                  Detailed timeline, internal notes, and orders
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-muted hover:text-ink rounded-[4px]"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 sm:space-y-6">
              {detailLoading || !detail ? (
                <div className="py-12 text-center text-xs text-muted">
                  Loading customer history...
                </div>
              ) : (
                <>
                  {/* Identity & Direct Contact Actions */}
                  <div className="p-4 bg-canvas border border-border rounded-[8px] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-[15px] font-semibold text-ink">
                          {detail.customer.full_name || 'Anonymous User'}
                        </h4>
                        <p className="text-[12px] text-muted">{detail.customer.email}</p>
                        {detail.customer.phone && (
                          <p className="text-[12px] text-ink font-mono mt-0.5">
                            {detail.customer.phone}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${
                          detail.customer.segment === 'confirmed_buyer'
                            ? 'bg-[#E6F4EE] text-[#12805C]'
                            : detail.customer.segment === 'interested'
                            ? 'bg-[#FFF3D6] text-[#8A5A00]'
                            : 'bg-[#F1EFF8] text-[#5B5670]'
                        }`}
                      >
                        {detail.customer.segment}
                      </span>
                    </div>

                    {/* Direct Contact Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      {detail.customer.email && (
                        <a
                          href={`mailto:${detail.customer.email}`}
                          className="px-2.5 py-1 text-[11px] font-medium bg-card border border-border rounded-[4px] text-ink hover:bg-canvas no-underline"
                        >
                          ✉ Email
                        </a>
                      )}
                      {detail.customer.phone && (
                        <>
                          <a
                            href={`tel:${detail.customer.phone}`}
                            className="px-2.5 py-1 text-[11px] font-medium bg-card border border-border rounded-[4px] text-ink hover:bg-canvas no-underline"
                          >
                            📞 Call
                          </a>
                          <a
                            href={`https://wa.me/${detail.customer.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] font-medium bg-[#E6F4EE] border border-[#A6E1CA] rounded-[4px] text-[#12805C] no-underline"
                          >
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Status */}
                  <div className="p-4 bg-card border border-border rounded-[8px] space-y-2">
                    <label className="block text-[13px] font-medium text-ink">
                      Follow-up status
                    </label>
                    <select
                      value={followUpStatus}
                      onChange={(e) => handleUpdateFollowUp(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
                    >
                      <option value="new">New lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="not_interested">Not interested</option>
                    </select>
                  </div>

                  {/* Orders and Payments */}
                  <div className="space-y-2">
                    <h4 className="text-[14px] font-semibold text-ink">
                      Pre-orders ({detail.orders.length})
                    </h4>
                    {detail.orders.length > 0 ? (
                      <div className="space-y-2">
                        {detail.orders.map((o) => (
                          <div
                            key={o.id}
                            className="p-3 bg-canvas border border-border rounded-[6px] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-mono font-medium text-ink">
                              <span>{o.order_number}</span>
                              <span>{formatPrice(o.deposit_paise)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted">
                              <span className="capitalize">{o.payment_status}</span>
                              <span>{new Date(o.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No pre-orders recorded.</p>
                    )}
                  </div>

                  {/* Internal Operational Notes */}
                  <div className="space-y-3">
                    <h4 className="text-[14px] font-semibold text-ink">
                      Internal Notes
                    </h4>

                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write an operational note about this customer..."
                        className="w-full p-2.5 text-xs bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted focus:outline-none focus:border-[#6420AA]"
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim()}
                        className="px-3 py-1.5 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[4px] disabled:opacity-50 transition-colors"
                      >
                        {savingNote ? 'Saving note...' : 'Add Note'}
                      </button>
                    </form>

                    <div className="space-y-2 pt-2">
                      {detail.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 bg-canvas border border-border rounded-[6px] text-xs space-y-1"
                        >
                          <p className="text-ink">{n.note}</p>
                          <p className="text-[10px] text-muted font-mono">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-auth Modal for CSV export */}
      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleExportConsented}
        actionTitle="Authorize customer CSV export"
      />
    </div>
  );
}
