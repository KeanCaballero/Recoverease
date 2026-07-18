import { Bell, CheckCheck, AlertTriangle, Calendar, Info, Megaphone } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Card, Button, Badge, EmptyState } from '../components/ui';
import { formatDateTime, cn } from '../lib/utils';
import type { Notification as AppNotification } from '../types';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  appointment:   { icon: <Calendar size={15} />,      color: 'bg-blue-100 text-blue-600',    label: 'Appointment' },
  reschedule:    { icon: <Calendar size={15} />,      color: 'bg-orange-100 text-orange-600', label: 'Reschedule' },
  criticalAlert: { icon: <AlertTriangle size={15} />, color: 'bg-red-100 text-red-600',      label: 'Critical Alert' },
  system:        { icon: <Info size={15} />,          color: 'bg-gray-100 text-gray-600',    label: 'System' },
  announcement:  { icon: <Megaphone size={15} />,     color: 'bg-purple-100 text-purple-600', label: 'Announcement' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: <Bell size={15} />, color: 'bg-gray-100 text-gray-600', label: type };
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" icon={<CheckCheck size={14} />} onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {!notifications.length ? (
        <EmptyState icon={<Bell size={40} />} title="No notifications" description="Notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {(notifications as AppNotification[]).map(n => {
            const config = getConfig(n.notificationType);
            return (
              <button key={n.notificationId} onClick={() => markRead(n.notificationId)}
                className={cn(
                  'w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all',
                  n.notificationIsRead ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-blue-50 border-blue-200 hover:border-blue-300',
                )}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.color)}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm', n.notificationIsRead ? 'text-gray-700' : 'text-gray-900 font-medium')}>
                      {n.notificationMessage}
                    </p>
                    {!n.notificationIsRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="gray">{config.label}</Badge>
                    <span className="text-xs text-gray-400">{formatDateTime(n.notificationCreatedAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
