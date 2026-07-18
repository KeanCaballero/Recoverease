import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Pill, Activity, Calendar, FileText,
  Plus, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../lib/api';
import { Patient, TreatmentPlan, Prescription, Appointment, DoctorNote, RecoveryLog } from '../../types';
import { Card, CardHeader, CardTitle, Button, Badge, Input, Textarea, Modal, EmptyState, LoadingPage } from '../../components/ui';
import { formatDate, formatDateTime, getAge, getMoodLabel, getMoodColor, cn } from '../../lib/utils';

type Tab = 'overview' | 'treatment' | 'medications' | 'recovery' | 'appointments' | 'notes';

export default function PatientDetailPage() {
  const { patId } = useParams<{ patId: string }>();
  const [patient, setPatient] = useState<Patient & { treatmentPlans: TreatmentPlan[]; doctorNotes: DoctorNote[]; recoveryLogs: RecoveryLog[]; appointments: Appointment[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);

  const load = useCallback(async () => {
    if (!patId) return;
    setLoading(true);
    try {
      const [p, rx] = await Promise.all([
        apiGet<typeof patient>(`/doctors/patients/${patId}`),
        apiGet<Prescription[]>(`/medications/prescriptions/patient/${patId}`),
      ]);
      setPatient(p);
      setPrescriptions(rx);
    } finally {
      setLoading(false);
    }
  }, [patId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingPage />;
  if (!patient) return <div className="p-6 text-gray-500">Patient not found.</div>;

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'overview',      label: 'Overview',      icon: <Activity size={15} /> },
    { id: 'treatment',     label: 'Treatment',     icon: <ClipboardList size={15} /> },
    { id: 'medications',   label: 'Medications',   icon: <Pill size={15} /> },
    { id: 'recovery',      label: 'Recovery',      icon: <Activity size={15} /> },
    { id: 'appointments',  label: 'Appointments',  icon: <Calendar size={15} /> },
    { id: 'notes',         label: 'Doctor Notes',  icon: <FileText size={15} /> },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link to="/doctor/patients" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 mt-0.5">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{patient.patFirstName} {patient.patLastName}</h1>
            <Badge variant={patient.patStatus === 'active' ? 'success' : 'gray'}>{patient.patStatus}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {patient.user?.userEmail} · {getAge(patient.patBirthDate)} years old · {patient.patGender ?? '–'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Calendar size={14} />} onClick={() => setShowApptModal(true)}>Schedule</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowNoteModal(true)}>Add Note</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab patient={patient} />}
      {tab === 'treatment' && (
        <TreatmentTab plans={patient.treatmentPlans} patId={patient.patId}
          onAdd={() => setShowTreatmentModal(true)} onRefresh={load} />
      )}
      {tab === 'medications' && <MedicationsTab prescriptions={prescriptions} patId={patient.patId} onRefresh={load} />}
      {tab === 'recovery' && <RecoveryTab logs={patient.recoveryLogs} />}
      {tab === 'appointments' && <AppointmentsTab appointments={patient.appointments} onRefresh={load} />}
      {tab === 'notes' && <NotesTab notes={patient.doctorNotes} />}

      {/* Modals */}
      <AddNoteModal open={showNoteModal} onClose={() => setShowNoteModal(false)} patId={patient.patId} onSuccess={load} />
      <CreateTreatmentModal open={showTreatmentModal} onClose={() => setShowTreatmentModal(false)} patId={patient.patId} onSuccess={() => { setShowTreatmentModal(false); load(); }} />
      <ScheduleApptModal open={showApptModal} onClose={() => setShowApptModal(false)} patId={patient.patId} onSuccess={() => { setShowApptModal(false); load(); }} />
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ patient }: { patient: Patient & { treatmentPlans: TreatmentPlan[]; recoveryLogs: RecoveryLog[] } }) {
  const activePlan = patient.treatmentPlans?.find(p => p.treatmentPlanStatus === 'active');
  const recentLog = patient.recoveryLogs?.[0];

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card>
        <CardTitle className="mb-4">Patient Information</CardTitle>
        <dl className="space-y-3">
          {[
            ['Full Name', `${patient.patFirstName} ${patient.patLastName}`],
            ['Date of Birth', `${formatDate(patient.patBirthDate)} (${getAge(patient.patBirthDate)} years)`],
            ['Gender', patient.patGender ?? '–'],
            ['Contact', patient.patContactNo ?? '–'],
            ['Address', patient.patAddress ?? '–'],
            ['Registered', formatDate(patient.patCreatedAt)],
            ['Consent Given', patient.patConsentAt ? formatDate(patient.patConsentAt) : 'Pending'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-3">
              <dt className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{val}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle className="mb-3">Active Treatment Plan</CardTitle>
          {activePlan ? (
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{activePlan.treatmentPlanTitle}</p>
              <p className="text-sm text-gray-500">{activePlan.treatmentPlanDescription}</p>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>Start: {formatDate(activePlan.treatmentPlanStartDate)}</span>
                {activePlan.treatmentPlanEndDate && <span>End: {formatDate(activePlan.treatmentPlanEndDate)}</span>}
              </div>
              <div className="mt-2 space-y-1">
                {activePlan.treatmentGoals?.map(g => (
                  <div key={g.treatmentGoalId} className="flex items-center gap-2 text-xs">
                    {g.treatmentGoalStatus === 'achieved'
                      ? <CheckCircle size={12} className="text-green-500" />
                      : <AlertCircle size={12} className="text-gray-300" />}
                    <span className={g.treatmentGoalStatus === 'achieved' ? 'line-through text-gray-400' : 'text-gray-700'}>{g.treatmentGoalDescription}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">No active treatment plan.</p>}
        </Card>

        {recentLog && (
          <Card>
            <CardTitle className="mb-3">Latest Recovery Entry</CardTitle>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">{formatDate(recentLog.recoveryLogDate)}</p>
              {recentLog.recoveryLogMoodRating && (
                <p className={`text-sm font-semibold ${getMoodColor(recentLog.recoveryLogMoodRating)}`}>
                  Mood: {recentLog.recoveryLogMoodRating}/10 — {getMoodLabel(recentLog.recoveryLogMoodRating)}
                </p>
              )}
              {recentLog.recoveryLogNotes && <p className="text-sm text-gray-600">{recentLog.recoveryLogNotes}</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Treatment Tab ────────────────────────────────────────────────────────────
function TreatmentTab({ plans, patId, onAdd, onRefresh }: { plans: TreatmentPlan[]; patId: number; onAdd: () => void; onRefresh: () => void }) {
  const [updatingGoal, setUpdatingGoal] = useState<number | null>(null);

  async function toggleGoal(planId: number, goalId: number, current: string) {
    setUpdatingGoal(goalId);
    const next = current === 'achieved' ? 'pending' : 'achieved';
    await apiPost(`/treatments/${planId}/goals`, { goalId, status: next });
    onRefresh();
    setUpdatingGoal(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={14} />} onClick={onAdd}>New Treatment Plan</Button>
      </div>
      {!plans?.length ? (
        <EmptyState icon={<ClipboardList size={40} />} title="No treatment plans" action={<Button size="sm" onClick={onAdd}>Create Plan</Button>} />
      ) : (
        plans.map(plan => (
          <Card key={plan.treatmentPlanId}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{plan.treatmentPlanTitle}</h3>
                  <Badge variant={plan.treatmentPlanStatus === 'active' ? 'success' : 'gray'}>{plan.treatmentPlanStatus}</Badge>
                </div>
                {plan.treatmentPlanDescription && <p className="text-sm text-gray-500 mb-3">{plan.treatmentPlanDescription}</p>}
                <div className="flex gap-4 text-xs text-gray-400 mb-4">
                  <span>Start: {formatDate(plan.treatmentPlanStartDate)}</span>
                  {plan.treatmentPlanEndDate && <span>End: {formatDate(plan.treatmentPlanEndDate)}</span>}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goals</p>
                  {plan.treatmentGoals?.map(g => (
                    <div key={g.treatmentGoalId} className="flex items-center gap-3 group">
                      <button onClick={() => toggleGoal(plan.treatmentPlanId, g.treatmentGoalId, g.treatmentGoalStatus)}
                        disabled={updatingGoal === g.treatmentGoalId}
                        className="flex-shrink-0">
                        {g.treatmentGoalStatus === 'achieved'
                          ? <CheckCircle size={16} className="text-green-500" />
                          : <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-green-400 transition-colors" />}
                      </button>
                      <span className={cn('text-sm', g.treatmentGoalStatus === 'achieved' ? 'line-through text-gray-400' : 'text-gray-700')}>
                        {g.treatmentGoalDescription}
                      </span>
                      {g.treatmentGoalTargetDate && <span className="text-xs text-gray-400 ml-auto">Due: {formatDate(g.treatmentGoalTargetDate)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Medications Tab ──────────────────────────────────────────────────────────
function MedicationsTab({ prescriptions, patId, onRefresh }: { prescriptions: Prescription[]; patId: number; onRefresh: () => void }) {
  const [showPrescModal, setShowPrescModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowPrescModal(true)}>New Prescription</Button>
      </div>
      {!prescriptions.length ? (
        <EmptyState icon={<Pill size={40} />} title="No prescriptions yet" action={<Button size="sm" onClick={() => setShowPrescModal(true)}>Create Prescription</Button>} />
      ) : (
        prescriptions.map(rx => (
          <Card key={rx.prescriptionId}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">Prescription #{rx.prescriptionId}</p>
                <p className="text-xs text-gray-400">Issued: {formatDate(rx.prescriptionIssuedDate)}</p>
              </div>
            </div>
            {rx.prescriptionNotes && <p className="text-sm text-gray-500 mb-3 italic">{rx.prescriptionNotes}</p>}
            <div className="space-y-2">
              {rx.medicationSchedules.map(med => (
                <div key={med.medicationScheduleId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Pill size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{med.medicationScheduleName} <span className="text-gray-500 font-normal">— {med.medicationScheduleDosage}</span></p>
                    <p className="text-xs text-gray-400">{med.medicationScheduleFrequency}x daily at {med.medicationScheduleTimes.replace(/,/g, ', ')}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{formatDate(med.medicationScheduleStartDate)}</p>
                    {med.medicationScheduleEndDate && <p>→ {formatDate(med.medicationScheduleEndDate)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
      <CreatePrescriptionModal open={showPrescModal} onClose={() => setShowPrescModal(false)} patId={patId} onSuccess={() => { setShowPrescModal(false); onRefresh(); }} />
    </div>
  );
}

// ─── Recovery Tab ─────────────────────────────────────────────────────────────
function RecoveryTab({ logs }: { logs: RecoveryLog[] }) {
  return (
    <div className="space-y-3">
      {!logs?.length ? (
        <EmptyState icon={<Activity size={40} />} title="No recovery entries yet" description="The patient hasn't logged any recovery progress." />
      ) : (
        logs.map(log => (
          <Card key={log.recoveryLogId} className="flex items-start gap-4">
            <div className="text-center w-14 flex-shrink-0">
              <p className="text-xs text-gray-400">{new Date(log.recoveryLogDate).toLocaleDateString('en', { month: 'short' })}</p>
              <p className="text-xl font-bold text-gray-900">{new Date(log.recoveryLogDate).getDate()}</p>
            </div>
            <div className="flex-1">
              {log.recoveryLogMoodRating && (
                <p className={`text-sm font-semibold mb-1 ${getMoodColor(log.recoveryLogMoodRating)}`}>
                  Mood: {log.recoveryLogMoodRating}/10 — {getMoodLabel(log.recoveryLogMoodRating)}
                </p>
              )}
              {log.recoveryLogNotes && <p className="text-sm text-gray-600">{log.recoveryLogNotes}</p>}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────
function AppointmentsTab({ appointments, onRefresh }: { appointments: Appointment[]; onRefresh: () => void }) {
  const STATUS_BADGE: Record<string, 'success' | 'warning' | 'gray' | 'danger' | 'default'> = {
    scheduled: 'default', confirmed: 'success', completed: 'gray', cancelled: 'danger', rescheduled: 'warning',
  };

  async function updateStatus(apptId: number, status: string) {
    await apiPatch(`/appointments/${apptId}/status`, { status });
    onRefresh();
  }

  return (
    <div className="space-y-3">
      {!appointments?.length ? (
        <EmptyState icon={<Calendar size={40} />} title="No appointments" />
      ) : (
        appointments.map(appt => (
          <Card key={appt.appointmentId} className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{formatDateTime(appt.appointmentDate)}</p>
              {appt.rescheduleRequests?.[0] && (
                <p className="text-xs text-orange-500">Reschedule requested → {formatDateTime(appt.rescheduleRequests[0].rescheduleRequestDate)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE[appt.appointmentStatus] ?? 'default'}>{appt.appointmentStatus}</Badge>
              {appt.appointmentStatus === 'scheduled' && (
                <button onClick={() => updateStatus(appt.appointmentId, 'completed')}
                  className="text-xs text-green-600 hover:underline">Mark done</button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
function NotesTab({ notes }: { notes: DoctorNote[] }) {
  return (
    <div className="space-y-3">
      {!notes?.length ? (
        <EmptyState icon={<FileText size={40} />} title="No notes yet" />
      ) : (
        notes.map(note => (
          <Card key={note.doctorNoteId}>
            <p className="text-xs text-gray-400 mb-2">{formatDateTime(note.doctorNoteCreatedAt)}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.doctorNoteText}</p>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Sub-modals ───────────────────────────────────────────────────────────────
function AddNoteModal({ open, onClose, patId, onSuccess }: { open: boolean; onClose: () => void; patId: number; onSuccess: () => void }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try { await apiPost(`/doctors/patients/${patId}/notes`, { text }); onSuccess(); onClose(); setText(''); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Doctor Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea label="Note" value={text} onChange={e => setText(e.target.value)} placeholder="Write your clinical observation…" rows={5} />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" loading={submitting}>Save Note</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTreatmentModal({ open, onClose, patId, onSuccess }: { open: boolean; onClose: () => void; patId: number; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.startDate) return;
    setSubmitting(true);
    try { await apiPost('/treatments', { ...form, patId }); onSuccess(); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Treatment Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Plan Title *" value={form.title} onChange={set('title')} placeholder="Post-Hypertension Management" />
        <Textarea label="Description" value={form.description} onChange={set('description')} rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date *" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input label="End Date" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" loading={submitting}>Create Plan</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreatePrescriptionModal({ open, onClose, patId, onSuccess }: { open: boolean; onClose: () => void; patId: number; onSuccess: () => void }) {
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState([{ name: '', dosage: '', frequency: 1, times: '08:00', startDate: '', endDate: '' }]);
  const [submitting, setSubmitting] = useState(false);

  function updateMed(i: number, k: string, v: string | number) {
    setMeds(prev => prev.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/medications/prescriptions', {
        patId,
        notes,
        medications: meds.map(m => ({ ...m, times: m.times.split(',').map(t => t.trim()) })),
      });
      onSuccess();
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Prescription" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea label="Prescription Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Take with food. Monitor blood pressure daily…" />
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Medications</p>
          {meds.map((med, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Name" value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="Amlodipine" />
                <Input label="Dosage" value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} placeholder="5mg" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input label="Times/day" type="number" value={med.frequency} onChange={e => updateMed(i, 'frequency', parseInt(e.target.value))} min={1} max={6} />
                <Input label="At (HH:MM, comma-sep)" value={med.times} onChange={e => updateMed(i, 'times', e.target.value)} placeholder="08:00,20:00" />
                <Input label="Start Date" type="date" value={med.startDate} onChange={e => updateMed(i, 'startDate', e.target.value)} />
              </div>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setMeds(p => [...p, { name: '', dosage: '', frequency: 1, times: '08:00', startDate: '', endDate: '' }])}>
            + Add Another Medication
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" loading={submitting}>Issue Prescription</Button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleApptModal({ open, onClose, patId, onSuccess }: { open: boolean; onClose: () => void; patId: number; onSuccess: () => void }) {
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    try { await apiPost('/appointments', { patId, date }); onSuccess(); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Appointment Date & Time *" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" loading={submitting}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}
