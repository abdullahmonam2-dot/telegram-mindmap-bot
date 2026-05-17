'use client';
import { useState } from 'react';
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
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('admin_session_expiry', (Date.now() + 3600000).toString());
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
    <div className="min-h-screen overflow-y-auto px-5 py-7 flex flex-col max-w-[400px] mx-auto w-full gap-2.5 bg-[#f0f4f8]">
      <span className="text-[52px] text-center block mb-1">🛡️</span>
      <h2 className="text-[20px] font-black text-[#1e293b] text-center m-0">لوحة تحكم المدير</h2>
      <p className="text-center text-[#64748b] text-[13px] m-0 mb-2">الدخول محصور بالمدير فقط</p>
      
      <form onSubmit={handleLogin} className="flex flex-col gap-2.5">
        <label className="text-[12px] font-bold text-[#374151] mb-[2px] block">الكود السري</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none focus:border-[#0ea5e9]"
          required
          dir="ltr"
        />
        
        {error && <p className="text-[#ef4444] text-[12px] font-bold text-center mt-1">{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#0ea5e9] text-white border-none rounded-[10px] py-[12px] font-extrabold text-[14px] cursor-pointer mt-2 shadow-[0_4px_14px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          دخول لوحة التحكم
        </button>

        <button 
          type="button"
          onClick={() => router.push('/')}
          className="w-full bg-[#f8fafc] text-[#334155] border border-[#e2e8f0] rounded-[10px] py-[11px] font-bold text-[13px] cursor-pointer mt-1 active:scale-95 transition-transform"
        >
          ← الرجوع للتطبيق
        </button>
      </form>
    </div>
  );
}
