'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { SPECIALTIES } from '@/lib/types';
import { formatWhatsAppLink } from '@/lib/utils';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [adIndex, setAdIndex] = useState(0);
  const [stats, setStats] = useState({ doctors: 124, appointments: 8500 });
  const [paused, setPaused] = useState(false);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#004cf6] via-[#005cfa] to-[#002f9c] px-4 pt-12 pb-10 shrink-0">
        {/* Dotted Grid Overlay from Image 2 */}
        <div 
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.5) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative premium glowing light curves */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[130px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-[10%] right-[10%] w-[45%] h-[45%] rounded-full bg-indigo-500/25 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col-reverse md:flex-row md:items-center md:gap-12 pt-4">
          
          {/* Right/Bottom Side on Mobile, Right Side on Desktop: Text Content & Stats */}
          <div className="flex flex-col text-right flex-1 w-full mt-6 md:mt-0">
            {/* Badge floating at top right */}
            <div className="self-start bg-slate-950/45 text-white/95 rounded-full px-4.5 py-1.5 text-[11px] font-extrabold mb-4.5 border border-white/10 shadow-lg backdrop-blur-md">
              الخدمات الطبية الأولى في العراق 🇮🇶
            </div>

            {/* Main Title */}
            <h1 className="text-white text-[32px] md:text-[46px] font-black leading-tight mb-4 tracking-wide">
              كل الأطباء<br/>
              <span className="text-[#20e89f] drop-shadow-[0_2px_12px_rgba(32,232,159,0.35)]">بمكان واحد</span>
            </h1>

            {/* Subtitle Badge */}
            <div className="flex items-center gap-2 text-white/95 text-[13px] mb-8 font-black self-start bg-white/5 px-4.5 py-2.5 rounded-full border border-white/10 shadow-inner backdrop-blur-sm">
              <span>وصول أسرع للطبيب</span>
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-[#20e89f] opacity-75 animate-ping"></span>
                <Clock className="w-4 h-4 text-[#20e89f] relative z-10" />
              </div>
            </div>

            {/* Search Button */}
            <button 
              onClick={() => router.push('/search')} 
              className="self-start flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#00a6ff] to-[#0082f5] hover:from-[#00b2ff] hover:to-[#008cff] text-white rounded-[16px] px-8 py-4 text-[14px] font-black shadow-[0_8px_25px_rgba(0,166,255,0.45)] mb-10 active:scale-95 transition-all duration-300 border border-white/10"
            >
              <span>ابحث عن طبيب الآن</span>
              <span className="text-[16px]">🔍</span>
            </button>

            {/* Statistics */}
            <div className="flex gap-6 justify-start mt-2">
              
              {/* Stat 3: Bookings (renders on the left in RTL, listed last) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-[42px] h-[42px] rounded-full bg-slate-950/40 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)] backdrop-blur-md">
                  <Calendar className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="flex flex-col text-right">
                  <strong className="text-[19px] font-black text-white leading-none">{stats.appointments}</strong>
                  <span className="text-[11px] text-white/50 font-extrabold mt-1">حجز</span>
                </div>
              </div>

              {/* Stat 2: Governorates (renders in the middle in RTL) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-[42px] h-[42px] rounded-full bg-slate-950/40 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)] backdrop-blur-md">
                  <MapPin className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="flex flex-col text-right">
                  <strong className="text-[19px] font-black text-white leading-none">18</strong>
                  <span className="text-[11px] text-white/50 font-extrabold mt-1">محافظة</span>
                </div>
              </div>

              {/* Stat 1: Doctors (renders on the right in RTL, listed first) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-[42px] h-[42px] rounded-full bg-slate-950/40 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)] backdrop-blur-md">
                  <Users className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="flex flex-col text-right">
                  <strong className="text-[19px] font-black text-white leading-none">{stats.doctors}</strong>
                  <span className="text-[11px] text-white/50 font-extrabold mt-1">طبيب</span>
                </div>
              </div>

            </div>

          </div>

          {/* Left/Top Side on Mobile, Left Side on Desktop: Doctors Group Image & Glowing Orbit Graphic */}
          <div className="flex justify-center mb-2 md:mb-0 relative flex-1 w-full max-w-[400px] mx-auto">
            {/* Elegant Orbit & Network nodes SVG Overlay */}
            <div className="absolute inset-0 flex items-center justify-center scale-[1.12] pointer-events-none">
              <svg className="w-[280px] h-[280px] md:w-[380px] md:h-[380px] absolute" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Dotted Orbit Circle */}
                <circle cx="50" cy="50" r="44" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.6" strokeDasharray="3 3" className="animate-[spin_80s_linear_infinite]" />
                
                {/* Inner Solid Glowing Ring */}
                <circle cx="50" cy="50" r="38" stroke="rgba(34, 211, 238, 0.28)" strokeWidth="0.4" className="animate-pulse" />
                
                {/* Orbit Nodes */}
                <circle cx="50" cy="6" r="1.2" fill="#20e89f" className="shadow-[0_0_8px_#20e89f]" />
                <circle cx="6" cy="50" r="1.2" fill="#00a6ff" className="shadow-[0_0_8px_#00a6ff]" />
                <circle cx="94" cy="50" r="1" fill="#00a6ff" />
                <circle cx="50" cy="94" r="1" fill="#20e89f" />
                
                {/* Thin network connections */}
                <path d="M 50 6 A 44 44 0 0 1 94 50" stroke="rgba(34, 211, 238, 0.12)" strokeWidth="0.4" />
                <path d="M 6 50 A 44 44 0 0 1 50 94" stroke="rgba(32, 232, 159, 0.12)" strokeWidth="0.4" />
              </svg>
            </div>

            {/* Glowing background halo */}
            <div className="absolute w-[220px] h-[220px] md:w-[300px] md:h-[300px] rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            
            {/* Doctors cutout circular container with cyan glow boundary */}
            <div className="relative z-10 w-[240px] h-[240px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,166,255,0.35)] bg-gradient-to-tr from-blue-900/30 to-indigo-950/30 backdrop-blur-sm flex items-center justify-center">
              <img
                src="/doctors_group.png"
                alt="كادر أطباء موعد"
                className="w-full h-full object-cover transform hover:scale-[1.03] transition-transform duration-700"
              />
              
              {/* Overlay gradient for premium depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#002f9c]/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── ADS BANNER ── */}
        <div className="px-4 pt-4">
          {ads.length > 0 ? (
            <div 
              className="relative bg-white rounded-[24px] overflow-hidden border border-[#e2e8f0] shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
              onMouseEnter={() => setPaused(true)} 
              onMouseLeave={() => setPaused(false)}
            >
              <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-full tracking-widest z-20">إعلان مميز</span>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={adIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  {/* Image Container: Full width, beautiful height suitable for large banners */}
                  <div className="w-full h-[180px] md:h-[220px] relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    {ads[adIndex]?.imageUrl ? (
                      <img src={ads[adIndex]?.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-[#0ea5e9] flex items-center justify-center text-white text-5xl">📢</div>
                    )}
                  </div>
                  
                  {/* Content & Action Button Underneath */}
                  <div className="p-4 flex flex-col gap-2 bg-white">
                    <p className="text-[14px] font-black text-slate-800 leading-snug">{ads[adIndex]?.title}</p>
                    <p className="text-[12px] text-slate-500 font-bold leading-relaxed line-clamp-2">{ads[adIndex]?.description}</p>
                    
                    {ads[adIndex]?.linkUrl && (
                      <button 
                        onClick={() => {
                          const url = ads[adIndex].linkUrl;
                          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                            window.open(url, '_blank');
                          } else {
                            alert('⚠️ رابط الإعلان غير آمن أو غير صحيح!');
                          }
                        }} 
                        className="w-full mt-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl py-2.5 text-[12px] font-black shadow-[0_4px_12px_rgba(14,165,233,0.2)] active:scale-95 transition-all text-center"
                      >
                        عرض التفاصيل والتواصل 🔗
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Pagination Dots */}
              {ads.length > 1 && (
                <div className="flex gap-1 justify-center py-2.5 bg-slate-50 border-t border-slate-100">
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
            /* Fallback banner - enlarged and redesigned to look like a premium option */
            <div className="bg-white rounded-[24px] border border-[#e2e8f0] p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl">📢</div>
              <div>
                <p className="text-[14px] font-black text-slate-800 mb-1">أعلن هنا وتواصل مع آلاف المرضى</p>
                <p className="text-[11px] text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                  احصل على مساحة إعلانية مميزة تظهر لجميع زوار المنصة في العراق لترويج عيادتك أو مركزك الطبي.
                </p>
              </div>
              <button 
                onClick={() => window.open(formatWhatsAppLink('07857237105', 'أريد الاستفسار عن حجز مساحة إعلانية في تطبيق موعد'), '_blank')}
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl py-2.5 text-[12px] font-black shadow-[0_4px_12px_rgba(37,211,102,0.2)] active:scale-95 transition-all"
              >
                تواصل معنا عبر واتساب 💬
              </button>
            </div>
          )}
        </div>

        {/* ── SPECIALTIES ── */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-[14px] text-slate-800">التخصصات</span>
            <button 
              onClick={() => setShowAllSpecialties(!showAllSpecialties)} 
              className="text-[#0ea5e9] text-[13px] font-bold active:scale-95 transition-transform"
            >
              {showAllSpecialties ? 'عرض أقل ↑' : 'الكل ←'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(showAllSpecialties ? Object.entries(SPECIALTIES) : Object.entries(SPECIALTIES).slice(0, 4)).map(([key, data]) => (
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

        {/* ── PREMIUM ADVERTISE CTA ── */}
        <div className="mx-4 mt-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-[20px] p-5 shadow-[0_8px_30px_rgba(245,158,11,0.25)] relative overflow-hidden border border-white/20">
          <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/30 shadow-inner">
                <span className="text-[24px]">🚀</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black text-[15px] leading-tight mb-1.5 drop-shadow-sm">هل تملك عيادة، مختبر أو مركز طبي؟</h3>
                <p className="text-white/90 text-[11px] font-bold leading-relaxed drop-shadow-sm">
                  لا تترك مرضاك يذهبون لغيرك! الآلاف يبحثون يومياً عن خدمات طبية. احجز إعلانك الممول الآن واجعل عيادتك الخيار الأول دائماً.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => window.open(formatWhatsAppLink('07857237105', 'مرحباً، أريد الاستفسار عن حجز مساحة إعلانية مميزة لعيادتي/مختبري في تطبيق موعد لزيادة الحجوزات وعدد المرضى.'), '_blank')}
              className="w-full bg-white text-orange-600 hover:bg-orange-50 rounded-[14px] py-3.5 font-black text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              🔥 نعم، أريد مضاعفة عدد مرضاي الآن!
            </button>
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

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes adProg { from { width: 0; } to { width: 100%; } }
      `}} />
    </div>
  );
}
