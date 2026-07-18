import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Megaphone, Edit2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api';
import { Announcement } from '../../types';
import { Card, Button, Input, Textarea, Modal, Badge, EmptyState, Spinner } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<Announcement[]>('/announcements/all');
    setList(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('Delete this announcement?')) return;
    await apiDelete(`/announcements/${id}`);
    load();
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500">{list.length} announcement{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditItem(null); setShowModal(true); }}>New Announcement</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !list.length ? (
        <EmptyState icon={<Megaphone size={40} />} title="No announcements yet"
          action={<Button size="sm" onClick={() => setShowModal(true)}>Create First Announcement</Button>} />
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <Card key={a.announcementId} className="group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{a.announcementTitle}</h3>
                    <Badge variant={a.announcementPublishedAt ? 'success' : 'gray'}>
                      {a.announcementPublishedAt ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">{a.announcementContent}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    By {a.admin?.adminFirstName} {a.admin?.adminLastName}
                    {a.announcementPublishedAt && ` · Published ${formatDateTime(a.announcementPublishedAt)}`}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" icon={<Edit2 size={13} />}
                    onClick={() => { setEditItem(a); setShowModal(true); }}>Edit</Button>
                  <Button size="sm" variant="danger" icon={<Trash2 size={13} />}
                    onClick={() => del(a.announcementId)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementModal
        open={showModal}
        item={editItem}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        onSuccess={() => { setShowModal(false); setEditItem(null); load(); }} />
    </div>
  );
}

function AnnouncementModal({ open, item, onClose, onSuccess }: {
  open: boolean; item: Announcement | null; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) setForm({ title: item.announcementTitle, content: item.announcementContent });
    else setForm({ title: '', content: '' });
  }, [item]);

  const set = (k: 'title' | 'content') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      if (item) await apiPatch(`/announcements/${item.announcementId}`, form);
      else await apiPost('/announcements', { ...form, publishNow: true });
      onSuccess();
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Announcement' : 'New Announcement'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title *" value={form.title} onChange={set('title')} placeholder="System maintenance scheduled for…" />
        <Textarea label="Content *" value={form.content} onChange={set('content')} rows={6}
          placeholder="Write your announcement here…" />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={submitting}>
            {item ? 'Save Changes' : 'Publish'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
