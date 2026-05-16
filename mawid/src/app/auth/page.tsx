'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { Phone, Lock, User, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { formatWhatsAppLink } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signIn, signUp, loading } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'login'
  );
  const [role, setRole] = useState<UserRole>(
    searchParams.get('role') === 'patient' ? 'patient' : 'secretary'
  );
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

    // Check activation code for secretaries
    if (tab === 'signup' && role === 'secretary') {
      const { validateAndUseActivationCode } = await import('@/lib/db');
      const isValid = await validateAndUseActivationCode(activationCode);
      if (!isValid) {
        setError('كود التفعيل غير صحيح أو مستخدم مسبقاً. يرجى التواصل مع الإدارة.');
        setSubmitting(false);
        return;
      }
    }

    // We use a dummy email derived from the phone number for Firebase
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
      else if (msg === 'auth/email-already-in-use') {
        setError('هذا الرقم مسجل مسبقاً! الرجاء الضغط على "تسجيل الدخول" في الأعلى واستخدام كلمة مرورك. إذا نسيتها تواصل مع الإدارة.');
      } else if (msg === 'auth/too-many-requests') {
        setError('لقد قمت بمحاولات دخول كثيرة جداً في وقت قصير. يرجى الانتظار 5-10 دقائق ثم المحاولة مرة أخرى لحماية حسابك.');
      } else {
        setError('حدث خطأ أثناء التسجيل: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('sending');
    try {
      const { createPasswordResetRequest } = await import('@/lib/db');
      await createPasswordResetRequest(forgotPhone, forgotName);
      setForgotStatus('success');
    } catch (err) {
      console.error(err);
      setForgotStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-slate-50/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] bg-white p-8 sm:p-10 rounded-[40px] shadow-2xl shadow-blue-100/50 border border-slate-50"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
            <span className="text-white font-extrabold text-2xl">M</span>
          </div>
          <h1 className="font-extrabold text-2xl text-slate-900">
            {tab === 'login' ? 'أهلاً بك مجدداً' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-bold">
            {tab === 'login' ? 'سجل دخولك برقم الهاتف' : 'انضم إلينا في ثوانٍ'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-[20px] mb-8">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-3 rounded-[16px] text-sm font-bold transition-all ${
              tab === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            دخول
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-3 rounded-[16px] text-sm font-bold transition-all ${
              tab === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {tab === 'signup' && (
            <>
              {/* Role selection */}
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                    role === 'patient' ? 'border-blue-500 bg-blue-50' : 'border-slate-50 hover:border-slate-200'
                  }`}
                >
                  <User className={`w-6 h-6 ${role === 'patient' ? 'text-blue-500' : 'text-slate-300'}`} />
                  <span className={`text-[10px] font-extrabold uppercase ${role === 'patient' ? 'text-blue-600' : 'text-slate-400'}`}>مريض</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('secretary')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                    role === 'secretary' ? 'border-blue-500 bg-blue-50' : 'border-slate-50 hover:border-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-6 h-6 ${role === 'secretary' ? 'text-blue-500' : 'text-slate-300'}`} />
                  <span className={`text-[10px] font-extrabold uppercase ${role === 'secretary' ? 'text-blue-600' : 'text-slate-400'}`}>سكرتيرة</span>
                </button>
              </div>

              {/* Activation Code for Secretary */}
              {role === 'secretary' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 mb-4">
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <input
                      className="input-field pr-12 border-blue-100 bg-blue-50/30 placeholder:text-blue-300"
                      placeholder="كود تفعيل المؤسسة"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      required
                    />
                  </div>
                  <a 
                    href="https://wa.me/9647857237105" 
                    target="_blank"
                    className="text-[10px] text-blue-500 font-bold hover:underline block text-center"
                  >
                    للحصول على كود التفعيل، تواصل مع الإدارة عبر واتساب 💬
                  </a>
                </motion.div>
              )}

              <div className="relative">
                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  className="input-field !pr-14"
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="relative">
            <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              className="input-field !pr-14"
              placeholder="رقم الهاتف"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              className="input-field !pr-14"
              placeholder="كلمة المرور"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {tab === 'login' && (
              <button 
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="mt-2 text-xs font-bold text-blue-500 hover:underline px-2"
              >
                نسيت كلمة المرور؟
              </button>
            )}
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 font-bold text-center bg-red-50 py-3 px-4 rounded-2xl">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-4.5 rounded-[20px] text-base shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
          >
            {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {tab === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 mt-8 font-bold">
          بمتابعتك، أنت توافق على شروط الخدمة وسياسة الخصوصية لـ "موعد"
        </p>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            تم تطوير هذا البرنامج بواسطة <br/>
            <span className="text-blue-500 font-extrabold text-xs mt-1 block">الفريق البرمجي التابع لمؤسسة شهامة الأنبار</span>
          </p>
        </div>
      </motion.div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 relative">
              <button 
                onClick={() => { setShowForgotModal(false); setForgotStatus('idle'); }} 
                className="absolute top-6 left-6 p-2 rounded-full bg-slate-50 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-black text-slate-900">استعادة الحساب</h2>
                <p className="text-xs text-slate-400 font-bold mt-2">أدخل بياناتك ليقوم الإدمن بمساعدتك</p>
              </div>

              {forgotStatus === 'success' ? (
                <div className="text-center py-4">
                  <p className="text-sm font-bold text-green-600 bg-green-50 p-4 rounded-2xl mb-6">
                    تم إرسال طلبك بنجاح! سيقوم الإدمن بالتواصل معك عبر واتساب قريباً.
                  </p>
                  <button 
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black"
                  >
                    حسناً
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <input
                    className="input-field"
                    placeholder="اسمك الثلاثي"
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="رقم الهاتف المسجل"
                    type="tel"
                    dir="ltr"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={forgotStatus === 'sending'}
                    className="btn-primary w-full py-4 rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    {forgotStatus === 'sending' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    إرسال طلب استعادة
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}
