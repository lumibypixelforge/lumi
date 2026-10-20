'use client';

import { useState, useEffect, useMemo } from 'react';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
}

function formatActionName(action: string): string {
  const map: Record<string, string> = {
    payment_verified: 'Payment verified',
    admin_signed_in: 'Admin signed in',
    admin_signed_out: 'Admin signed out',
    admin_reauthenticated: 'Admin re-authenticated',
    admin_login_failed: 'Sign-in attempt failed',
    admin_login_rate_limited: 'Sign-in rate limited',
    admin_unauthorized_access_attempt: 'Unauthorized access blocked',
    admin_exported_csv: 'Exported customer CSV',
    admin_updated_settings: 'Store settings updated',
    admin_updated_order_status: 'Order status changed',
    admin_issued_refund: 'Refund issued',
    admin_resent_confirmation: 'Confirmation resent',
    added_customer_note: 'Internal note added',
    updated_customer_follow_up: 'Follow-up status updated',
  };

  if (map[action]) return map[action];
  return action
    .replace(/^admin_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDiffValue(key: string, val: unknown): { text: string; isTest?: boolean; isMasked?: boolean } {
  if (val === null || val === undefined) return { text: '—' };

  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes('password') ||
    lowerKey.includes('secret') ||
    lowerKey.includes('token') ||
    lowerKey.includes('key')
  ) {
    return { text: '••••••••', isMasked: true };
  }

  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  const isTest = str.includes('mock') || str.startsWith('pay_mock') || str.startsWith('order_mock');

  return { text: str, isTest };
}

export function AuditClientPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionOptions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action))).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.entity))).sort();
  }, [logs]);

  const actorOptions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.actor || 'System'))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (entityFilter !== 'all' && l.entity !== entityFilter) return false;
      const actorLabel = l.actor || 'System';
      if (actorFilter !== 'all' && actorLabel !== actorFilter) return false;

      if (dateFilter !== 'all') {
        const days = dateFilter === '7d' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(l.created_at).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [logs, actionFilter, entityFilter, actorFilter, dateFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <nav className="text-[12px] text-muted mb-1" aria-label="Breadcrumb">
            <span>Admin</span> / <span className="text-ink">Audit log</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] leading-[28px] sm:leading-[36px] font-semibold text-ink tracking-tight font-display">
              Audit log
            </h1>
            <span className="text-xs font-mono text-muted self-center">
              ({logs.length})
            </span>
          </div>
          <p className="text-[12px] text-muted mt-0.5">
            Cryptographically sealed and immutable log of all operational mutations and security actions. Read-only.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-1.5 bg-card border border-border text-ink hover:bg-canvas text-[12px] sm:text-[13px] font-medium rounded-[6px] transition-colors self-start sm:self-auto shrink-0"
        >
          Refresh log
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 sm:p-4 bg-card border border-border rounded-[8px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
          aria-label="Filter by action"
        >
          <option value="all">All actions</option>
          {actionOptions.map((act) => (
            <option key={act} value={act}>
              {formatActionName(act)}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
          aria-label="Filter by entity"
        >
          <option value="all">All entities</option>
          {entityOptions.map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
          aria-label="Filter by actor"
        >
          <option value="all">All actors</option>
          {actorOptions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as 'all' | '7d' | '30d')}
          className="w-full px-2.5 py-1.5 text-[12px] bg-canvas border border-border rounded-[6px] text-ink focus:outline-none"
          aria-label="Filter by date range"
        >
          <option value="all">Time: All history</option>
          <option value="7d">Time: Last 7 days</option>
          <option value="30d">Time: Last 30 days</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted space-y-2">
            <div className="w-5 h-5 border-2 border-[#6420AA] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading audit trail...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px] sm:text-[14px] leading-[20px] border-collapse">
              <thead className="bg-[#F1EFF8]/50 border-b border-border sticky top-0 z-10">
                <tr className="h-10 text-[12px] text-muted font-medium select-none">
                  <th className="px-4">Time</th>
                  <th className="px-4">Actor</th>
                  <th className="px-4">Action</th>
                  <th className="px-4">Entity</th>
                  <th className="px-4">Summary</th>
                  <th className="px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const actorText = log.actor || 'System';

                  let summary = 'Operational event recorded';
                  if (log.after_value) {
                    if (log.action === 'payment_verified') {
                      summary = `Payment verified (${log.after_value.payment_id || 'paid'})`;
                    } else if (log.action === 'admin_signed_in') {
                      summary = `MFA second-factor verified`;
                    } else if (log.action === 'admin_exported_csv') {
                      summary = `Exported ${log.after_value.exportedRows || 0} customer records`;
                    } else if (log.action === 'admin_updated_order_status') {
                      summary = `Status set to ${log.after_value.order_status}`;
                    } else if (log.action === 'admin_updated_settings') {
                      summary = 'Store settings configuration saved';
                    }
                  }

                  const allKeys = Array.from(
                    new Set([
                      ...Object.keys(log.before_value || {}),
                      ...Object.keys(log.after_value || {}),
                    ])
                  ).filter((k) => k !== '_metadata');

                  return (
                    <tr key={log.id} className="group">
                      <td colSpan={6} className="p-0">
                        <div
                          onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                          className={`flex items-center h-12 px-4 hover:bg-canvas transition-colors cursor-pointer ${
                            isExpanded ? 'bg-[#6420AA]/5' : ''
                          }`}
                        >
                          <div
                            className="w-28 text-[12px] text-muted shrink-0"
                            title={new Date(log.created_at).toLocaleString('en-IN', {
                              dateStyle: 'full',
                              timeStyle: 'medium',
                            })}
                          >
                            {formatRelativeTime(log.created_at)}
                          </div>

                          <div className="w-48 text-[13px] text-ink font-medium truncate shrink-0 pr-3">
                            <span className={log.actor ? 'text-ink' : 'text-muted italic'}>
                              {actorText}
                            </span>
                          </div>

                          <div className="w-52 shrink-0 pr-3">
                            <span className="text-[12px] font-medium px-2 py-0.5 rounded-[4px] bg-[#F1EFF8] text-[#5B5670]">
                              {formatActionName(log.action)}
                            </span>
                          </div>

                          <div className="w-44 shrink-0 flex items-center gap-1.5 pr-3">
                            <span className="text-[11px] font-mono uppercase bg-card border border-border px-1.5 py-0.5 rounded-[4px] text-muted shrink-0">
                              {log.entity}
                            </span>
                            {log.entity_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(log.entity_id!, log.id);
                                }}
                                className="font-mono text-[11px] text-muted hover:text-ink truncate max-w-[80px]"
                                title={`Click to copy ID: ${log.entity_id}`}
                              >
                                {log.entity_id.slice(0, 8)}...
                                <span className="ml-1 text-[10px]">
                                  {copiedId === log.id ? '✓' : '⧉'}
                                </span>
                              </button>
                            )}
                          </div>

                          <div className="flex-1 text-[12px] text-muted truncate pr-3">
                            {summary}
                          </div>

                          <div className="shrink-0 text-muted group-hover:text-ink text-xs">
                            {isExpanded ? '▲ Hide diff' : '▼ Diff'}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 py-4 bg-canvas border-t border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-ink">
                                Field-by-field before and after diff
                              </span>
                              <span className="text-[11px] font-mono text-muted">
                                Exact timestamp: {new Date(log.created_at).toISOString()}
                              </span>
                            </div>

                            {allKeys.length > 0 ? (
                              <div className="border border-border rounded-[6px] overflow-hidden bg-card">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#F1EFF8]/50 border-b border-border">
                                    <tr className="h-8 text-[11px] text-muted font-medium">
                                      <th className="px-3 w-40">Field</th>
                                      <th className="px-3 w-1/2">Before value</th>
                                      <th className="px-3 w-1/2">After value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border font-mono text-[12px]">
                                    {allKeys.map((key) => {
                                      const before = formatDiffValue(
                                        key,
                                        log.before_value?.[key]
                                      );
                                      const after = formatDiffValue(
                                        key,
                                        log.after_value?.[key]
                                      );

                                      return (
                                        <tr key={key} className="h-8">
                                          <td className="px-3 text-ink font-sans font-medium text-[11px]">
                                            {key}
                                          </td>
                                          <td className="px-3 text-muted">
                                            {before.text}
                                          </td>
                                          <td className="px-3 text-[#12805C] flex items-center gap-2">
                                            <span>{after.text}</span>
                                            {after.isTest && (
                                              <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-[#FFF3D6] text-[#8A5A00] font-sans font-medium">
                                                Test
                                              </span>
                                            )}
                                            {after.isMasked && (
                                              <span className="text-[10px] text-muted font-sans italic">
                                                (masked)
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-muted">
                                No state modification recorded for this entry.
                              </p>
                            )}

                            {Boolean(log.after_value?._metadata) && (
                              <div className="pt-2 text-[11px] text-muted font-mono flex items-center gap-4">
                                <span>
                                  IP:{' '}
                                  {String(
                                    (log.after_value?._metadata as Record<string, unknown>)?.ip ||
                                      'unknown'
                                  )}
                                </span>
                                <span className="truncate max-w-sm">
                                  UA:{' '}
                                  {String(
                                    (log.after_value?._metadata as Record<string, unknown>)
                                      ?.userAgent || 'unknown'
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2 p-6">
            <p className="text-[14px] font-semibold text-ink">No audit entries found</p>
            <p className="text-[12px] text-muted max-w-sm mx-auto">
              No audit logs matched your current filters. Operational events are written automatically on every change.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
