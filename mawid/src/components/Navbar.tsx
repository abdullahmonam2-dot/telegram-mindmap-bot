'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50">
      <div className="page-container h-20 flex items-center justify-between gap-4">
        {/* Left Side: Logo & Menu */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">موعد</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm font-bold text-slate-600 hover:text-blue-500 transition-colors">
              الأطباء
            </Link>
            <Link href="#" className="text-sm font-bold text-slate-600 hover:text-blue-500 transition-colors">
              الخدمات
            </Link>
            <Link href="#" className="text-sm font-bold text-slate-600 hover:text-blue-500 transition-colors">
              عن المنصة
            </Link>
          </nav>
        </div>

        {/* Right Side: Search, Lang, User */}
        <div className="flex items-center gap-3">
          {user?.role === 'secretary' && (
            <Link href="/secretary" className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-blue-100 transition-all">
              <span>🗂️</span> لوحة التحكم
            </Link>
          )}
          
          <button 
            onClick={() => router.push('/search')}
            className="p-2.5 rounded-2xl hover:bg-slate-50 text-slate-500 transition-all"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>

          <div className="h-6 w-px bg-slate-100 mx-1" />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  {user.name.charAt(0)}
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-slate-50 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-slate-50">
                      <p className="text-xs text-slate-400 font-bold mb-1">حساب المستخدم</p>
                      <p className="font-bold text-sm text-slate-800 truncate">{user.name}</p>
                    </div>
                    <div className="py-2">
                      {user.role === 'secretary' ? (
                        <Link href="/secretary" className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                          <span>🗂️</span> لوحة التحكم
                        </Link>
                      ) : (
                        <Link href="/my-appointments" className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <span>📋</span> مواعيدي
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                        <span>🚪</span> تسجيل الخروج
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/auth" className="btn-primary py-2.5 px-6 rounded-2xl text-sm shadow-xl shadow-blue-100">
              دخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
