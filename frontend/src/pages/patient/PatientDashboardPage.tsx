import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Pill, Calendar, Target, Flame, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PatientDashboard, MedicationLog } from '../../types';
import { Card, CardHeader, CardTitle, StatCard, Badge, LoadingPage, EmptyState } from '../../components/ui';
import { formatDateTime, formatDate, getMoodColor, getMoodLabel } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

function moodToHex(rating: number): string {
  if (rating <= 2) return '#f87171'; // red-400
  if (rating <= 4) return '#fb923c'; // orange-400
  if (rating <= 6) return '#facc15'; // yellow-400
  if (rating <= 8) return '#4ade80'; // green-400
  return '#34d399'; // emerald-400
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PatientDashboard>('/patients/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPage />;

  const adherenceRate = data?.adherenceData?.rate ?? 0;
  const activePlan = data?.activePlan;
  const goals = activePlan?.treatmentGoals ?? [];
  const achievedGoals = goals.filter(g => g.treatmentGoalStatus === 'achieved').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Recovery Dashboard</h1>
        <p className="text-sm text-gray-500">
          {user?.name} · Under care of Dr. {data?.patient?.doctor?.docFirstName} {data?.patient?.doctor?.docLastName}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recovery Streak"  value={`${data?.streak ?? 0} days`} icon={<Flame size={20} />}     color="yellow" />
        <StatCard label="Med Adherence"    value={`${adherenceRate}%`}         icon={<Pill size={20} />}      color={adherenceRate >= 80 ? 'green' : adherenceRate >= 50 ? 'yellow' : 'red'} />
        <StatCard label="Goals Achieved"   value={`${achievedGoals}/${goals.length}`} icon={<Target size={20} />} color="teal" />
        <StatCard label="Log Entries"      value={data?.recentLogs?.length ?? 0} icon={<Activity size={20} />} color="purple" sub="last 7 days" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Today's Medications */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Medications</CardTitle>
              <Link to="/patient/medications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Full schedule <ArrowRight size={12} />
              </Link>
            </CardHeader>
            {!data?.todayLogs?.length ? (
              <EmptyState icon={<Pill size={36} />} title="No medications scheduled today" />
            ) : (
              <div className="space-y-2">
                {data.todayLogs.map((log: MedicationLog) => {
                  const taken = log.medicationLogStatus === 'taken';
                  const time = new Date(log.medicationLogScheduledAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log.medicationLogId}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${taken ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${taken ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {taken ? <CheckCircle size={16} className="text-green-600" /> : <Pill size={16} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${taken ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                          {log.medicationSchedule?.medicationScheduleName}
                        </p>
                        <p className="text-xs text-gray-400">{log.medicationSchedule?.medicationScheduleDosage} · {time}</p>
                      </div>
                      <Badge variant={taken ? 'success' : 'warning'}>{taken ? 'Taken' : 'Pending'}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Next Appointment */}
          <Card>
            <CardTitle className="mb-3">Next Appointment</CardTitle>
            {data?.nextAppointment ? (
              <div className="text-center py-3">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-3">
                  <Calendar className="text-blue-600" size={22} />
                </div>
                <p className="font-semibold text-gray-900">{formatDateTime(data.nextAppointment.appointmentDate)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Dr. {data.nextAppointment.doctor?.docFirstName} {data.nextAppointment.doctor?.docLastName}
                </p>
                <Badge variant={data.nextAppointment.appointmentStatus === 'confirmed' ? 'success' : 'default'} className="mt-2">
                  {data.nextAppointment.appointmentStatus}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3">No upcoming appointments</p>
            )}
          </Card>

          {/* Active Plan */}
          {activePlan && (
            <Card>
              <CardTitle className="mb-3">Treatment Plan</CardTitle>
              <p className="text-sm font-medium text-gray-800 mb-2">{activePlan.treatmentPlanTitle}</p>
              <div className="space-y-1.5">
                {goals.slice(0, 3).map(g => (
                  <div key={g.treatmentGoalId} className="flex items-center gap-2">
                    {g.treatmentGoalStatus === 'achieved'
                      ? <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                      : <div className="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                    <span className={`text-xs ${g.treatmentGoalStatus === 'achieved' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                      {g.treatmentGoalDescription}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/patient/treatment" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-3">
                View full plan <ArrowRight size={11} />
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Mood Trend */}
      {(data?.recentLogs?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Mood Trend</CardTitle>
            <Link to="/patient/recovery" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Log today <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <div className="flex items-end gap-2 h-24">
            {data?.recentLogs?.slice().reverse().map((log, i) => {
              const rating = log.recoveryLogMoodRating ?? 5;
              const height = `${(rating / 10) * 100}%`;
              return (
                <div key={log.recoveryLogId} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t-sm flex items-end" style={{ height: '80px' }}>
                    <div className="w-full rounded-t-sm transition-all bg-blue-400"
                      style={{ height, backgroundColor: moodToHex(rating) }} />
                  </div>
                  <p className="text-xs text-gray-400">{new Date(log.recoveryLogDate).getDate()}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
