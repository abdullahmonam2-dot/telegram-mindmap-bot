'use client';
import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Detect Platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    }

    // Android: Listen for beforeinstallprompt
    const handler = (e: any) => {
      console.log('PWA Prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Force show after 1500ms if not standalone and not dismissed recently
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    const timer = setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !dismissed) {
        setShowPrompt(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setShowPrompt(false);
      setDeferredPrompt(null);
    } else {
      // Direct instruction if native prompt is not yet ready or supported
      alert('لتثبيت التطبيق فوراً: اضغط على النقاط الثلاث (⋮) في أعلى المتصفح ثم اختر "تثبيت التطبيق" أو "Install App"');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[1000] md:left-auto md:right-10 md:w-96"
        >
          <div className="bg-white rounded-[32px] p-6 shadow-2xl border border-blue-50 relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full opacity-50" />
            
            <button 
              onClick={dismissPrompt}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-100 flex-shrink-0">
                <img src="/icon.png" alt="Mawid" className="w-10 h-10 object-contain rounded-xl" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">تطبيق موعد</h3>
                <p className="text-xs text-slate-500 font-bold">ثبته الآن لحجز أسرع وأسهل!</p>
              </div>
            </div>

            {platform === 'android' ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                تثبيت التطبيق على الهاتف
              </button>
            ) : platform === 'ios' ? (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl leading-relaxed text-center">
                  لتثبيت التطبيق على الآيفون: <br/> اضغط على زر <span className="inline-flex items-center text-blue-600"><Share className="w-4 h-4 mx-1" /> مشاركة</span> ثم اختر <span className="text-blue-600">"إضافة للشاشة الرئيسية"</span>
                </p>
                <button
                  onClick={dismissPrompt}
                  className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-extrabold transition-all"
                >
                  فهمت ذلك
                </button>
              </div>
            ) : (
              <button
                onClick={dismissPrompt}
                className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-extrabold transition-all"
              >
                حسناً
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
