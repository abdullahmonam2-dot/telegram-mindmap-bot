'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';
import { verifyAdminPassword } from '@/actions/security';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        // In a real app, we'd set a secure cookie here.
        // For this project's simplicity, we'll use localStorage to persist the "session"
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_session_expiry', (Date.now() + 3600000).toString()); // 1 hour
        router.push('/admin');
      } else {
        setError('كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-right" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md"
      >
        <div className="w-20 h-20 bg-blue-500 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-blue-500/20">
          <Shield className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 text-center mb-2">لوحة تحكم الإدارة</h1>
        <p className="text-slate-400 text-center text-sm mb-8">يرجى إدخال الكود الرئيسي للوصول</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل الكود الرئيسي هنا..."
              className="w-full py-4 pr-14 pl-6 bg-slate-50 border border-slate-100 rounded-[20px] outline-none focus:border-blue-500 transition-all font-bold"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-extrabold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            دخول النظام
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </motion.div>
    </div>
  );
}
