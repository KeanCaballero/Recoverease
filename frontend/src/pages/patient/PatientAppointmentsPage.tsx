import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { Appointment } from '../../types';
import { Card, Badge, Button, Modal, Input, Textarea, EmptyState, Spinner } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

const STATUS_CONFIG: Record<string, { badge: 'success' | 'warning' | 'gray' | 'danger' | 'default'; label: string }> = {
  scheduled:  { badge: 'default',  label: 'Scheduled' },
  confirmed:  { badge: 'success',  label: 'Confirmed' },
  completed:  { badge: 'gray',     label: 'Completed' },
  cancelled:  { badge: 'danger',   label: 'Cancelled' },
  rescheduled:{ badge: 'warning',  label: 'Rescheduled' },
};

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [confirmAppt, setConfirmAppt] = useState<Appointment | null>(null);

  async function load() {
    setLoading(true);
    const data = await apiGet<Appointment[]>('/appointments');
    setAppointments(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function confirmAttendance(apptId: number) {
    await apiPatch(`/appointments/${apptId}/status`, { status: 'confirmed' });
    load();
    setConfirmAppt(null);
  }

  const upcoming = appointments.filter(a => new Date(a.appointmentDate) >= new Date() && a.appointmentStatus !== 'cancelled');
  const past = appointments.filter(a => new Date(a.appointmentDate) < new Date() || a.appointmentStatus === 'cancelled');

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-sm text-gray-500">Follow-up visits with your healthcare provider</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !appointments.length ? (
        <EmptyState icon={<Calendar size={40} />} title="No appointments yet" description="Your doctor will schedule follow-up visits as needed." />
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming</h2>
              {upcoming.map(appt => {
                const config = STATUS_CONFIG[appt.appointmentStatus] ?? STATUS_CONFIG.scheduled;
                const pendingReschedule = appt.rescheduleRequests?.[0]?.rescheduleRequestStatus === 'pending';
                return (
                  <Card key={appt.appointmentId} className={cn(appt.appointmentStatus === 'confirmed' && 'border-green-200 bg-green-50')}>
                    <div className="flex items-start gap-4">
                      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                        appt.appointmentStatus === 'confirmed' ? 'bg-green-100' : 'bg-blue-50')}>
                        {appt.appointmentStatus === 'confirmed'
                          ? <CheckCircle size={20} className="text-green-600" />
                          : <Clock size={20} className="text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{formatDateTime(appt.appointmentDate)}</p>
                          <Badge variant={config.badge}>{config.label}</Badge>
                          {pendingReschedule && <Badge variant="warning">Reschedule Pending</Badge>}
                        </div>
                        <p className="text-xs text-gray-500">
                          Dr. {appt.doctor?.docFirstName} {appt.doctor?.docLastName} · {appt.doctor?.docSpecialization}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {appt.appointmentStatus === 'scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmAppt(appt)}>Confirm</Button>
                        )}
                        {['scheduled', 'confirmed'].includes(appt.appointmentStatus) && !pendingReschedule && (
                          <Button size="sm" variant="ghost" onClick={() => setRescheduleAppt(appt)}>Reschedule</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past</h2>
              {past.map(appt => {
                const config = STATUS_CONFIG[appt.appointmentStatus] ?? STATUS_CONFIG.completed;
                return (
                  <Card key={appt.appointmentId} className="opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{formatDateTime(appt.appointmentDate)}</p>
                        <p className="text-xs text-gray-400">Dr. {appt.doctor?.docFirstName} {appt.doctor?.docLastName}</p>
                      </div>
                      <Badge variant={config.badge}>{config.label}</Badge>
                    </div>
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => { setRescheduleAppt(null); load(); }} />
      )}

      {/* Confirm Modal */}
      {confirmAppt && (
        <Modal open title="Confirm Attendance" onClose={() => setConfirmAppt(null)}>
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">Confirm your attendance for the appointment on:</p>
            <p className="font-bold text-gray-900">{formatDateTime(confirmAppt.appointmentDate)}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmAppt(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => confirmAttendance(confirmAppt.appointmentId)}>Confirm Attendance</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RescheduleModal({ appt, onClose, onSuccess }: { appt: Appointment; onClose: () => void; onSuccess: () => void }) {
  const [proposedDate, setProposedDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proposedDate) return;
    setSubmitting(true);
    try {
      await apiPost(`/appointments/${appt.appointmentId}/reschedule`, { proposedDate, reason });
      onSuccess();
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onClose={onClose} title="Request Reschedule">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">Current: <strong>{formatDateTime(appt.appointmentDate)}</strong></p>
        <Input label="Proposed Date & Time *" type="datetime-local" value={proposedDate} onChange={e => setProposedDate(e.target.value)} />
        <Textarea label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Please explain why you need to reschedule…" />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" loading={submitting}>Submit Request</Button>
        </div>
      </form>
    </Modal>
  );
}
