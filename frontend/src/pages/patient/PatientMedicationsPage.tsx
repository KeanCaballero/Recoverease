import { useEffect, useState } from 'react';
import { Pill, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';
import { Card, CardHeader, CardTitle, StatCard, Badge, Spinner, EmptyState } from '../../components/ui';
import { MedicationLog, Prescription } from '../../types';
import { formatDate, formatTime } from '../../lib/utils';

interface AdherenceData { total: number; taken: number; missed: number; adherenceRate: number; byDay: Record<string, { taken: number; total: number }>; }

export default function PatientMedicationsPage() {
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [adherence, setAdherence] = useState<AdherenceData | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<number | null>(null);

  async function loadAll() {
    setLoading(true);
    const [today, adh, rx] = await Promise.all([
      apiGet<MedicationLog[]>('/medications/today'),
      apiGet<AdherenceData>('/medications/adherence'),
      apiGet<Prescription[]>('/medications/prescriptions'),
    ]);
    setTodayLogs(today);
    setAdherence(adh);
    setPrescriptions(rx);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function markTaken(logId: number) {
    setMarking(logId);
    try {
      await apiPatch(`/medications/logs/${logId}/taken`);
      setTodayLogs(prev => prev.map(l => l.medicationLogId === logId ? { ...l, medicationLogStatus: 'taken' as const, medicationLogTakenAt: new Date().toISOString() } : l));
    } finally { setMarking(null); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const days = adherence ? Object.entries(adherence.byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-7) : [];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Medications</h1>
        <p className="text-sm text-gray-500">Your medication schedule and adherence</p>
      </div>

      {/* Adherence stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="This Week Taken"  value={`${adherence?.taken ?? 0}/${adherence?.total ?? 0}`} icon={<CheckCircle size={20} />} color="green" />
        <StatCard label="Adherence Rate"   value={`${adherence?.adherenceRate ?? 0}%`} icon={<TrendingUp size={20} />} color={( adherence?.adherenceRate ?? 0) >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Missed This Week" value={adherence?.missed ?? 0} icon={<Clock size={20} />} color="red" />
      </div>

      {/* 7-day bar chart */}
      {days.length > 0 && (
        <Card>
          <CardTitle className="mb-4">7-Day Adherence</CardTitle>
          <div className="flex items-end gap-3 h-20">
            {days.map(([date, d]) => {
              const pct = d.total > 0 ? (d.taken / d.total) : 0;
              const barColor = pct >= 0.8 ? '#4ade80' : pct >= 0.5 ? '#facc15' : '#f87171';
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500">{d.taken}/{d.total}</p>
                  <div className="w-full bg-gray-100 rounded-t" style={{ height: '48px' }}>
                    <div className="w-full rounded-t transition-all" style={{ height: `${pct * 100}%`, backgroundColor: barColor }} />
                  </div>
                  <p className="text-xs text-gray-400">{new Date(date).getDate()}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Today's schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </CardHeader>
        {!todayLogs.length ? (
          <EmptyState icon={<Pill size={36} />} title="No medications scheduled today" />
        ) : (
          <div className="space-y-2">
            {todayLogs.map(log => {
              const taken = log.medicationLogStatus === 'taken';
              return (
                <div key={log.medicationLogId}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${taken ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${taken ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {taken ? <CheckCircle size={18} className="text-green-600" /> : <Pill size={18} className="text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${taken ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {log.medicationSchedule?.medicationScheduleName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {log.medicationSchedule?.medicationScheduleDosage} · {formatTime(log.medicationLogScheduledAt)}
                      {taken && log.medicationLogTakenAt && ` · Taken at ${formatTime(log.medicationLogTakenAt)}`}
                    </p>
                  </div>
                  {!taken && (
                    <button onClick={() => markTaken(log.medicationLogId)}
                      disabled={marking === log.medicationLogId}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {marking === log.medicationLogId ? '…' : 'Mark Taken'}
                    </button>
                  )}
                  {taken && <Badge variant="success">Taken</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Prescriptions list */}
      {prescriptions.length > 0 && (
        <Card>
          <CardTitle className="mb-4">Active Prescriptions</CardTitle>
          <div className="space-y-4">
            {prescriptions.map(rx => (
              <div key={rx.prescriptionId} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Issued {formatDate(rx.prescriptionIssuedDate)}</p>
                  <p className="text-xs text-gray-400">Dr. {rx.doctor?.docFirstName} {rx.doctor?.docLastName}</p>
                </div>
                {rx.prescriptionNotes && <p className="text-xs text-gray-500 italic mb-3">{rx.prescriptionNotes}</p>}
                <div className="space-y-2">
                  {rx.medicationSchedules.map(med => (
                    <div key={med.medicationScheduleId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <Pill size={14} className="text-blue-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{med.medicationScheduleName} <span className="text-gray-500 font-normal">— {med.medicationScheduleDosage}</span></p>
                        <p className="text-xs text-gray-400">{med.medicationScheduleFrequency}× daily at {med.medicationScheduleTimes.replace(/,/g, ', ')}</p>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(med.medicationScheduleStartDate)}{med.medicationScheduleEndDate ? ` – ${formatDate(med.medicationScheduleEndDate)}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
