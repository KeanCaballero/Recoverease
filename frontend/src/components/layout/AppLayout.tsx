import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Bell, MessageSquare,
  ClipboardList, Pill, Activity, FileText, Settings,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
  Shield, Megaphone, ScrollText, User,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Doctor
  { label: 'Dashboard',       path: '/doctor/dashboard',     icon: <LayoutDashboard size={18} />, roles: ['doctor'] },
  { label: 'My Patients',     path: '/doctor/patients',      icon: <Users size={18} />,           roles: ['doctor'] },
  { label: 'Appointments',    path: '/doctor/appointments',  icon: <Calendar size={18} />,        roles: ['doctor'] },
  { label: 'Reports',         path: '/doctor/reports',       icon: <FileText size={18} />,        roles: ['doctor'] },
  // Patient
  { label: 'Dashboard',       path: '/patient/dashboard',    icon: <LayoutDashboard size={18} />, roles: ['patient'] },
  { label: 'Treatment Plan',  path: '/patient/treatment',    icon: <ClipboardList size={18} />,   roles: ['patient'] },
  { label: 'Medications',     path: '/patient/medications',  icon: <Pill size={18} />,            roles: ['patient'] },
  { label: 'Recovery',        path: '/patient/recovery',     icon: <Activity size={18} />,        roles: ['patient'] },
  { label: 'Appointments',    path: '/patient/appointments', icon: <Calendar size={18} />,        roles: ['patient'] },
  { label: 'AI Assistant',    path: '/patient/chat',         icon: <MessageSquare size={18} />,   roles: ['patient'] },
  // Admin
  { label: 'Dashboard',       path: '/admin/dashboard',      icon: <LayoutDashboard size={18} />, roles: ['admin'] },
  { label: 'Doctors',         path: '/admin/doctors',        icon: <Users size={18} />,           roles: ['admin'] },
  { label: 'Announcements',   path: '/admin/announcements',  icon: <Megaphone size={18} />,       roles: ['admin'] },
  { label: 'Chatbot Logs',    path: '/admin/chat-logs',      icon: <MessageSquare size={18} />,   roles: ['admin'] },
  { label: 'Audit Logs',      path: '/admin/audit',          icon: <ScrollText size={18} />,      roles: ['admin'] },
  { label: 'Settings',        path: '/admin/settings',       icon: <Settings size={18} />,        roles: ['admin'] },
  // Common
  { label: 'Notifications',   path: '/notifications',        icon: <Bell size={18} />,            roles: ['doctor', 'patient', 'admin'] },
  { label: 'Profile',         path: '/profile',              icon: <User size={18} />,            roles: ['doctor', 'patient', 'admin'] },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'from-purple-600 to-purple-800',
  doctor: 'from-blue-600 to-blue-800',
  patient: 'from-teal-600 to-teal-800',
};
const ROLE_LABELS: Record<UserRole, string> = { admin: 'Administrator', doctor: 'Healthcare Provider', patient: 'Patient' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role ?? 'patient';
  const items = NAV_ITEMS.filter(i => i.roles.includes(role));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-60',
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-gray-100', collapsed && !mobile && 'justify-center px-2')}>
        <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white text-xs font-bold', ROLE_COLORS[role])}>
          R
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold text-gray-900">RecoverEase</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[role]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const isNotif = item.path === '/notifications';
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed && !mobile ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
                active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && !mobile && 'justify-center px-2',
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!collapsed || mobile) && <span className="flex-1">{item.label}</span>}
              {isNotif && unreadCount > 0 && (
                <span className={cn('flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1', collapsed && !mobile ? 'absolute -top-1 -right-1 w-4 h-4 text-[10px]' : '')}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={cn('border-t border-gray-100 p-3', collapsed && !mobile && 'flex justify-center')}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
              {getInitials(user?.name ?? 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full relative">
        <Sidebar />
        <button
          onClick={() => setCollapsed(p => !p)}
          className="absolute -right-3 top-16 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-gray-600 z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden">
            <Sidebar mobile />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <p className="text-sm font-bold text-gray-900">RecoverEase</p>
          <div className="w-8" />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
