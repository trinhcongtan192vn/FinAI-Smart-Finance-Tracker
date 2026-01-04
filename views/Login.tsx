
import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { HelpCircle, AlertTriangle, ExternalLink, Chrome, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ResetPasswordView } from '../components/auth/ResetPasswordView';
import { LoginView } from '../components/auth/LoginView';
import { GuestHelpModal } from '../components/auth/GuestHelpModal';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = "-5008015561";

export const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-App Browser State
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Need email state lifted up for password reset flow
  const [emailForReset, setEmailForReset] = useState('');

  // Guest Help State
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // Detect In-App Browsers (Facebook, Instagram, Zalo, etc.)
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isInApp = /(FBAN|FBAV|Instagram|Zalo|Line|Twitter|LinkedIn|Snapchat)/i.test(ua);
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);

    setIsAndroid(android);
    setIsIOS(ios);

    if (isInApp) {
      if (android) {
        // ANDROID: Try to Auto-redirect to Chrome using Intent Scheme
        // This forces the OS to open the URL in the default browser (usually Chrome)
        const currentUrl = window.location.href.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;

        // Attempt redirect
        window.location.href = intentUrl;

        // Show overlay as fallback in case redirect fails or Chrome isn't installed
        setIsInAppBrowser(true);
      } else {
        // iOS: Cannot auto-redirect. Must show overlay.
        setIsInAppBrowser(true);
      }
    }
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const setPasscodeVerified = () => {
    console.log("[Login] Setting passcode verified session key");
    sessionStorage.setItem('finai_passcode_verified', 'true');
  };

  const sendTelegramNotification = async (userEmail: string | null, method: string) => {
    try {
      const message = `
🚀 *New User Registration (${method})*
---------------------------
👤 *Email:* ${userEmail || 'Unknown'}
📅 *Time:* ${new Date().toLocaleString('vi-VN')}
        `;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (tgError) {
      console.warn("Telegram notification failed:", tgError);
    }
  };

  const handleEmailAuth = async (emailInput: string, passInput: string) => {
    setError(null);
    setIsLoading(true);
    setEmailForReset(emailInput);

    try {
      if (isLogin) {
        console.log("[Login] Attempting sign in...");
        await signInWithEmailAndPassword(auth, emailInput, passInput);
        console.log("[Login] Sign in success. Setting verify flag.");
        setPasscodeVerified();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passInput);
        setPasscodeVerified();
        // Save the currently selected language to the user profile
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid,
          onboarded: false,
          initialBalance: 0,
          language: i18n.language
        });

        // Send Telegram Notification
        sendTelegramNotification(userCredential.user.email, "Email/Password");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError(t('login.auth_error.invalid_credential'));
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('login.auth_error.email_in_use'));
        setTimeout(() => {
          setIsLogin(true);
          setError(null);
        }, 2000);
      } else if (err.code === 'auth/weak-password') {
        setError(t('login.auth_error.weak_password'));
      } else {
        setError(t('login.auth_error.general'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      console.log("[Login] Starting Google Sign In...");
      const result = await signInWithPopup(auth, provider);
      console.log("[Login] Google Sign In Success. Setting verify flag.");
      setPasscodeVerified();

      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          uid: user.uid,
          onboarded: false,
          initialBalance: 0,
          language: i18n.language
        });

        sendTelegramNotification(user.email, "Google");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(t('login.auth_error.google_failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChromeIOS = () => {
    // Try to open in Chrome on iOS using URL Scheme
    const currentUrl = window.location.href.replace(/^https?:\/\//, '');
    window.location.href = `googlechrome://${currentUrl}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-white font-display text-text-main relative">

      {/* In-App Browser Warning Overlay */}
      {isInAppBrowser && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-red-500/50 animate-bounce">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-3xl font-black mb-4 leading-tight">Trình duyệt không hỗ trợ</h2>
          <p className="text-base font-medium text-slate-300 leading-relaxed mb-10 max-w-sm">
            Google chặn đăng nhập qua ứng dụng này vì lý do bảo mật (Lỗi 403 disallowed_useragent).
          </p>

          <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 max-w-xs w-full mb-6">
            <p className="text-sm font-bold text-white mb-2">Vui lòng thực hiện:</p>
            <ol className="text-left text-sm text-slate-400 space-y-3 list-decimal list-inside">
              <li>Nhấn vào dấu <strong>3 chấm (•••)</strong> ở góc màn hình.</li>
              <li>Chọn <strong>"Mở bằng trình duyệt"</strong> (Safari/Chrome).</li>
            </ol>
          </div>

          {/* IOS Helper Button */}
          {isIOS && (
            <button
              onClick={handleOpenChromeIOS}
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-100 transition-all active:scale-95"
            >
              <Chrome size={18} />
              Thử mở bằng Chrome
            </button>
          )}

          <div className="mt-8 flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">
            <ExternalLink size={16} /> Mở bên ngoài để tiếp tục
          </div>
        </div>
      )}

      {/* Top Bar Actions */}
      <div className="absolute top-6 right-6 flex gap-3 z-50">
        <button
          onClick={() => setShowHelpModal(true)}
          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <HelpCircle size={18} />
        </button>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <button
            onClick={() => changeLanguage('vi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${i18n.language === 'vi' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            VN
          </button>
          <button
            onClick={() => changeLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${i18n.language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-100 overflow-hidden mb-2 p-2">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="FinAI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">FinAI</h1>
          <p className="text-slate-500 font-medium">Smart Finance Tracker</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white relative overflow-hidden transition-all duration-300">

          {isForgotPassword ? (
            <ResetPasswordView
              onBack={() => { setIsForgotPassword(false); setError(null); }}
              emailInitial={emailForReset}
            />
          ) : (
            <LoginView
              isLogin={isLogin}
              setIsLogin={setIsLogin}
              onForgotPassword={() => { setIsForgotPassword(true); setError(null); }}
              onGoogleSignIn={handleGoogleSignIn}
              onSubmit={handleEmailAuth}
              error={error}
              setError={setError}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {showHelpModal && <GuestHelpModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
};
