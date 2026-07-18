import { useEffect, useState } from 'react';
import { Save, Settings, Bot } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { Card, CardTitle, Button, Input, Textarea } from '../../components/ui';

const SETTING_KEYS = [
  { key: 'clinic_name',    label: 'Clinic Name',    type: 'text', placeholder: 'RecoverEase Outpatient Clinic' },
  { key: 'clinic_address', label: 'Clinic Address',  type: 'text', placeholder: 'Cebu City, Philippines' },
  { key: 'clinic_contact', label: 'Clinic Contact',  type: 'text', placeholder: '+63 32 000 0000' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [chatPrompt, setChatPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    apiGet<Record<string, string>>('/settings').then(data => {
      setSettings(data);
      setChatPrompt(data.chatbot_system_prompt ?? '');
    });
  }, []);

  async function saveSetting(key: string, value: string) {
    await apiPost('/settings', { key, value });
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await Promise.all(SETTING_KEYS.map(s => saveSetting(s.key, settings[s.key] ?? '')));
      setSuccessMsg('Settings saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally { setSaving(false); }
  }

  async function savePrompt() {
    setSavingPrompt(true);
    try {
      await saveSetting('chatbot_system_prompt', chatPrompt);
      setSuccessMsg('Chatbot prompt saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally { setSavingPrompt(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500">Configure global system parameters</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{successMsg}</div>
      )}

      {/* Clinic Settings */}
      <Card className="space-y-5">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-400" />
          <CardTitle>Clinic Information</CardTitle>
        </div>
        <div className="space-y-4">
          {SETTING_KEYS.map(s => (
            <Input key={s.key} label={s.label} type={s.type as 'text'} placeholder={s.placeholder}
              value={settings[s.key] ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))} />
          ))}
        </div>
        <Button onClick={saveAll} loading={saving} icon={<Save size={15} />}>Save Clinic Settings</Button>
      </Card>

      {/* Chatbot System Prompt */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-gray-400" />
          <CardTitle>AI Chatbot Configuration</CardTitle>
        </div>
        <p className="text-sm text-gray-500">
          Customize the AI assistant's system prompt. Leave blank to use the default patient-context prompt. 
          The patient's name, doctor, treatment plan and medications are always injected automatically.
        </p>
        <Textarea
          label="System Prompt Override"
          value={chatPrompt}
          onChange={e => setChatPrompt(e.target.value)}
          rows={10}
          placeholder="You are RecoverEase AI, a post-treatment care assistant…&#10;&#10;Leave blank to use the built-in prompt."
          className="font-mono text-xs"
        />
        <Button onClick={savePrompt} loading={savingPrompt} icon={<Save size={15} />}>Save Chatbot Settings</Button>
      </Card>
    </div>
  );
}
