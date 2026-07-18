import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card } from '../../components/ui';

export default function ConsentPage() {
  const { acceptConsent } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    if (!agreed) return;
    setSubmitting(true);
    try {
      await acceptConsent();
      navigate('/patient/dashboard');
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl">
            <Shield className="text-blue-600" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Data Privacy Consent</h1>
          <p className="text-gray-500 text-sm">Please read and agree to our data privacy policy before using RecoverEase.</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 space-y-4 max-h-80 overflow-y-auto text-sm text-gray-700 leading-relaxed border border-gray-200">
          <h3 className="font-semibold text-gray-900">Collection and Use of Personal Health Information</h3>
          <p>RecoverEase collects and processes personal health information including your name, contact details, medical history, treatment plans, medication schedules, and recovery progress logs. This data is collected solely for the purpose of supporting your post-treatment recovery.</p>
          <h3 className="font-semibold text-gray-900">How We Use Your Data</h3>
          <p>Your health information is used to: (1) provide personalized post-treatment care and monitoring; (2) enable your assigned healthcare provider to track your recovery progress; (3) generate medication reminders and appointment notifications; (4) provide AI-assisted chat guidance on post-treatment care; and (5) generate recovery reports for your healthcare team.</p>
          <h3 className="font-semibold text-gray-900">Data Sharing</h3>
          <p>Your health information is shared only with your assigned healthcare provider and authorized system administrators. We do not share your data with third parties for marketing or commercial purposes.</p>
          <h3 className="font-semibold text-gray-900">AI Chatbot Interactions</h3>
          <p>Messages sent to the AI assistant are processed to provide recovery guidance and may be reviewed by your healthcare provider if critical health concerns are detected. The AI does not replace professional medical advice.</p>
          <h3 className="font-semibold text-gray-900">Your Rights</h3>
          <p>You have the right to access, correct, or request deletion of your personal health information. You may withdraw consent at any time by contacting your healthcare provider, though this may limit access to certain features.</p>
          <h3 className="font-semibold text-gray-900">Data Security</h3>
          <p>We implement industry-standard security measures including encrypted data transmission, secure authentication, and role-based access control to protect your health information.</p>
          <p>In compliance with the Data Privacy Act of 2012 (Republic Act 10173) of the Philippines.</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${agreed ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
            onClick={() => setAgreed(p => !p)}>
            {agreed && <CheckCircle size={14} className="text-white" />}
          </div>
          <p className="text-sm text-gray-700">
            I have read and understood the data privacy policy. I consent to the collection, processing, and use of my personal health information as described above for the purposes of my post-treatment care and recovery management.
          </p>
        </label>

        <Button onClick={handleAccept} disabled={!agreed} loading={submitting} className="w-full" size="lg">
          Accept & Continue
        </Button>
      </Card>
    </div>
  );
}
