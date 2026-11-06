import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { clearAdminSession, isAdminUser } from './services/adminAuth.service';
import { auth } from './services/firebase.config';

export default function App() {
  const [adminSession, setAdminSession] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) {
      setAdminSession(null);
      setIsRestoring(false);
      return;
    }

    void isAdminUser(user)
      .then(isAdmin => {
        if (isAdmin && user.email) {
          setAdminSession(user.email);
          setAuthError('');
        } else {
          return clearAdminSession();
        }
      })
      .catch(error => {
        setAuthError(error instanceof Error ? error.message : 'Could not verify admin access.');
      })
      .finally(() => setIsRestoring(false));
  }), []);

  const handleLogout = async () => {
    try {
      await clearAdminSession();
      setAdminSession(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  if (isRestoring) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Restoring admin session…</div>;
  }

  if (!adminSession) {
    return (
      <>
        {authError && <p role="alert" className="fixed inset-x-4 top-4 z-50 rounded-lg bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
        <AdminLogin onLoginSuccess={setAdminSession} />
      </>
    );
  }

  return <AdminDashboard adminEmail={adminSession} onLogout={() => void handleLogout()} />;
}
