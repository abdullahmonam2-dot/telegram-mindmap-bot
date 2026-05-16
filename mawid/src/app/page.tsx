'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { SPECIALTIES, Specialty } from '@/lib/types';
import { Search, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { formatWhatsAppLink } from '@/lib/utils';

const CATEGORIES: Specialty[] = ['dentistry', 'cardiology', 'dermatology', 'pediatrics', 'ophthalmology'];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [ads, setAds] = useState<any[]>([]);
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    const { getAllAds } = require('@/lib/db');
    getAllAds().then(setAds);
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setAdIndex(i => (i + 1) % ads.length), 4500);
    return () => clearInterval(timer);
  }, [ads.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── TOP SECTION: Search + Dashboard Button ── */}
      <section className="bg-white px-4 pt-16 pb-6 shadow-sm">
        <div className="page-container">

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-500 text-[11px] font-bold mb-2">
              🏥 رعاية طبية ذكية
            </span>
            <h1 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.4 }}>
              صحتك تبدأ بحجز{' '}
              <span style={{ color: '#2563eb' }}>موعد ذكي</span>
            </h1>
          </motion.div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن طبيب أو تخصص..."
                  style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem' }}
                  className="w-full py-2.5 bg-transparent outline-none text-slate-700 font-medium"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 flex-shrink-0"
                style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem' }}
              >
                بحث
              </button>
            </div>
          </form>

          {/* Dashboard Button (secretary only) */}
          {user?.role === 'secretary' && (
            <Link
              href="/secretary"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem' }}
            >
              <LayoutDashboard className="w-5 h-5" />
              لوحة تحكم السكرتيرة
            </Link>
          )}
        </div>
      </section>

      {/* ── ADS PANEL ── */}
      <section className="px-4 pt-5 pb-2">
        <div className="page-container">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
              إعلانات مميزة
            </h2>
            {ads.length > 1 && (
              <div className="flex items-center gap-1">
                {ads.map((_, i) => (
                  <button key={i} onClick={() => setAdIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === adIndex ? 'bg-blue-500 w-5' : 'bg-slate-300 w-1.5'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {ads.length > 0 ? (
            /* Real Ad Card */
            <motion.div
              key={adIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100"
            >
              {/* Ad Image */}
              <div className="relative w-full" style={{ height: '180px' }}>
                <img
                  src={ads[adIndex]?.imageUrl}
                  alt={ads[adIndex]?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow">
                  رعاية ⭐
                </div>
                {ads.length > 1 && (
                  <>
                    <button onClick={() => setAdIndex(i => (i - 1 + ads.length) % ads.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setAdIndex(i => (i + 1) % ads.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {/* Ad Text */}
              <div className="p-4 text-right">
                <h3 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#1e293b' }} className="mb-1">
                  {ads[adIndex]?.title}
                </h3>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.8rem', color: '#64748b' }} className="mb-3 leading-relaxed">
                  {ads[adIndex]?.description}
                </p>
                <button
                  onClick={() => ads[adIndex]?.linkUrl && window.open(ads[adIndex].linkUrl, '_blank')}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95"
                  style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem' }}
                >
                  عرض التفاصيل والتواصل →
                </button>
              </div>
            </motion.div>
          ) : (
            /* Placeholder Ad Card */
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
              {/* Placeholder Image Area */}
              <div
                className="relative w-full flex items-center justify-center"
                style={{ height: '180px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
              >
                <div className="text-center text-white px-6">
                  <div className="text-5xl mb-2 opacity-80">📢</div>
                  <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem', fontWeight: 700 }} className="opacity-90">
                    صورة الإعلان ستظهر هنا
                  </p>
                </div>
                <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/30">
                  🏷️ إعلان مميز
                </div>
              </div>
              {/* Placeholder Text */}
              <div className="p-5 text-right">
                <h3 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#1e293b' }} className="mb-1">
                  أعلن هنا وتواصل مع آلاف المرضى في العراق 🇮🇶
                </h3>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.8rem', color: '#64748b' }} className="mb-4 leading-relaxed">
                  هذه المساحة متاحة للعيادات والمختبرات والصيدليات للإعلان عن خدماتهم وعروضهم الحصرية مباشرةً على شاشة المرضى.
                </p>
                <button
                  onClick={() => {
                    const msg = 'أهلاً، أريد الاستفسار عن المساحة الإعلانية في تطبيق موعد 📢';
                    window.open(formatWhatsAppLink('07700000000', msg), '_blank');
                  }}
                  className="w-full py-3 rounded-2xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem', background: '#25D366', color: 'white' }}
                >
                  <span>💬</span>
                  <span>تواصل معنا عبر واتساب لحجز إعلانك</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Specialties ── */}
      <section className="px-4 py-5">
        <div className="page-container">
          <h2 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem', fontWeight: 800, color: '#334155' }} className="mb-3">
            التخصصات الطبية
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CATEGORIES.map((key) => (
              <Link
                key={key}
                href={`/search?specialty=${key}`}
                className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-500 transition-all">
                  {SPECIALTIES[key].icon}
                </div>
                <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: '#475569' }} className="text-center">
                  {SPECIALTIES[key].ar}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Medical Illustration (Bottom) ── */}
      <section className="px-4 pb-6">
        <div className="page-container">
          <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl overflow-hidden border border-blue-100 shadow-sm flex items-center justify-center py-4">
            <Image
              src="/illustration.png"
              alt="Medical illustration"
              width={320}
              height={320}
              className="mx-auto"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 text-center" style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.75rem', color: '#94a3b8' }}>
        © 2026 موعد. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
