import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { getAdminAuthErrorMessage, loginAdmin } from '../services/adminAuth.service';

interface AdminLoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const adminEmail = await loginAdmin(email.trim(), password);
      onLoginSuccess(adminEmail);
    } catch (loginError) {
      setError(getAdminAuthErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-green-100 text-[#166534] font-bold px-3 py-1 rounded-full text-xs mb-3">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            AIDO ADMIN CONSOLE
          </div>
          <h1 className="text-3xl font-extrabold text-[#172033] tracking-tight">AIDO</h1>
          <p className="text-xs font-bold text-[#16A34A] tracking-widest mt-1">
            PEOPLE FOR PEOPLE — YOUR NEED. THEIR OPPORTUNITY.
          </p>
          <p className="text-xs text-[#64748B] mt-2">
            Unified Customer & AIDMATE Firebase Management
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#172033] mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#16A34A]"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#172033] mb-1">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#16A34A]"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#166534] text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
          >
            <Lock className="w-4 h-4" />
            {isSubmitting ? 'Signing in…' : 'Login to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}