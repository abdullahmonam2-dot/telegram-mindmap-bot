'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Doctor, SPECIALTIES, Specialty } from '@/lib/types';
import { getDoctor } from '@/lib/db';
import { DEMO_DOCTORS, formatIQD, formatWhatsAppLink } from '@/lib/utils';
import BookingModal from '@/components/BookingModal';
import { useAuth } from '@/lib/auth-context';
import { ProfileSkeleton } from '@/components/Skeletons';

export default function DoctorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDoctor(id);
        if (data) {
          setDoctor(data);
        } else {
          const demo = DEMO_DOCTORS.find(d => d.id === id);
          setDoctor(demo || null);
        }
      } catch {
        const demo = DEMO_DOCTORS.find(d => d.id === id);
        setDoctor(demo || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="page-container py-20 text-center">
        <span className="text-6xl block mb-4">🏥</span>
        <h2 className="font-bold text-slate-700 text-xl mb-2">الطبيب غير موجود</h2>
        <button onClick={() => router.back()} className="btn-ghost mt-4">رجوع</button>
      </div>
    );
  }

  const specialtyInfo = SPECIALTIES[doctor.specialty as Specialty];

  return (
    <div className="page-container py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        رجوع
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Doctor Card */}
        <div className="card p-6 mb-4">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-4xl flex-shrink-0 shadow">
              {specialtyInfo?.icon || '🏥'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="font-extrabold text-xl text-slate-800">{doctor.nameAr}</h1>
                  <p className="text-blue-600 font-semibold text-sm mt-0.5">{specialtyInfo?.ar || doctor.specialtyAr}</p>
                </div>
                <span className={`badge flex-shrink-0 ${doctor.available ? 'badge-green' : 'badge-red'}`}>
                  {doctor.available ? 'متاح للحجز' : 'غير متاح'}
                </span>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                📍 {doctor.clinicAr}، {doctor.cityAr}
              </p>

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  <span className="font-bold text-sm">{doctor.rating}</span>
                  <span className="text-slate-400 text-xs">({doctor.reviewCount} تقييم)</span>
                </div>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-blue-600 text-sm">{formatIQD(doctor.fee)}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {(doctor.bioAr || doctor.bio) && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm text-slate-600 leading-relaxed">{doctor.bioAr || doctor.bio}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card p-5 mb-4">
          <h2 className="font-bold text-slate-700 mb-4">تواصل مع العيادة</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <a
              href={`tel:${doctor.phone}`}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors"
            >
              📞 اتصال هاتفي
            </a>
            <a
              href={formatWhatsAppLink(doctor.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-green-600 font-bold text-sm hover:bg-green-100 transition-colors"
            >
              💬 واتساب
            </a>
          </div>
          
          <div className="space-y-3 pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">أوقات العمل</span>
              <span className="font-bold text-slate-700">
                {doctor.workingHours.start} — {doctor.workingHours.end}
              </span>
            </div>
            <div className="flex items-start justify-between text-sm gap-4">
              <span className="text-slate-500 font-medium flex-shrink-0">أيام العمل</span>
              <span className="font-bold text-slate-700 text-left">
                {doctor.workingDays.join(' · ')}
              </span>
            </div>
          </div>
        </div>

        {/* Book CTA */}
        <div className="sticky bottom-4 px-0">
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">أتعاب الكشف</p>
              <p className="font-extrabold text-lg text-slate-800">{formatIQD(doctor.fee)}</p>
            </div>
            {user?.role === 'secretary' ? (
              <div className="flex-1 max-w-[220px] text-center">
                <p className="text-xs text-slate-400 font-bold">🔒 لا يمكن للسكرتيرة الحجز</p>
                <button
                  onClick={() => router.push('/secretary')}
                  className="mt-1 text-xs font-bold text-blue-500 hover:underline"
                >
                  الذهاب للوحة التحكم ←
                </button>
              </div>
            ) : doctor.isClosed ? (
              <div className="flex-1 bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-extrabold text-orange-800 mb-1">🚫 الحجوزات مغلقة حالياً</p>
                <p className="text-xs font-bold text-orange-600">{doctor.closedMessage || 'الطبيب غير متاح للحجز حالياً'}</p>
              </div>
            ) : (
              <button
                disabled={!doctor.available}
                onClick={() => {
                  if (!user) {
                    router.push('/auth');
                  } else {
                    setShowBooking(true);
                  }
                }}
                className="btn-primary flex-1 max-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {doctor.available ? '📅 احجز الآن' : 'غير متاح'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Booking Modal */}
      {showBooking && (
        <BookingModal
          doctor={doctor}
          onClose={() => setShowBooking(false)}
          onSuccess={() => {
            setShowBooking(false);
            setBookingSuccess(true);
          }}
        />
      )}

      {/* Success Toast */}
      {bookingSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-96 bg-green-600 text-white rounded-2xl p-4 shadow-2xl z-50 flex items-center gap-3"
        >
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-sm">تم الحجز بنجاح!</p>
            <p className="text-green-100 text-xs">سيتم تأكيد موعدك قريباً</p>
          </div>
          <button onClick={() => setBookingSuccess(false)} className="mr-auto text-green-200 hover:text-white">
            ✕
          </button>
        </motion.div>
      )}
    </div>
  );
}
