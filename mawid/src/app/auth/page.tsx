'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { X, AlertCircle } from 'lucide-react';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signIn, signUp, loading } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  const [role, setRole] = useState<UserRole>(searchParams.get('role') === 'secretary' ? 'secretary' : 'patient');
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'secretary') router.push('/secretary');
      else router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    // Strict Iraqi Phone Validation
    const iqPhoneRegex = /^(077|078|079|075)\d{8}$/;
    if (!iqPhoneRegex.test(phone)) {
      setError('يرجى إدخال رقم هاتف عراقي صحيح (11 رقماً يبدأ بـ 077 أو 078 أو 079 أو 075)');
      setSubmitting(false);
      return;
    }

    if (tab === 'signup' && role === 'secretary') {
      const { validateAndUseActivationCodeServer } = await import('@/actions/admin-actions');
      const isValid = await validateAndUseActivationCodeServer(activationCode);
      if (!isValid) {
        setError('كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الإدارة.');
        setSubmitting(false);
        return;
      }
    }

    const dummyEmail = `${phone.replace(/[^0-9]/g, '')}@mawid.com`;

    try {
      if (tab === 'login') {
        await signIn(dummyEmail, password);
      } else {
        if (!name || !phone) { setError('يرجى إدخال جميع البيانات'); setSubmitting(false); return; }
        await signUp(dummyEmail, password, name, phone, role);
      }
    } catch (err: any) {
      const msg = err?.code;
      if (msg === 'auth/invalid-credential' || msg === 'auth/wrong-password' || msg === 'auth/user-not-found') 
        setError('رقم الهاتف أو كلمة المرور غير صحيحة');
      else if (msg === 'auth/weak-password') 
        setError('كلمة المرور يجب أن تكون 6 أرقام أو حروف على الأقل');
      else if (msg === 'auth/email-already-in-use') 
        setError('هذا الرقم مسجل مسبقاً! الرجاء استخدام تسجيل الدخول.');
      else if (msg === 'auth/too-many-requests') 
        setError('لقد قمت بمحاولات دخول كثيرة جداً. يرجى الانتظار لحماية حسابك.');
      else setError('حدث خطأ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('sending');
    try {
      const { createRecoveryRequestServer } = await import('@/actions/admin-actions');
      const res = await createRecoveryRequestServer(forgotPhone, forgotName);
      if (res.success) {
        setForgotStatus('success');
      } else {
        alert('فشل الإرسال: ' + res.error);
        setForgotStatus('idle');
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء الاتصال: ' + err.message);
      setForgotStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto px-5 py-7 flex flex-col max-w-[400px] mx-auto w-full gap-2.5 bg-[#f0f4f8]">
      <span className="text-[48px] text-center block mb-1">🔐</span>
      <h2 className="text-[20px] font-black text-[#1e293b] text-center m-0 mb-4">
        {tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
      </h2>

      <div className="flex rounded-[9px] overflow-hidden border border-[#e2e8f0] mb-2 bg-[#f8fafc]">
        <button
          type="button"
          onClick={() => setRole('patient')}
          className={`flex-1 border-none py-[9px] font-bold text-[12px] cursor-pointer transition-colors ${
            role === 'patient' ? 'bg-[#0ea5e9] text-white' : 'bg-transparent text-[#64748b]'
          }`}
        >
          👤 مريض
        </button>
        <button
          type="button"
          onClick={() => setRole('secretary')}
          className={`flex-1 border-none py-[9px] font-bold text-[12px] cursor-pointer transition-colors ${
            role === 'secretary' ? 'bg-[#0ea5e9] text-white' : 'bg-transparent text-[#64748b]'
          }`}
        >
          👨‍⚕️ سكرتير
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {tab === 'signup' && (
          <>
            <label className="text-[12px] font-bold text-[#374151] mb-[2px] block">الاسم الكامل *</label>
            <input
              className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="اسمك الكامل"
              required
            />
            
            {role === 'secretary' && (
              <>
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] p-[10px] flex items-center gap-[10px] my-2">
                  <span className="text-[18px]">🔑</span>
                  <div>
                    <p className="font-bold text-[12px] m-0 text-[#1e293b]">كود التفعيل مطلوب</p>
                    <p className="text-[11px] text-[#64748b] m-0">احصل على الكود من الإدارة</p>
                  </div>
                </div>
                <label className="text-[12px] font-bold text-[#374151] mb-[2px] block">كود التفعيل *</label>
                <input
                  className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9] uppercase tracking-widest font-bold"
                  value={activationCode}
                  onChange={e => setActivationCode(e.target.value)}
                  placeholder="XXXXXX-XXXX"
                  required
                />
                <a 
                  href="https://wa.me/9647857237105" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-right text-[11px] font-extrabold text-[#0ea5e9] hover:underline flex items-center gap-1 mt-1"
                >
                  <span>💬</span>
                  اضغط هنا للتواصل مع الإدارة والحصول على الكود (07857237105)
                </a>
              </>
            )}
          </>
        )}

        <label className="text-[12px] font-bold text-[#374151] mb-[2px] block">رقم الهاتف {tab==='signup'&&'*'}</label>
        <input
          className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="07X XXXX XXXX"
          type="tel"
          dir="ltr"
          required
        />

        <div className="relative">
          <label className="text-[12px] font-bold text-[#374151] mb-[2px] block flex justify-between">
            <span>كلمة المرور {tab==='signup'&&'*'}</span>
            {tab === 'login' && (
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)}
                className="bg-transparent border-none text-[#0ea5e9] text-[11px] font-bold cursor-pointer hover:underline"
              >
                نسيت الكلمة؟
              </button>
            )}
          </label>
          <input
            type="password"
            className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            dir="ltr"
          />
        </div>

        {error && (
          <p className="text-[12px] text-[#ef4444] text-center bg-[#fef2f2] border border-[#fecaca] rounded-[8px] py-2 px-3 font-bold my-1">
            {error}
          </p>
        )}

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full bg-[#0ea5e9] text-white border-none rounded-[10px] py-[12px] font-extrabold text-[14px] cursor-pointer mt-2 shadow-[0_4px_14px_rgba(14,165,233,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
        </button>

        <button 
          type="button"
          onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }}
          className="w-full bg-[#f8fafc] text-[#334155] border border-[#e2e8f0] rounded-[10px] py-[11px] font-bold text-[13px] cursor-pointer mt-1 active:scale-95 transition-transform"
        >
          {tab === 'login' ? 'إنشاء حساب جديد' : 'لديك حساب؟ سجل دخولك'}
        </button>
      </form>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-[360px] rounded-[24px] shadow-2xl p-8 relative">
              <button 
                onClick={() => { setShowForgotModal(false); setForgotStatus('idle'); }} 
                className="absolute top-4 left-4 p-2 rounded-full bg-[#f8fafc] text-[#94a3b8]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6">
                <span className="text-[40px] block mb-2">🆘</span>
                <h2 className="text-[18px] font-black text-[#1e293b] m-0">استعادة الحساب</h2>
                <p className="text-[12px] text-[#64748b] font-bold mt-1 mb-0">أدخل بياناتك ليقوم الإدمن بمساعدتك</p>
              </div>

              {forgotStatus === 'success' ? (
                <div className="text-center py-4">
                  <span className="text-[40px] block mb-2">✅</span>
                  <p className="text-[14px] font-bold text-[#1e293b]">تم إرسال طلبك بنجاح!</p>
                  <p className="text-[12px] text-[#64748b] mb-6">سيقوم الإدمن بالتواصل معك على واتساب قريباً.</p>
                  <button onClick={() => setShowForgotModal(false)} className="w-full bg-[#0ea5e9] text-white rounded-[10px] py-2.5 font-bold text-[13px]">
                    حسناً، فهمت
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[12px] font-bold text-[#374151] mb-1 block">رقم الهاتف المسجل</label>
                    <input 
                      className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]" 
                      value={forgotPhone} 
                      onChange={e => setForgotPhone(e.target.value)} 
                      required 
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#374151] mb-1 block">اسمك الكامل</label>
                    <input 
                      className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]" 
                      value={forgotName} 
                      onChange={e => setForgotName(e.target.value)} 
                      required 
                    />
                  </div>
                  <button 
                    disabled={forgotStatus === 'sending'} 
                    className="w-full bg-[#10b981] text-white rounded-[10px] py-[11px] font-bold text-[13px] mt-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {forgotStatus === 'sending' ? 'جاري الإرسال...' : 'إرسال طلب استعادة'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f4f8]" />}>
      <AuthContent />
    </Suspense>
  );
}
