'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { listenToSecretaryAppointments, listenToPatientAppointments, getDoctorsBySecretary, cleanupOldAppointments } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalNotificationHandler() {
  const { user } = useAuth();
  const [toast, setToast] = useState<{ id: string, msg: string } | null>(null);
  
  const secretaryInitialLoad = useRef(false);
  const patientInitialLoad = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Run cleanup once on load
    cleanupOldAppointments();

    const playAudio = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    };

    const notify = (title: string, body: string) => {
      // In-App Toast
      setToast({ id: Date.now().toString(), msg: `${title} - ${body}` });
      setTimeout(() => setToast(null), 6000);
      playAudio();

      // System Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          const options: any = {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200]
          };
          reg.showNotification(title, options);
        });
      }
    };

    let unsubscribe: () => void;

    if (user.role === 'secretary') {
      const initSecretary = async () => {
        try {
          const docs = await getDoctorsBySecretary(user.uid);
          if (docs.length) {
            const doctorIds = docs.map(d => d.id);
            unsubscribe = listenToSecretaryAppointments(doctorIds, (updatedApts) => {
              if (secretaryInitialLoad.current && updatedApts.length > 0) {
                const newestApt = updatedApts[0];
                // Check if it's truly new (added within last 10 seconds to avoid false triggers)
                const isRecent = (Date.now() - new Date(newestApt.createdAt).getTime()) < 10000;
                
                if (isRecent) {
                  notify('حجز جديد 🔔', `قام المريض ${newestApt.patientName} بطلب حجز موعد عند ${newestApt.doctorNameAr}.`);
                }
              }
              secretaryInitialLoad.current = true;
            });
          }
        } catch (e) {}
      };
      initSecretary();
    } else {
      // Patient Logic
      let previousStatusMap = new Map<string, string>();
      
      unsubscribe = listenToPatientAppointments(user.uid, (apts) => {
        if (patientInitialLoad.current) {
          apts.forEach(newApt => {
            const oldStatus = previousStatusMap.get(newApt.id);
            if (oldStatus && oldStatus !== newApt.status) {
              const title = newApt.status === 'confirmed' ? '🎉 تم تأكيد حجزك!' : '⚠️ تم إلغاء موعدك';
              const body = newApt.status === 'confirmed' 
                ? `تم تأكيد موعدك بنجاح عند ${newApt.doctorNameAr}.`
                : `نعتذر، تم إلغاء موعدك عند ${newApt.doctorNameAr}.`;
              
              notify(title, body);
            }
          });
        }
        
        // Update old map
        previousStatusMap.clear();
        apts.forEach(a => previousStatusMap.set(a.id, a.status));
        patientInitialLoad.current = true;
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 left-4 right-4 md:left-auto md:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-[999] text-sm font-bold text-right border border-slate-700 pointer-events-none"
          dir="rtl"
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
