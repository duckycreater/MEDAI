import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth, googleProvider } from '../firebaseConfig';
import { Activity, Mail, Phone, Lock, ChevronRight, Smartphone, AlertCircle, CheckCircle, Shield } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

type AuthMethod = 'email' | 'phone';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [codeSent, setCodeSent] = useState(false);

  // Initialize Recaptcha ONCE when component mounts
  useEffect(() => {
    // We check if the element exists. In this new layout, we ensure #recaptcha-container is always rendered.
    try {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                   // reCAPTCHA solved automatically
                   console.log("Recaptcha verified automatically");
                },
                'expired-callback': () => {
                    setError("Recaptcha expired. Please try again.");
                }
            });
        }
    } catch (e) {
        console.warn("Recaptcha init warning (likely re-render):", e);
    }

    return () => {
        // Cleanup not strictly necessary for single-page app auth flows, 
        // but good practice to clear if unmounting to prevent memory leaks or ID conflicts.
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            } catch (e) {}
        }
    };
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await auth.signInWithPopup(googleProvider);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (result.user) {
            await result.user.updateProfile({
                displayName: displayName || 'Doctor'
            });
        }
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      // Friendly error messages
      if (err.code === 'auth/wrong-password') setError("Incorrect password.");
      else if (err.code === 'auth/user-not-found') setError("No account found with this email.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 1. Validate Input
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone) {
        setError("Please enter a phone number.");
        setLoading(false);
        return;
    }

    // 2. Format for Firebase (+CountryCode)
    // Assuming Vietnam (+84) default if no + provided
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+84' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+84' + formattedPhone;
    }

    // 3. Ensure Verifier Exists
    if (!window.recaptchaVerifier) {
         try {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible'
            });
        } catch(e) {
            setError("Security check failed. Please refresh the page.");
            setLoading(false);
            return;
        }
    }

    try {
      const confirmationResult = await auth.signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier);
      setVerificationId(confirmationResult);
      setCodeSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-phone-number') {
          setError("The phone number format is incorrect.");
      } else if (err.code === 'auth/argument-error') {
          setError("System error: Recaptcha not ready. Please refresh.");
      } else {
          setError(err.message || "Failed to send SMS.");
      }
      
      // Reset recaptcha on error to allow retry
      if(window.recaptchaVerifier) {
          try {
              window.recaptchaVerifier.render().then((widgetId: any) => {
                 (window as any).grecaptcha.reset(widgetId);
              });
          } catch(e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verificationId.confirm(verificationCode);
      onLoginSuccess();
    } catch (err: any) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-slate-50 z-0"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-medical-200/40 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-200/40 rounded-full blur-[100px] mix-blend-multiply animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[80px] mix-blend-multiply animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-lg bg-white/70 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/80 overflow-hidden relative z-10 transition-all duration-500 hover:shadow-medical-500/10">
        
        {/* Header Section */}
        <div className="p-10 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-medical-600 to-teal-500 rounded-3xl text-white shadow-xl shadow-medical-500/30 mb-8 transform hover:scale-105 transition-transform duration-300">
             <Activity size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold text-black tracking-tight mb-2">MediDICOM <span className="text-medical-600">AI</span></h1>
          <p className="text-slate-500 font-medium">Professional Diagnostic Support System</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="mt-8 mx-10 p-1.5 bg-slate-100/80 rounded-2xl flex relative">
           {/* Animated Background Slider could go here for polish, simplified for now */}
           <button 
             onClick={() => { setAuthMethod('email'); setError(''); }}
             className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2
                ${authMethod === 'email' ? 'bg-white text-medical-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Mail size={18} /> Email
           </button>
           <button 
             onClick={() => { setAuthMethod('phone'); setError(''); }}
             className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2
                ${authMethod === 'phone' ? 'bg-white text-medical-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Smartphone size={18} /> Phone
           </button>
        </div>

        <div className="p-10 relative">
           {/* Invisible Recaptcha Container - Must be in DOM */}
           <div id="recaptcha-container"></div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
               <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
               <p className="text-sm text-red-600 font-bold">{error}</p>
            </div>
          )}

          {authMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-5 animate-fade-in">
              {isRegistering && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Activity className="text-slate-400 group-focus-within:text-medical-500 transition-colors" size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Full Name (e.g. Dr. Minh)" 
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/10 transition-all font-medium text-black placeholder:text-slate-400"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                    />
                  </div>
              )}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-slate-400 group-focus-within:text-medical-500 transition-colors" size={20} />
                </div>
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/10 transition-all font-medium text-black placeholder:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-slate-400 group-focus-within:text-medical-500 transition-colors" size={20} />
                </div>
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/10 transition-all font-medium text-black placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                {!loading && <ChevronRight size={18} />}
              </button>

              <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
                    className="text-sm text-slate-500 font-bold hover:text-medical-600 transition-colors"
                  >
                    {isRegistering ? 'Already have an account? Sign In' : 'New Doctor? Create Account'}
                  </button>
              </div>
            </form>
          )}

          {authMethod === 'phone' && (
            <div className="space-y-5 animate-slide-up">
               {!codeSent ? (
                  <form onSubmit={handleSendPhoneCode} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
                        <Shield className="text-medical-600 shrink-0" size={20} />
                        <p className="text-xs text-medical-800 leading-relaxed font-medium">
                            We use standard SMS verification. Standard message rates may apply. Format: <span className="font-bold font-mono">0901234567</span> or <span className="font-bold font-mono">+84...</span>
                        </p>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone className="text-slate-400 group-focus-within:text-medical-500 transition-colors" size={20} />
                        </div>
                        <input 
                            type="tel" 
                            placeholder="Phone Number" 
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/10 transition-all font-medium text-black placeholder:text-slate-400 font-mono text-lg"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
                    >
                        {loading ? 'Sending Code...' : 'Send SMS Code'}
                        {!loading && <ChevronRight size={18} />}
                    </button>
                  </form>
               ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-5 animate-slide-up">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-100">
                            <CheckCircle size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Code sent to</p>
                        <p className="text-lg font-mono font-bold text-black">{phoneNumber}</p>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="text-slate-400 group-focus-within:text-medical-500 transition-colors" size={20} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="------" 
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/10 transition-all font-medium text-black text-center tracking-[1em] font-mono text-xl"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            maxLength={6}
                            required
                        />
                    </div>
                     <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-medical-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-medical-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-medical-500/30"
                    >
                        {loading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setCodeSent(false)} 
                        className="w-full text-sm text-slate-500 font-bold hover:text-black transition-colors"
                    >
                        Change Phone Number
                    </button>
                  </form>
               )}
            </div>
          )}

          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Or continue with</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3 group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;