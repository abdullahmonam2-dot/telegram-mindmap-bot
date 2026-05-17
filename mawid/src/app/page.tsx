'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { SPECIALTIES } from '@/lib/types';
import { formatWhatsAppLink } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [adIndex, setAdIndex] = useState(0);
  const [stats, setStats] = useState({ doctors: 124, appointments: 8500 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const { getAllAds, getAdminStats } = require('@/lib/db');
    getAllAds().then(setAds);
    getAdminStats().then((data: any) => {
      if (data) {
        setStats({
          doctors: data.totalDoctors || 124,
          appointments: data.totalAppointments || 8500
        });
      }
    });
  }, []);

  useEffect(() => {
    if (paused || ads.length <= 1) return;
    const timer = setInterval(() => setAdIndex(i => (i + 1) % ads.length), 3800);
    return () => clearInterval(timer);
  }, [ads.length, paused]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f4f8] pb-24">
      {/* ── HERO SECTION ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] px-4 pt-16 pb-6 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(14,165,233,0.18)_0%,transparent_60%)]" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-white/5 -top-[50px] -right-[50px]" />
        <div className="absolute w-[130px] h-[130px] rounded-full bg-emerald-500/10 -bottom-[30px] left-[20px]" />

        <div className="relative z-10 flex flex-col pt-4">
          <span className="inline-block self-start bg-white/10 text-white/85 rounded-full px-3 py-1 text-[10px] font-bold mb-2 border border-white/10">
            🇮🇶 الخدمة الطبية الأولى في العراق
          </span>
          <h1 className="text-white text-[26px] md:text-[32px] font-black leading-tight mb-2">
            احجز موعدك الطبي<br/>
            <span className="text-[#34d399]">بكل سهولة ويسر</span>
          </h1>
          <p className="text-white/60 text-xs mb-4 font-bold">لأن صحتك تبدأ بحجز موعد ذكي</p>
          
          <button 
            onClick={() => router.push('/search')} 
            className="self-start flex items-center gap-2 bg-[#0ea5e9] text-white rounded-[11px] px-5 py-2.5 text-[13px] font-bold shadow-[0_4px_14px_rgba(14,165,233,0.4)] mb-4 active:scale-95 transition-transform"
          >
            🔍 ابحث عن طبيب الآن
          </button>
          
          <div className="flex gap-5 mt-2">
            <div className="flex flex-col">
              <strong className="text-[20px] font-black text-white">{stats.doctors}</strong>
              <span className="text-[10px] text-white/50 font-bold">طبيب</span>
            </div>
            <div className="flex flex-col">
              <strong className="text-[20px] font-black text-white">18</strong>
              <span className="text-[10px] text-white/50 font-bold">محافظة</span>
            </div>
            <div className="flex flex-col">
              <strong className="text-[20px] font-black text-white">{stats.appointments}</strong>
              <span className="text-[10px] text-white/50 font-bold">حجز</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── ADS BANNER ── */}
        <div className="px-4 pt-4">
          {ads.length > 0 ? (
            <div 
              className="relative bg-white rounded-[11px] overflow-hidden border border-[#e2e8f0] shadow-[0_1px_5px_rgba(0,0,0,0.05)]"
              onMouseEnter={() => setPaused(true)} 
              onMouseLeave={() => setPaused(false)}
            >
              <span className="absolute top-1.5 right-2 text-[8px] font-bold text-[#94a3b8] tracking-widest z-10">إعلان</span>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={adIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-stretch"
                >
                  <div className="w-[90px] shrink-0 relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] to-[#3730a3] flex items-center justify-center">
                    {ads[adIndex]?.imageUrl ? (
                      <img src={ads[adIndex]?.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">📢</span>
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] font-bold text-white bg-[#be185d] rounded px-1 py-0.5">مميز</span>
                  </div>
                  <div className="flex-1 p-2.5 flex flex-col justify-center gap-1">
                    <p className="text-[12px] font-extrabold text-[#1e293b] m-0 leading-tight">{ads[adIndex]?.title}</p>
                    <p className="text-[10px] text-[#64748b] m-0 leading-relaxed line-clamp-2">{ads[adIndex]?.description}</p>
                    <div className="flex gap-1.5 mt-1">
                      {ads[adIndex]?.linkUrl && (
                        <button onClick={() => window.open(ads[adIndex].linkUrl, '_blank')} className="bg-[#0ea5e9] text-white rounded-md px-2.5 py-1 text-[10px] font-bold">
                          عرض التفاصيل
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {ads.length > 1 && (
                <div className="flex gap-1 justify-center py-1.5 bg-[#f8fafc]">
                  {ads.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setAdIndex(i); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === adIndex ? 'w-[18px] bg-[#0ea5e9]' : 'w-[7px] bg-[#e2e8f0]'}`}
                    />
                  ))}
                </div>
              )}
              {!paused && ads.length > 1 && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-[#0ea5e9]" style={{ animation: 'adProg 3.8s linear forwards' }} key={adIndex} />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[11px] border border-[#e2e8f0] p-4 text-center">
              <span className="text-3xl mb-2 block">📢</span>
              <p className="text-[12px] font-extrabold text-[#1e293b] mb-1">أعلن هنا وتواصل مع آلاف المرضى</p>
              <button 
                onClick={() => window.open(formatWhatsAppLink('07700000000', 'أريد الاستفسار عن الإعلان'), '_blank')}
                className="mt-2 bg-[#25D366] text-white rounded-md px-4 py-1.5 text-[11px] font-bold"
              >
                تواصل معنا عبر واتساب
              </button>
            </div>
          )}
        </div>

        {/* ── SPECIALTIES ── */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-[14px] text-slate-800">التخصصات</span>
            <button onClick={() => router.push('/search')} className="text-[#0ea5e9] text-[13px] font-bold">الكل ←</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPECIALTIES).map(([key, data]) => (
              <button 
                key={key} 
                onClick={() => router.push(`/search?specialty=${key}`)} 
                className="inline-flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-[30px] px-3.5 py-1.5 text-[12px] font-bold text-[#334155] shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-95 transition-transform"
              >
                {data.icon} {data.ar}
              </button>
            ))}
          </div>
        </div>

        {/* ── DOCTOR CTA ── */}
        {!user && (
          <div className="mx-4 mt-6 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-[14px] p-3.5 flex items-center gap-2.5">
            <span className="text-[26px]">👨‍⚕️</span>
            <div className="flex-1">
              <p className="text-white font-extrabold text-[13px] m-0">هل أنت طبيب؟</p>
              <p className="text-white/60 text-[11px] m-0 font-bold">سجّل عيادتك مجاناً عبر المنصة</p>
            </div>
            <button 
              onClick={() => router.push('/auth')} 
              className="bg-[#10b981] text-white rounded-[9px] px-3.5 py-2 font-bold text-[12px] shrink-0 active:scale-95 transition-transform"
            >
              سجّل الآن
            </button>
          </div>
        )}

        <div className="text-center py-6 pb-12">
          <button 
            onClick={() => router.push('/admin/login')}
            className="bg-transparent border-none text-[#cbd5e1] text-[11px] font-bold cursor-pointer"
          >
            ⚙️ دخول الإدارة
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes adProg { from { width: 0; } to { width: 100%; } }
      `}} />
    </div>
  );
}
