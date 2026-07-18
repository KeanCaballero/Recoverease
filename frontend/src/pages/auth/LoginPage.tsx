import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Spinner } from '../../components/ui';
import { cn } from '../../lib/utils';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setError('');
    setSubmitting(true);
    try {
      const authUser = await login(email, password);
      if (authUser.needsConsent) navigate('/consent');
      else navigate(`/${authUser.role}/dashboard`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const demoAccounts = [
    { label: 'Admin', email: 'admin@recoverease.app', pw: 'Admin@123', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { label: 'Doctor', email: 'dr.santos@recoverease.app', pw: 'Doctor@123', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: 'Patient', email: 'juan.dela.cruz@email.com', pw: 'Patient@123', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Activity className="text-white" size={22} />
          </div>
          <span className="text-white text-xl font-bold">RecoverEase</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Post-Treatment<br />Care, Simplified.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            A comprehensive recovery management platform connecting patients and healthcare providers through intelligent monitoring, medication tracking, and AI-assisted support.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Medication Tracking', icon: '💊' },
              { label: 'AI Chat Support',     icon: '🤖' },
              { label: 'Recovery Monitoring', icon: '📈' },
              { label: 'Appointment Management', icon: '📅' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-2xl">{f.icon}</span>
                <p className="text-white text-sm font-medium mt-2">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">© 2025 RecoverEase. All rights reserved.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <Activity size={28} />
              <span className="text-2xl font-bold">RecoverEase</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={<Mail size={15} />}
              autoComplete="email"
              autoFocus
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={15} /></span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign in
            </Button>
          </form>

          {/* Demo quick-login */}
          <div className="space-y-3">
            <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide">Quick demo login</p>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.pw); }}
                  className={cn('text-xs font-medium py-2 px-3 rounded-lg border transition-all hover:opacity-80', acc.color)}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">Click a role to fill credentials, then sign in</p>
          </div>
        </div>
      </div>
    </div>
  );
}
