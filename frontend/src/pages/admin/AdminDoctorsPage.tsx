import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, UserCheck, UserX, Edit2, ShieldCheck } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../lib/api';
import { Doctor } from '../../types';
import { Card, Button, Input, Badge, Modal, EmptyState, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/utils';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [editDoc, setEditDoc] = useState<Doctor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<Doctor[]>('/admin/doctors', search ? { search } : {});
    setDoctors(data);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(doc: Doctor) {
    await apiPatch(`/admin/doctors/${doc.docId}/toggle`);
    load();
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Doctor Accounts</h1>
          <p className="text-sm text-gray-500">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowRegister(true)}>Register Doctor</Button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 max-w-sm">
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>
      </div>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !doctors.length ? (
          <EmptyState icon={<ShieldCheck size={40} />} title="No doctors yet"
            action={<Button icon={<Plus size={14} />} size="sm" onClick={() => setShowRegister(true)}>Register First Doctor</Button>} />
        ) : (
          <div className="divide-y divide-gray-100">
            {doctors.map(doc => (
              <div key={doc.docId} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                  {doc.docFirstName[0]}{doc.docLastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">Dr. {doc.docFirstName} {doc.docLastName}</p>
                    <Badge variant={doc.docIsActive ? 'success' : 'gray'}>{doc.docIsActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{doc.user?.userEmail} · {doc.docSpecialization ?? 'General'} · License: {doc.docLicenseNo}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                  <UserCheck size={13} />
                  <span>{doc._count?.patients ?? 0} patient{(doc._count?.patients ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <p className="hidden lg:block text-xs text-gray-400">{formatDate(doc.docCreatedAt)}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={<Edit2 size={13} />} onClick={() => setEditDoc(doc)}>Edit</Button>
                  <Button size="sm" variant={doc.docIsActive ? 'danger' : 'secondary'}
                    icon={doc.docIsActive ? <UserX size={13} /> : <UserCheck size={13} />}
                    onClick={() => toggleStatus(doc)}>
                    {doc.docIsActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RegisterDoctorModal open={showRegister} onClose={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); load(); }} />
      {editDoc && <EditDoctorModal doc={editDoc} onClose={() => setEditDoc(null)} onSuccess={() => { setEditDoc(null); load(); }} />}
    </div>
  );
}

// ─── Register Doctor Modal ────────────────────────────────────────────────────
function RegisterDoctorModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const init = { email: '', password: '', firstName: '', lastName: '', specialization: '', licenseNo: '', contactNo: '' };
  const [form, setForm] = useState(init);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.licenseNo) {
      setError('Please fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      await apiPost('/admin/doctors', form);
      setForm(init);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to register doctor');
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register New Doctor" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name *" value={form.firstName} onChange={set('firstName')} placeholder="Maria" />
          <Input label="Last Name *" value={form.lastName} onChange={set('lastName')} placeholder="Santos" />
        </div>
        <Input label="Email Address *" type="email" value={form.email} onChange={set('email')} placeholder="dr@clinic.com" />
        <Input label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="License No. *" value={form.licenseNo} onChange={set('licenseNo')} placeholder="PRC-2024-000000" />
          <Input label="Specialization" value={form.specialization} onChange={set('specialization')} placeholder="Internal Medicine" />
        </div>
        <Input label="Contact No." value={form.contactNo} onChange={set('contactNo')} placeholder="+63 917 XXX XXXX" />
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={submitting}>Register Doctor</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Doctor Modal ────────────────────────────────────────────────────────
function EditDoctorModal({ doc, onClose, onSuccess }: { doc: Doctor; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: doc.docFirstName, lastName: doc.docLastName,
    specialization: doc.docSpecialization ?? '', contactNo: doc.docContactNo ?? '', licenseNo: doc.docLicenseNo,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try { await apiPatch(`/admin/doctors/${doc.docId}`, form); onSuccess(); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit Dr. ${doc.docFirstName} ${doc.docLastName}`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={form.firstName} onChange={set('firstName')} />
          <Input label="Last Name" value={form.lastName} onChange={set('lastName')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="License No." value={form.licenseNo} onChange={set('licenseNo')} />
          <Input label="Specialization" value={form.specialization} onChange={set('specialization')} />
        </div>
        <Input label="Contact No." value={form.contactNo} onChange={set('contactNo')} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={submitting}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
