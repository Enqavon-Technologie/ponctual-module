import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  RefreshCw,
  Baby
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

import { api } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (isAdmin?: boolean) => void;
  onBackToBooking: () => void;
  initialEmail?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess, 
  onBackToBooking,
  initialEmail = ''
}) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.checkEmail(email);
      if (response.status) {
        if (email.toLowerCase() === 'ponctuel@bloom-buddies.fr') {
          setStep('password');
        } else {
          setStep('otp');
        }
      } else {
        setError(response.message || 'User not found');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.some(digit => !digit)) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await api.verifyOtp({ 
        email, 
        otp: otp.join('') 
      });
      
      if (response.status && response.data) {
        api.setToken(response.data.token);
        onLoginSuccess(false);
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.login({ email, password });
      
      if (response.status && response.data) {
        api.setToken(response.data.token);
        onLoginSuccess(email.toLowerCase() === 'ponctuel@bloom-buddies.fr');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        {/* Decorative elements - removed for admin or kept subtle */}
        {step !== 'password' && (
          <>
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/5 rounded-full -ml-16 -mb-16 blur-2xl" />
          </>
        )}

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${step === 'password' ? 'bg-slate-800 shadow-slate-200' : 'bg-brand-accent shadow-brand-accent/20'}`}>
              {step === 'password' ? <Lock size={32} /> : <Baby size={32} />}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">{t.login.title}</h2>
                  <p className="text-slate-500">{t.login.subtitle}</p>
                </div>

                <form onSubmit={handleCheckEmail} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {t.login.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.login.emailPlaceholder}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none transition-all font-medium ${error ? 'border-red-500' : 'border-slate-100'}`}
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-500 font-medium ml-1">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isLoading || !email
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-brand-accent/20'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        {t.login.sendOtp}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : step === 'otp' ? (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-blue">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">{t.login.otpTitle}</h2>
                  <p className="text-sm text-slate-500">
                    {t.login.otpSubtitle.replace('{email}', email)}
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none transition-all ${error ? 'border-red-500' : 'border-slate-100'}`}
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 font-medium text-center -mt-4">{error}</p>
                  )}

                  <div className="space-y-4">
                    <button
                      type="submit"
                      disabled={isLoading || otp.some(d => !d)}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isLoading || otp.some(d => !d)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-brand-accent/20'
                      }`}
                    >
                      {isLoading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <>
                          {t.login.verify}
                          <ShieldCheck size={20} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between px-2">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-xs font-bold text-slate-400 hover:text-brand-accent flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft size={14} /> {t.login.backToEmail}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold text-brand-accent hover:underline"
                      >
                        {t.login.resend}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="password-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="text-center mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Access</p>
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">{email}</h2>
                  <p className="text-sm text-slate-500">Enter your administrator password</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-4 py-4 rounded-xl border bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 outline-none transition-all font-medium ${error ? 'border-red-500' : 'border-slate-100'}`}
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-500 font-medium ml-1">{error}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <button
                      type="submit"
                      disabled={isLoading || !password}
                      className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isLoading || !password
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200'
                      }`}
                    >
                      {isLoading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <>
                          Login to Admin Panel
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                    >
                      Back to User Login
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-400 mb-4">{t.login.noAccount}</p>
            <button
              onClick={onBackToBooking}
              className="text-sm font-bold text-brand-accent hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} />
              {t.login.startBooking}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
