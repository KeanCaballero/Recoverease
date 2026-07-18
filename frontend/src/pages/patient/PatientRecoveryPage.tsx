import { useEffect, useState } from 'react';
import { Activity, Flame, Plus } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { Card, CardHeader, CardTitle, Button, Textarea, StatCard, Spinner, EmptyState } from '../../components/ui';
import { formatDate, getMoodColor, getMoodLabel } from '../../lib/utils';

function moodBg(rating: number): string {
  if (rating <= 2) return '#f87171';
  if (rating <= 4) return '#fb923c';
  if (rating <= 6) return '#facc15';
  if (rating <= 8) return '#4ade80';
  return '#34d399';
}

interface RecoveryHistory { logs: Array<{ recoveryLogId: number; recoveryLogDate: string; recoveryLogNotes: string | null; recoveryLogMoodRating: number | null }>; streak: number; totalEntries: number }

export default function PatientRecoveryPage() {
  const [history, setHistory] = useState<RecoveryHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [logNotes, setLogNotes] = useState('');
  const [mood, setMood] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    const h = await apiGet<RecoveryHistory>('/recovery/history');
    setHistory(h);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleLog() {
    if (!logNotes.trim() && mood === 0) return;
    setSaving(true);
    try {
      await apiPost('/recovery/log', { notes: logNotes, moodRating: mood || undefined });
      setSaved(true);
      setLogNotes('');
      setMood(0);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const MOOD_EMOJIS = ['', '😞', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳'];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Recovery Journal</h1>
        <p className="text-sm text-gray-500">Log your daily progress and track your recovery streak</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Recovery Streak" value={`${history?.streak ?? 0} days`} icon={<Flame size={20} />} color="yellow" />
        <StatCard label="Total Entries"   value={history?.totalEntries ?? 0}     icon={<Activity size={20} />} color="blue" />
        <StatCard label="Avg Mood (7d)"   value={(() => {
          const logs = history?.logs?.slice(0, 7) ?? [];
          const ratings = logs.filter(l => l.recoveryLogMoodRating).map(l => l.recoveryLogMoodRating!);
          return ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
        })()} icon={<span className="text-xl">🙂</span>} color="green" />
      </div>

      {/* Log form */}
      <Card className="space-y-4">
        <CardTitle>Log Today's Progress</CardTitle>
        {saved && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">✓ Entry saved successfully!</p>}
        <Textarea
          label="How are you feeling today?"
          value={logNotes}
          onChange={e => setLogNotes(e.target.value)}
          rows={4}
          placeholder="Describe your recovery progress, symptoms, activities, and how you're feeling…"
        />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Mood Rating {mood > 0 && <span className={getMoodColor(mood)}>— {mood}/10 {getMoodLabel(mood)} {MOOD_EMOJIS[mood]}</span>}</p>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setMood(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${mood === n ? 'bg-blue-600 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleLog} loading={saving} disabled={!logNotes.trim() && mood === 0} icon={<Plus size={15} />}>
          Save Entry
        </Button>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery History (Last 30 Days)</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !history?.logs?.length ? (
          <EmptyState icon={<Activity size={36} />} title="No entries yet" description="Start logging your recovery journey above." />
        ) : (
          <div className="space-y-3">
            {history.logs.map(log => (
              <div key={log.recoveryLogId} className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-center w-12 flex-shrink-0 bg-white rounded-lg py-2 shadow-sm">
                  <p className="text-xs text-gray-400">{new Date(log.recoveryLogDate).toLocaleDateString('en', { month: 'short' })}</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(log.recoveryLogDate).getDate()}</p>
                </div>
                <div className="flex-1 space-y-1">
                  {log.recoveryLogMoodRating && (
                    <p className={`text-sm font-semibold ${getMoodColor(log.recoveryLogMoodRating)}`}>
                      {MOOD_EMOJIS[log.recoveryLogMoodRating]} Mood {log.recoveryLogMoodRating}/10 — {getMoodLabel(log.recoveryLogMoodRating)}
                    </p>
                  )}
                  {log.recoveryLogNotes && <p className="text-sm text-gray-600">{log.recoveryLogNotes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
