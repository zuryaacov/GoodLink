import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/common/Modal';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;
      if (sessionError || !data?.session) {
        setSessionReady(false);
        setError('This password reset link is invalid or expired. Please request a new one.');
        return;
      }
      setSessionReady(true);
      setError(null);
    };

    verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionReady(!!session);
      if (!session) {
        setError('This password reset link is invalid or expired. Please request a new one.');
      } else {
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const passwordErrors = useMemo(() => {
    const errors = [];
    if (!newPassword) {
      errors.push('Please enter a new password.');
      return errors;
    }
    if (newPassword.length < 8 || newPassword.length > 15) {
      errors.push('Password must be 8-15 characters.');
    }
    if (!/[A-Z]/.test(newPassword)) {
      errors.push('Password must contain at least one uppercase letter (A-Z).');
    }
    if (!/[a-z]/.test(newPassword)) {
      errors.push('Password must contain at least one lowercase letter (a-z).');
    }
    if (!/[0-9]/.test(newPassword)) {
      errors.push('Password must contain at least one number.');
    }
    return errors;
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!sessionReady) {
        throw new Error('This password reset link is invalid or expired. Please request a new one.');
      }
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors[0]);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setNewPassword('');
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#d7fec8] flex flex-col items-center px-6 pt-10 md:pt-16 pb-12 relative overflow-hidden">
      <a href="#reset-main" className="skip-to-content">
        Skip to main content
      </a>

      <div className="absolute top-[-10%] left-[-10%] size-96 bg-primary/10 blur-[120px] rounded-full" aria-hidden="true"></div>
      <div className="absolute bottom-[-10%] right-[-10%] size-96 bg-secondary-green/30 blur-[120px] rounded-full" aria-hidden="true"></div>

      <main id="reset-main" className="relative z-10 w-full max-w-md flex flex-col items-center">
        <Link to="/" className="flex items-center gap-3 mb-8 transition-colors hover:text-[#0b996f]">
          <span className="text-3xl font-black leading-tight tracking-tight text-inherit">GoodLink</span>
        </Link>

        <div className="w-full bg-white backdrop-blur-xl border border-[#d7fec8]/60 p-8 rounded-3xl shadow-2xl relative shadow-[0_0_40px_rgba(168,85,247,0.35)]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1b1b1b] mb-2">Set New Password</h1>
            <p className="text-[#1b1b1b]">Choose a new password for your account</p>
          </div>

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-sm font-bold text-[#1b1b1b] ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="........"
                  className="h-12 w-full bg-white border border-slate-200 rounded-xl px-4 pr-12 text-[#1b1b1b] focus:outline-none focus:border-primary transition-colors"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10b981] hover:text-[#10b981]/80 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="h-12 w-full bg-[#d7fec8] hover:bg-[#c9f3b9] text-[#1b1b1b] font-bold rounded-xl transition-all shadow-lg shadow-[#d7fec8]/40 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
              )}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-slate-500 hover:text-primary transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Password updated successfully"
        message={
          <p className="text-sm text-slate-600 leading-relaxed">
            Your password has been updated. Click the button below to continue to login.
          </p>
        }
        type="success"
        confirmText="GO TO LOGIN"
        onConfirm={handleGoToLogin}
        confirmButtonClass="btn-primary"
      />
    </div>
  );
};

export default ResetPasswordPage;
