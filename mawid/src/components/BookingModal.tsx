'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { secureAddAppointment } from '@/actions/admin-actions';
import { Doctor } from '@/lib/types';
import { formatIQD, getNextDays } from '@/lib/utils';
import { Calendar, CheckCircle2, X, User, Phone } from 'lucide-react';

interface BookingModalProps {
  doctor: Doctor;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({ doctor, onClose, onSuccess }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'date' | 'info' | 'done'>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayName, setSelectedDayName] = useState('');
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const days = getNextDays(7);

  const handleBook = async () => {
    if (!patientName || !patientPhone) {
      setError('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await secureAddAppointment({
        doctorId: doctor.id || 'unknown',
        doctorName: doctor.name || doctor.nameAr || '',
        doctorNameAr: doctor.nameAr || '',
        doctorSpecialty: doctor.specialty || '',
        doctorSpecialtyAr: doctor.specialtyAr || '',
        patientId: user?.uid || 'guest',
        patientName,
        patientPhone,
        date: selectedDate,
        time: 'يحدده الطبيب',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      if (res.success) {
        setStep('done');
      } else {
        setError(res.error || 'حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">حجز موعد</h2>
              <p className="text-sm text-blue-500 font-bold">{doctor.nameAr}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">

            {/* ── DONE ── */}
            {step === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">تم استلام طلبك! 🎉</h3>
                <p className="text-slate-500 text-sm mb-2">
                  طلب حجز يوم <span className="font-bold text-slate-700">{selectedDayName} {selectedDate}</span>
                </p>
                <p className="text-slate-400 text-xs mb-8">سيتصل بك كادر العيادة لتأكيد الموعد قريباً.</p>
                <button onClick={onSuccess} className="btn-primary w-full py-4 rounded-[20px]">ممتاز، شكراً</button>
              </motion.div>
            )}

            {/* ── STEP 1: DATE ONLY ── */}
            {step === 'date' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center gap-2 mb-1 text-slate-800 font-bold">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span>اختر يوم الحجز</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">الوقت يحدده الطبيب عند التأكيد</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {days.map((day) => {
                    const isWorking = doctor.workingDays.includes(day.dayName);
                    const isSelected = selectedDate === day.date;
                    return (
                      <button
                        key={day.date}
                        disabled={!isWorking}
                        onClick={() => {
                          setSelectedDate(day.date);
                          setSelectedDayName(day.dayName);
                        }}
                        className={`p-4 rounded-[20px] border-2 text-right transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                            : isWorking
                            ? 'border-slate-100 hover:border-blue-200 bg-slate-50/50'
                            : 'opacity-30 grayscale cursor-not-allowed border-transparent'
                        }`}
                      >
                        <p className="text-[11px] font-bold text-blue-500 mb-1">{day.dayName}</p>
                        <p className="text-sm font-extrabold text-slate-800">{day.label}</p>
                        {isSelected && (
                          <p className="text-[10px] text-blue-400 mt-1 font-bold">✓ تم الاختيار</p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedDate}
                  onClick={() => setStep('info')}
                  className="btn-primary w-full py-4 rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  التالي: بيانات الحجز →
                </button>
              </motion.div>
            )}

            {/* ── STEP 2: PATIENT INFO ── */}
            {step === 'info' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <button
                  onClick={() => setStep('date')}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 mb-5 hover:text-blue-500 transition-colors"
                >
                  ← رجوع لاختيار اليوم
                </button>

                {/* Selected Date Summary */}
                <div className="bg-blue-50 p-4 rounded-2xl mb-5 flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-400">اليوم المختار</p>
                    <p className="text-base font-extrabold text-slate-800">{selectedDayName}</p>
                    <p className="text-xs text-slate-500">{selectedDate}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📅</div>
                </div>

                {/* Info Note */}
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-5 flex items-start gap-2">
                  <span className="text-amber-500 text-sm flex-shrink-0">⏰</span>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    الوقت سيحدده الطبيب ويتم إبلاغك عند تأكيد الحجز من قبل العيادة.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="input-field pr-11"
                      placeholder="اسمك الكامل"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="input-field pr-11"
                      placeholder="رقم الهاتف"
                      type="tel"
                      dir="ltr"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-bold text-center mt-4">{error}</p>}

                <button
                  onClick={handleBook}
                  disabled={loading || !patientName || !patientPhone}
                  className="btn-primary w-full py-4 rounded-[20px] mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : '✅ تأكيد الحجز الآن'
                  }
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-3">
                  بضغطك على تأكيد، أنت توافق على شروط الخدمة
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
