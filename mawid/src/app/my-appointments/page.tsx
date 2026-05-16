'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { listenToPatientAppointments } from '@/lib/db';
import { Appointment } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const STATUS_MAP = {
  pending:   { label: 'قيد الانتظار', cls: 'status-pending' },
  confirmed: { label: 'مؤكد',          cls: 'status-confirmed' },
  cancelled: { label: 'ملغى',          cls: 'status-cancelled' },
  completed: { label: 'مكتمل',         cls: 'status-completed' },
};

export default function MyAppointmentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
    // Secretary should not access patient pages
    if (!loading && user?.role === 'secretary') router.push('/secretary');
    if (user && user.role !== 'secretary') {
      // Register Service Worker for Patients
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
      }

      const unsubscribe = listenToPatientAppointments(user.uid, (apts) => {
        setAppointments(apts);
        setFetching(false);
      });

      // Request permission on load
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission();
      }

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="page-container py-8 space-y-4">
        {[1, 2, 3].map(n => (
          <div key={n} className="card p-5 space-y-3">
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // SECURE RENDER GUARD: Prevent rendering if not logged in or if user is a secretary
  if (!user || user.role === 'secretary') {
    return null; // Wait for router.push to redirect
  }

  return (
    <div className="page-container py-8 relative min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">مواعيدي</h1>
        <button 
          onClick={async () => {
            if ('Notification' in window) {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                showToast('✅ تم تفعيل إشعارات الهاتف بنجاح');
              }
            }
          }}
          className="text-[10px] font-bold px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full flex items-center gap-1 border border-orange-100"
        >
          🔔 تفعيل التنبيهات
        </button>
      </div>

      {appointments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <span className="text-6xl block mb-4">📋</span>
          <h2 className="font-bold text-slate-700 mb-2">لا توجد مواعيد بعد</h2>
          <p className="text-slate-400 text-sm mb-6">احجز موعدك الأول الآن</p>
          <button onClick={() => router.push('/search')} className="btn-primary">
            ابحث عن طبيب
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt, i) => {
            const status = STATUS_MAP[apt.status];
            return (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{apt.doctorNameAr}</h3>
                    <p className="text-blue-600 text-sm font-medium">{apt.doctorSpecialtyAr}</p>
                  </div>
                  <span className={`badge flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-slate-500">
                  <span>📅 {apt.date}</span>
                  <span>⏰ {apt.time}</span>
                </div>
                {apt.notes && (
                  <p className="text-xs text-slate-400 mt-2 bg-slate-50 rounded-xl px-3 py-2">
                    {apt.notes}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* In-App Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-50 text-xs font-bold leading-relaxed text-right border border-slate-700"
          dir="rtl"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
