import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, ChevronRight, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { Patient } from '../../types';
import { Card, Button, Input, Select, Badge, Modal, Textarea, EmptyState } from '../../components/ui';
import { formatDate, getAge } from '../../lib/utils';

const STATUS_OPTS = [
  { value: '', label: 'All Patients' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discharged', label: 'Discharged' },
];

const STATUS_BADGE: Record<string, 'success' | 'gray' | 'warning' | 'default'> = {
  active: 'success', inactive: 'gray', discharged: 'warning',
};

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Patient[]>('/doctors/patients', {
        ...(search && { search }),
        ...(status && { status }),
      });
      setPatients(data);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Patients</h1>
          <p className="text-sm text-gray-500">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Register Patient</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>
        <Select options={STATUS_OPTS} value={status} onChange={e => setStatus(e.target.value)} className="w-40" />
      </div>

      {/* List */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-blue-500" size={24} />
          </div>
        ) : !patients.length ? (
          <EmptyState icon={<User size={40} />} title="No patients found" description="Register a new patient to get started." action={<Button icon={<Plus size={16} />} onClick={() => setShowModal(true)} size="sm">Register Patient</Button>} />
        ) : (
          <div className="divide-y divide-gray-100">
            {patients.map(p => (
              <Link key={p.patId} to={`/doctor/patients/${p.patId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                  {p.patFirstName[0]}{p.patLastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{p.patFirstName} {p.patLastName}</p>
                  <p className="text-xs text-gray-500">
                    {p.user?.userEmail} · {getAge(p.patBirthDate)}y · {p.patGender ?? 'N/A'}
                  </p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <Badge variant={STATUS_BADGE[p.patStatus] ?? 'default'}>{p.patStatus}</Badge>
                  {p.treatmentPlans?.length ? (
                    <span className="text-xs text-gray-400">{p.treatmentPlans[0].treatmentPlanTitle}</span>
                  ) : (
                    <span className="text-xs text-gray-300">No active plan</span>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Register Modal */}
      <RegisterPatientModal open={showModal} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
    </div>
  );
}

// ─── Register Patient Modal ───────────────────────────────────────────────────
function RegisterPatientModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', birthDate: '', gender: '', contactNo: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.birthDate) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/doctors/patients', form);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register New Patient" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name *" value={form.firstName} onChange={set('firstName')} placeholder="Juan" />
          <Input label="Last Name *" value={form.lastName} onChange={set('lastName')} placeholder="Dela Cruz" />
        </div>
        <Input label="Email Address *" type="email" value={form.email} onChange={set('email')} placeholder="patient@email.com" />
        <Input label="Temporary Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date of Birth *" type="date" value={form.birthDate} onChange={set('birthDate')} />
          <Select label="Gender" value={form.gender} onChange={set('gender') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
            options={[{ value: '', label: 'Select…' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
        </div>
        <Input label="Contact No." value={form.contactNo} onChange={set('contactNo')} placeholder="+63 9XX XXX XXXX" />
        <Textarea label="Address" value={form.address} onChange={set('address')} placeholder="City, Province" rows={2} />

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={submitting}>Register Patient</Button>
        </div>
      </form>
    </Modal>
  );
}
