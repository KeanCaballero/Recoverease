import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, AlertTriangle, FileText, ArrowRight, Clock } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { Card, CardHeader, CardTitle, StatCard, Badge, LoadingPage, EmptyState } from '../../components/ui';
import { formatDateTime, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface UpcomingAppt {
  appointmentId: number; appointmentDate: string; appointmentStatus: string;
  patient?: { patFirstName: string; patLastName: string };
}
interface RecentNote {
  doctorNoteId: number; doctorNoteText: string; doctorNoteCreatedAt: string;
  patient?: { patFirstName: string; patLastName: string };
}
interface DashData {
  totalPatients: number; activePatients: number; criticalAlerts: number;
  upcomingAppointments: UpcomingAppt[]; recentNotes: RecentNote[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashData>('/doctors/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPage />;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good {getGreeting()}, {user?.name} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">{formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients"  value={data?.totalPatients ?? 0}  icon={<Users size={20} />}         color="blue" />
        <StatCard label="Active Patients" value={data?.activePatients ?? 0}  icon={<Users size={20} />}         color="green" />
        <StatCard label="Upcoming Apts"   value={data?.upcomingAppointments?.length ?? 0} icon={<Calendar size={20} />} color="teal" />
        <StatCard label="Critical Alerts" value={data?.criticalAlerts ?? 0}  icon={<AlertTriangle size={20} />} color="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link to="/doctor/appointments" className="text-xs text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </CardHeader>
          {!data?.upcomingAppointments?.length ? (
            <EmptyState icon={<Calendar size={40} />} title="No upcoming appointments" />
          ) : (
            <div className="space-y-3">
              {data.upcomingAppointments.map(appt => (
                <div key={appt.appointmentId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{appt.patient?.patFirstName} {appt.patient?.patLastName}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(appt.appointmentDate)}</p>
                  </div>
                  <Badge variant={appt.appointmentStatus === 'confirmed' ? 'success' : 'default'}>{appt.appointmentStatus}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Doctor Notes</CardTitle>
            <Link to="/doctor/patients" className="text-xs text-blue-600 hover:underline flex items-center gap-1">All patients <ArrowRight size={12} /></Link>
          </CardHeader>
          {!data?.recentNotes?.length ? (
            <EmptyState icon={<FileText size={40} />} title="No notes yet" />
          ) : (
            <div className="space-y-3">
              {data.recentNotes.map(note => (
                <div key={note.doctorNoteId} className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{note.patient?.patFirstName} {note.patient?.patLastName}</span>
                    <span className="text-xs text-gray-400">{formatDate(note.doctorNoteCreatedAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{note.doctorNoteText}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {(data?.criticalAlerts ?? 0) > 0 && (
        <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{data!.criticalAlerts} critical alert{data!.criticalAlerts > 1 ? 's' : ''} in AI chatbot</p>
            <p className="text-xs text-red-600">Review patient chat sessions flagged with critical health concerns.</p>
          </div>
        </div>
      )}
    </div>
  );
}
