import React, { useState, useEffect, useRef } from 'react';
import { UserData, UserRole } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Lock, User, Wrench, Upload, FileCheck, Award, X, LogIn, UserPlus, ExternalLink } from 'lucide-react';
import {
  getAuthErrorMessage,
  getUserRole,
  loginAccount,
  registerAccount,
  requestPasswordReset,
} from '../../services/api';

const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL || 'http://localhost:9000';

interface SignUpPageProps {
  onSignUpSuccess: (data: UserData, role?: UserRole) => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  const [activeTab, setActiveTab] = useState<'user' | 'aidmate'>('user');
  const [userMode, setUserMode] = useState<'login' | 'register'>('login');
  const [aidmateMode, setAidmateMode] = useState<'login' | 'register'>('login');
  const [aidmateSkill, setAidmateSkill] = useState('Plumbing');
  const [experienceYears, setExperienceYears] = useState('3');
  const [certificateName, setCertificateName] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateType, setCertificateType] = useState('Trade Certificate / ITI / Government Certification');
  const [isSubmittedForVerification, setIsSubmittedForVerification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const registering = activeTab === 'user'
      ? userMode === 'register'
      : aidmateMode === 'register';
    setIsFormValid(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      password.length >= 8 &&
      (!registering || (name.trim().length > 2 && /^\d{10}$/.test(mobile))),
    );
  }, [name, email, mobile, password, activeTab, userMode, aidmateMode]);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setMobile(value);
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCertificateFile(file);
      setCertificateName(file.name);

    }
  };

  const removeCertificate = () => {
    setCertificateFile(null);
    setCertificateName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsVerifying(true);
    setAuthError('');
    setAuthNotice('');
    try {
      if (userMode === 'register') {
        await registerAccount({ name: name.trim(), email, mobile, password, accountType: 'seeker' });
        setAuthNotice('Account created. Check your email and verify it before signing in.');
        return;
      }
      const account = await loginAccount({ email, password, accountType: 'seeker' });
      onSignUpSuccess(account, getUserRole(account));
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAidmateLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsVerifying(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const account = await loginAccount({ email, password, accountType: 'provider' });
      onSignUpSuccess(account, getUserRole(account));
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAidmateRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsVerifying(true);
    setAuthError('');
    setAuthNotice('');
    try {
      await registerAccount({
        name: name.trim(),
        email,
        mobile,
        password,
        accountType: 'provider',
        skills: [aidmateSkill],
        certificateFile,
        certificateName: certificateName ? `${certificateType} - ${certificateName}` : undefined,
        experienceYears: Number(experienceYears),
      });
      setIsSubmittedForVerification(true);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsVerifying(true);
    setAuthError('');
    setAuthNotice('');
    try {
      await requestPasswordReset(email);
      setAuthNotice('If an account exists for this email, Firebase will send a password-reset link.');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 font-sans">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-3xl shadow-xl mb-3">
          A
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">AIDO</h1>
        <p className="text-gray-500 tracking-widest text-xs font-bold mt-1 uppercase">People For People</p>
      </div>
      
      {isSubmittedForVerification ? (
        /* SUCCESSFUL AIDMATE SUBMISSION WITH CERTIFICATE */
        <div className="w-full max-w-sm bg-white p-7 rounded-3xl shadow-xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-sm">
            <FileCheck className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-1">Registration Complete!</h2>
          <p className="text-xs text-gray-600 mb-4">
            Your AidMate profile and trade certificate have been registered. Verify <strong>{email}</strong>, then sign in.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left text-xs mb-5 space-y-1.5">
            <p className="flex justify-between">
              <span className="text-gray-500">Registered Name:</span>
              <strong className="text-gray-900">{name}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Registered Email:</span>
              <strong className="text-gray-900">{email}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Registered Mobile:</span>
              <strong className="text-gray-900">+91 {mobile}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Trade Skill:</span>
              <strong className="text-emerald-700">{aidmateSkill}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Certificate:</span>
              <strong className="text-gray-900 truncate max-w-[150px]">
                {certificateName || 'Provided'}
              </strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Admin Review:</span>
              <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                Queued for Verification
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setIsSubmittedForVerification(false);
                setAidmateMode('login');
              }}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 font-bold"
            >
              Go to AidMate Login
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-gray-100">
          {/* Main Role Tabs */}
          <div className="flex border-b border-gray-100 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('user');
              }}
              className={`flex-1 pb-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'user' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>User Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('aidmate');
              }}
              className={`flex-1 pb-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'aidmate' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>AidMate Portal</span>
            </button>

          </div>

          {activeTab === 'user' && (
            /* USER / CUSTOMER LOGIN */
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-bold">
                {(['login', 'register'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setUserMode(mode);
                      setAuthError('');
                    }}
                    className={`flex-1 py-2 rounded-xl transition-all ${
                      userMode === mode ? 'bg-white text-indigo-800 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {mode === 'login' ? 'Login' : 'Create Account'}
                  </button>
                ))}
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900 mb-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Community User Portal
                </p>
                <p className="text-[11px] text-indigo-700/90 mt-0.5">
                  Request tasks, track nearby AidMates on OpenStreetMap, and rate your service.
                </p>
              </div>

              {userMode === 'register' && (
                <Input
                  id="name"
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              )}
              <Input
                id="user-email"
                label="Email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              {userMode === 'register' && <div className="space-y-1">
                <Input
                  id="mobile"
                  label="Mobile Number"
                  type="tel"
                  prefix="+91"
                  value={mobile}
                  onChange={handleMobileChange}
                  required
                  pattern="\d{10}"
                  title="Mobile number must be 10 digits"
                  placeholder="9876543210"
                />
              </div>}
              <Input
                id="user-password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={userMode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={8}
              />
              {authError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {authError}
                </p>
              )}
              {authNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{authNotice}</p>}

              <Button type="submit" disabled={!isFormValid} isLoading={isVerifying} className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700">
                {userMode === 'register' ? 'Create User Account' : 'Login as User'}
              </Button>
              {userMode === 'login' && (
                <button type="button" onClick={() => void handlePasswordReset()} className="w-full text-center text-xs font-semibold text-indigo-600 hover:underline">
                  Forgot password?
                </button>
              )}
            </form>
          )}

          {activeTab === 'aidmate' && (
            <div className="space-y-4">
              {/* AidMate Sub-navigation: Quick Login vs New Registration */}
              <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-bold mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setAidmateMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    aidmateMode === 'login'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Existing AidMate Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAidmateMode('register');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    aidmateMode === 'register'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register with Certificate</span>
                </button>
              </div>

              {aidmateMode === 'login' ? (
                /* RETURNING AIDMATE LOGIN */
                <form onSubmit={handleAidmateLoginSubmit} className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-900">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                      <LogIn className="w-3.5 h-3.5 text-emerald-600" /> Log In with Registered Email
                    </p>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      Enter your email to resume your AidMate profile, view accepted jobs, and check your ratings.
                    </p>
                  </div>

                  <Input
                    id="aidmate-login-email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <Input
                    id="aidmate-login-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                  />
                  {authError && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {authError}
                    </p>
                  )}
                  {authNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{authNotice}</p>}

                  <Button type="submit" disabled={!isFormValid} isLoading={isVerifying} className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <LogIn className="w-4 h-4" />
                    <span>Login to AidMate Account</span>
                  </Button>
                  <button type="button" onClick={() => void handlePasswordReset()} className="w-full text-center text-xs font-semibold text-emerald-700 hover:underline">
                    Forgot password?
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAidmateMode('register')}
                      className="text-xs text-emerald-700 font-bold hover:underline"
                    >
                      New AidMate? Register & submit certificate &rarr;
                    </button>
                  </div>
                </form>
              ) : (
                /* NEW AIDMATE REGISTRATION WITH CERTIFICATE UPLOAD */
                <form onSubmit={handleAidmateRegisterSubmit} className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-900">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                      <Award className="w-4 h-4 text-emerald-600" /> Register as Certified AidMate
                    </p>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      Upload your professional trade certificate so the Admin can verify your skills.
                    </p>
                  </div>

                  <Input
                    id="aidmate-name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suresh Varma"
                    required
                  />

                  <Input
                    id="aidmate-register-email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />

                  <div className="space-y-1">
                    <Input
                      id="aidmate-mobile"
                      label="Mobile Number"
                      type="tel"
                      prefix="+91"
                      value={mobile}
                      onChange={handleMobileChange}
                      required
                      pattern="\d{10}"
                      title="Mobile number must be 10 digits"
                      placeholder="9876543210"
                    />
                  </div>

                  <Input
                    id="aidmate-register-password"
                    label="Create Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                  {authError && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {authError}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Primary Skill *</label>
                      <select
                        value={aidmateSkill}
                        onChange={(e) => setAidmateSkill(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white font-medium"
                      >
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="House Cleaning">House Cleaning</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Appliance Repair">Appliance Repair</option>
                        <option value="Painting">Painting</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Experience *</label>
                      <select
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white font-medium"
                      >
                        <option value="1">1+ years</option>
                        <option value="3">3+ years</option>
                        <option value="5">5+ years</option>
                        <option value="10">10+ years</option>
                      </select>
                    </div>
                  </div>

                  {/* Trade Certificate Upload Field */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Trade / Skill Certificate</span>
                      </label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-extrabold px-1.5 py-0.5 rounded">
                        Admin Verified
                      </span>
                    </div>

                    <div>
                      <select
                        value={certificateType}
                        onChange={(e) => setCertificateType(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] bg-white text-gray-700 focus:outline-none"
                      >
                        <option value="Trade Certificate / ITI / Government Certification">Govt / ITI Trade Certificate</option>
                        <option value="Apprenticeship / Vocational Diploma">Vocational / Apprenticeship Diploma</option>
                        <option value="Employer Experience Letter">Prior Employer Experience Letter</option>
                        <option value="Self-Attested Skill Statement">Trade License / Registration Card</option>
                      </select>
                    </div>

                    {certificateFile ? (
                      <div className="bg-white border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-gray-800 truncate">{certificateName}</p>
                            <p className="text-[10px] text-gray-400">Ready for admin verification</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeCertificate}
                          className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
                          title="Remove Certificate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleCertificateUpload}
                          accept="image/*,.pdf"
                          className="hidden"
                          id="cert-upload"
                        />
                        <label
                          htmlFor="cert-upload"
                          className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                        >
                          <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                          <span className="text-xs font-bold text-gray-800">Upload Certificate File</span>
                          <span className="text-[10px] text-gray-400">JPG, PNG, or PDF up to 10MB</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={!isFormValid} isLoading={isVerifying} className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700">
                    Submit Registration & Certificate
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAidmateMode('login')}
                      className="text-xs text-gray-500 hover:text-gray-700 font-bold"
                    >
                      Already registered? Log in with mobile &rarr;
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Bottom Security Disclaimer */}
          <div className="mt-5 pt-3 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Administrator access is managed through the AIDO Admin Panel</span>
            </p>
            <a
              href={ADMIN_PANEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Open Admin Panel
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUpPage;
