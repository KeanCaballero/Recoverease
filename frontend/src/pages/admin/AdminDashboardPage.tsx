import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, MessageSquare, AlertTriangle, ArrowRight, ScrollText } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { AdminDashboard, AuditLog } from '../../types';
import { Card, CardHeader, CardTitle, StatCard, Badge, LoadingPage, EmptyState } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';

const ACTION_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  LOGIN: 'default', CREATE: 'success', UPDATE: 'warning', DELETE: 'danger',
  DEACTIVATE: 'danger', REACTIVATE: 'success',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AdminDashboard>('/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPage />;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">System Administration</h1>
        <p className="text-sm text-gray-500">RecoverEase platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Doctors"   value={data?.doctorCount ?? 0}   icon={<UserCheck size={20} />}      color="blue" />
        <StatCard label="Total Patients"  value={data?.patientCount ?? 0}  icon={<Users size={20} />}          color="green" />
        <StatCard label="Chat Sessions"   value={data?.chatSessions ?? 0}  icon={<MessageSquare size={20} />}  color="teal" />
        <StatCard label="Critical Alerts" value={data?.criticalAlerts ?? 0} icon={<AlertTriangle size={20} />} color="red"  />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Manage Doctors',      to: '/admin/doctors',       icon: <UserCheck size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'System Announcements',to: '/admin/announcements', icon: <MessageSquare size={18} />, color: 'bg-purple-50 text-purple-600' },
          { label: 'Chatbot Logs',        to: '/admin/chat-logs',     icon: <MessageSquare size={18} />, color: 'bg-teal-50 text-teal-600' },
          { label: 'Audit Logs',          to: '/admin/audit',         icon: <ScrollText size={18} />, color: 'bg-orange-50 text-orange-600' },
        ].map(a => (
          <Link key={a.label} to={a.to}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}`}>{a.icon}</div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{a.label}</span>
            <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-500" />
          </Link>
        ))}
      </div>

      {/* Critical Alert Banner */}
      {(data?.criticalAlerts ?? 0) > 0 && (
        <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{data!.criticalAlerts} critical chat session{data!.criticalAlerts > 1 ? 's' : ''} detected</p>
            <p className="text-xs text-red-600">Patient chat sessions with flagged critical health concerns need review.</p>
          </div>
          <Link to="/admin/chat-logs" className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap">Review →</Link>
        </div>
      )}

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <Link to="/admin/audit" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Full log <ArrowRight size={12} />
          </Link>
        </CardHeader>
        {!data?.recentAudit?.length ? (
          <EmptyState icon={<ScrollText size={36} />} title="No audit logs yet" />
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentAudit.map((log: AuditLog) => (
              <div key={log.auditLogId} className="flex items-center gap-3 py-3">
                <Badge variant={ACTION_BADGE[log.auditLogAction] ?? 'default'}>{log.auditLogAction}</Badge>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700">{log.user?.userEmail}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="text-sm text-gray-500">{log.auditLogEntity}</span>
                  {log.auditLogDetails && <span className="text-xs text-gray-400 ml-2 truncate hidden sm:inline">· {log.auditLogDetails}</span>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(log.auditLogTimestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
