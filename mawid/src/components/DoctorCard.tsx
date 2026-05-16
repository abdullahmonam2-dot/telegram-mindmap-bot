'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Doctor, SPECIALTIES, Specialty } from '@/lib/types';
import { formatIQD, getSpecialtyIcon } from '@/lib/utils';

interface DoctorCardProps {
  doctor: Doctor;
  index?: number;
}

export default function DoctorCard({ doctor, index = 0 }: DoctorCardProps) {
  const specialtyInfo = SPECIALTIES[doctor.specialty as Specialty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/doctors/${doctor.id}`} className="block">
        <div className="card card-hover p-5 flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-2xl shadow-sm">
              {getSpecialtyIcon(doctor.specialty)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-[1rem] text-slate-800 truncate">{doctor.nameAr}</h3>
              {doctor.isClosed ? (
                <span className="badge bg-orange-100 text-orange-600 border border-orange-200 flex-shrink-0">مغلق مؤقتاً</span>
              ) : doctor.available ? (
                <span className="badge badge-green flex-shrink-0">متاح</span>
              ) : (
                <span className="badge badge-red flex-shrink-0">غير متاح</span>
              )}
            </div>

            <p className="text-sm text-blue-600 font-semibold mb-0.5">
              {specialtyInfo?.ar || doctor.specialtyAr}
            </p>
            <p className="text-xs text-slate-500 mb-3 truncate">
              📍 {doctor.clinicAr} — {doctor.cityAr}
            </p>

            <div className="flex items-center justify-between gap-2">
              {/* Rating */}
              <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg">
                <span className="text-amber-400 text-sm">★</span>
                <span className="text-sm font-bold text-slate-700">{doctor.rating}</span>
              </div>

              {/* Fee */}
              <div className="text-left">
                <span className="text-sm font-bold text-slate-700">{formatIQD(doctor.fee)}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400">متاح اليوم</span>
              </div>
              <button className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all">
                حجز موعد
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
