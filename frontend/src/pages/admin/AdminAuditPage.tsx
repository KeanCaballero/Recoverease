import { useEffect, useState, useCallback } from 'react';
import { Search, ScrollText, Filter } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { AuditLog } from '../../types';
import { Card, Input, Badge, Spinner, EmptyState, Button } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';

const ACTION_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  LOGIN: 'info', CREATE: 'success', UPDATE: 'warning', DELETE: 'danger',
  DEACTIVATE: 'danger', REACTIVATE: 'success', PASSWORD_CHANGE: 'warning',
  CONSENT_ACCEPTED: 'success', PASSWORD_RESET_REQUEST: 'warning',
};

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  DEACTIVATE: 'bg-red-100 text-red-700',
  REACTIVATE: 'bg-green-100 text-green-700',
};

interface LogResponse { logs: AuditLog[]; total: number; page: number; limit: number; }

export default function AdminAuditPage() {
  const [data, setData] = useState<LogResponse>({ logs: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entity: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiGet<LogResponse>('/audit', {
        page, limit: 50,
        ...(filters.action && { action: filters.action }),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      setData(result);
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.total / data.limit);
  const setF = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">{data.total.toLocaleString()} total entries</p>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <Filter size={14} /> Filters
        </div>
        <div className="flex-1 min-w-32">
          <Input placeholder="Action (e.g. CREATE)" value={filters.action} onChange={setF('action')} />
        </div>
        <div className="flex-1 min-w-32">
          <Input placeholder="Entity (e.g. doctor)" value={filters.entity} onChange={setF('entity')} />
        </div>
        <div className="flex-1 min-w-36">
          <Input type="date" placeholder="From date" value={filters.from} onChange={setF('from')} />
        </div>
        <div className="flex-1 min-w-36">
          <Input type="date" placeholder="To date" value={filters.to} onChange={setF('to')} />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setFilters({ action: '', entity: '', from: '', to: '' }); setPage(1); }}>
          Clear
        </Button>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !data.logs.length ? (
          <EmptyState icon={<ScrollText size={40} />} title="No audit logs found" description="Try adjusting your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.logs.map(log => (
                  <tr key={log.auditLogId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(log.auditLogTimestamp)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{log.user?.userEmail ?? `User #${log.userId}`}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={log.user?.userRole === 'admin' ? 'danger' : log.user?.userRole === 'doctor' ? 'default' : 'info'}>
                        {log.user?.userRole ?? '–'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLOR[log.auditLogAction] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.auditLogAction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{log.auditLogEntity}{log.auditLogEntityId ? ` #${log.auditLogEntityId}` : ''}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{log.auditLogDetails ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
