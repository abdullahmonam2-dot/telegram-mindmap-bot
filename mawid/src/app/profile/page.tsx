'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-[#f0f4f8]" />;
  }

  return (
    <div className="min-h-screen overflow-y-auto px-5 py-7 flex flex-col max-w-[400px] mx-auto w-full gap-2.5 bg-[#f0f4f8]">
      <span className="text-[48px] text-center block mb-1">👤</span>
      <h2 className="text-[20px] font-black text-[#1e293b] text-center m-0 mb-6">حسابي</h2>

      <div className="bg-white rounded-[16px] p-5 border border-[#e2e8f0] mb-4">
        <div className="mb-4">
          <label className="text-[12px] font-bold text-[#64748b] block mb-1">الاسم الكامل</label>
          <p className="font-extrabold text-[#1e293b] text-[15px] m-0">{user.name}</p>
        </div>
        <div className="mb-2">
          <label className="text-[12px] font-bold text-[#64748b] block mb-1">رقم الهاتف</label>
          <p className="font-extrabold text-[#1e293b] text-[15px] m-0" dir="ltr">{user.phone}</p>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] rounded-[10px] py-[12px] font-extrabold text-[14px] cursor-pointer mt-2 active:scale-95 transition-transform"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
