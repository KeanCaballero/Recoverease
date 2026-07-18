import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import { Card, Button, Badge, Spinner, EmptyState, LoadingPage } from './components/ui';
import { formatDateTime } from './lib/utils';
import { apiGet, apiPatch } from './lib/api';
import { Appointment } from './types';
import { Calendar, CheckCircle } from 'lucide-react';

// Auth
import LoginPage    from './pages/auth/LoginPage';
import ConsentPage  from './pages/auth/ConsentPage';

// Doctor
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import DoctorPatientsPage  from './pages/doctor/DoctorPatientsPage';
import PatientDetailPage   from './pages/doctor/PatientDetailPage';

// Patient
import PatientDashboardPage    from './pages/patient/PatientDashboardPage';
import PatientTreatmentPage    from './pages/patient/PatientTreatmentPage';
import PatientMedicationsPage  from './pages/patient/PatientMedicationsPage';
import PatientRecoveryPage     from './pages/patient/PatientRecoveryPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientChatPage         from './pages/patient/PatientChatPage';

// Admin
import AdminDashboardPage     from './pages/admin/AdminDashboardPage';
import AdminDoctorsPage       from './pages/admin/AdminDoctorsPage';
import AdminAuditPage         from './pages/admin/AdminAuditPage';
import AdminSettingsPage      from './pages/admin/AdminSettingsPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import AdminChatLogsPage      from './pages/admin/AdminChatLogsPage';

// Shared
import NotificationsPage from './pages/NotificationsPage';

// ─── Route guard ──────────────────────────────────────────────────────────────
function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
  if (user.needsConsent && window.location.pathname !== '/consent') return <Navigate to="/consent" replace />;
  return <>{children}</>;
}

function Layout({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  return (
    <RequireAuth roles={roles}>
      <AppLayout>{children}</AppLayout>
    </RequireAuth>
  );
}

// ─── Doctor Appointments page (inline) ───────────────────────────────────────
function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await apiGet<Appointment[]>('/appointments');
    setAppointments(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const STATUS_BADGE: Record<string, 'success' | 'warning' | 'gray' | 'danger' | 'default'> = {
    scheduled: 'default', confirmed: 'success', completed: 'gray', cancelled: 'danger', rescheduled: 'warning',
  };

  const upcoming = appointments.filter(a => new Date(a.appointmentDate) >= new Date());
  const past = appointments.filter(a => new Date(a.appointmentDate) < new Date());

  async function respond(requestId: number, decision: 'approved' | 'declined') {
    await apiPatch(`/appointments/reschedule/${requestId}`, { decision });
    load();
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
      {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming ({upcoming.length})</h2>
            {!upcoming.length ? <p className="text-sm text-gray-400 py-4">No upcoming appointments.</p> : upcoming.map(appt => (
              <Card key={appt.appointmentId}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{appt.patient?.patFirstName} {appt.patient?.patLastName}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(appt.appointmentDate)}</p>
                    {appt.rescheduleRequests?.[0]?.rescheduleRequestStatus === 'pending' && (
                      <p className="text-xs text-orange-500 mt-0.5">
                        Reschedule → {formatDateTime(appt.rescheduleRequests[0].rescheduleRequestDate)}
                        {appt.rescheduleRequests[0].rescheduleRequestReason && ` · "${appt.rescheduleRequests[0].rescheduleRequestReason}"`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE[appt.appointmentStatus] ?? 'default'}>{appt.appointmentStatus}</Badge>
                    {appt.rescheduleRequests?.[0]?.rescheduleRequestStatus === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => respond(appt.rescheduleRequests![0].rescheduleRequestId, 'declined')}>Decline</Button>
                        <Button size="sm" onClick={() => respond(appt.rescheduleRequests![0].rescheduleRequestId, 'approved')}>Approve</Button>
                      </>
                    )}
                    {appt.appointmentStatus === 'confirmed' && (
                      <Button size="sm" variant="outline" icon={<CheckCircle size={13} />}
                        onClick={() => apiPatch(`/appointments/${appt.appointmentId}/status`, { status: 'completed' }).then(load)}>
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </section>
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past</h2>
              {past.map(appt => (
                <Card key={appt.appointmentId} className="opacity-70">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{appt.patient?.patFirstName} {appt.patient?.patLastName}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(appt.appointmentDate)}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[appt.appointmentStatus] ?? 'gray'}>{appt.appointmentStatus}</Badge>
                  </div>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Profile page (inline) ────────────────────────────────────────────────────
function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-xl font-bold text-blue-700">
              {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <hr className="border-gray-100" />
          {[['Email', user?.email], ['Role', user?.role], ['User ID', user?.userId]].map(([label, val]) => (
            <div key={String(label)} className="flex gap-4">
              <span className="text-sm text-gray-500 w-24 flex-shrink-0">{label}</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{String(val)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/consent" element={<RequireAuth roles={['patient']}><ConsentPage /></RequireAuth>} />

            {/* Doctor */}
            <Route path="/doctor/dashboard"       element={<Layout roles={['doctor']}><DoctorDashboardPage /></Layout>} />
            <Route path="/doctor/patients"        element={<Layout roles={['doctor']}><DoctorPatientsPage /></Layout>} />
            <Route path="/doctor/patients/:patId" element={<Layout roles={['doctor']}><PatientDetailPage /></Layout>} />
            <Route path="/doctor/appointments"    element={<Layout roles={['doctor']}><DoctorAppointmentsPage /></Layout>} />
            <Route path="/doctor/reports"         element={<Layout roles={['doctor']}><div className="p-6"><h1 className="text-xl font-bold">Reports</h1><p className="text-gray-500 mt-2">Open a patient profile to generate their recovery report.</p></div></Layout>} />

            {/* Patient */}
            <Route path="/patient/dashboard"    element={<Layout roles={['patient']}><PatientDashboardPage /></Layout>} />
            <Route path="/patient/treatment"    element={<Layout roles={['patient']}><PatientTreatmentPage /></Layout>} />
            <Route path="/patient/medications"  element={<Layout roles={['patient']}><PatientMedicationsPage /></Layout>} />
            <Route path="/patient/recovery"     element={<Layout roles={['patient']}><PatientRecoveryPage /></Layout>} />
            <Route path="/patient/appointments" element={<Layout roles={['patient']}><PatientAppointmentsPage /></Layout>} />
            <Route path="/patient/chat"         element={<Layout roles={['patient']}><PatientChatPage /></Layout>} />

            {/* Admin */}
            <Route path="/admin/dashboard"     element={<Layout roles={['admin']}><AdminDashboardPage /></Layout>} />
            <Route path="/admin/doctors"       element={<Layout roles={['admin']}><AdminDoctorsPage /></Layout>} />
            <Route path="/admin/announcements" element={<Layout roles={['admin']}><AdminAnnouncementsPage /></Layout>} />
            <Route path="/admin/chat-logs"     element={<Layout roles={['admin']}><AdminChatLogsPage /></Layout>} />
            <Route path="/admin/audit"         element={<Layout roles={['admin']}><AdminAuditPage /></Layout>} />
            <Route path="/admin/settings"      element={<Layout roles={['admin']}><AdminSettingsPage /></Layout>} />

            {/* Shared */}
            <Route path="/notifications" element={<Layout><NotificationsPage /></Layout>} />
            <Route path="/profile"       element={<Layout><ProfilePage /></Layout>} />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
