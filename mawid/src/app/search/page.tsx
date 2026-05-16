'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DoctorCard from '@/components/DoctorCard';
import { Doctor, SPECIALTIES, Specialty, CITIES } from '@/lib/types';
import { getDoctors } from '@/lib/db';
import { DEMO_DOCTORS } from '@/lib/utils';
import { DoctorCardSkeleton } from '@/components/Skeletons';

function SearchContent() {
  const params = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(params.get('q') || '');
  const [specialty, setSpecialty] = useState(params.get('specialty') || '');
  const [city, setCity] = useState(params.get('city') || '');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDoctors();
        setDoctors(data.length ? data : DEMO_DOCTORS);
      } catch {
        setDoctors(DEMO_DOCTORS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = doctors.filter((d) => {
    const matchQ = !query ||
      (d.nameAr && d.nameAr.includes(query)) ||
      (d.specialtyAr && d.specialtyAr.includes(query)) ||
      (d.cityAr && d.cityAr.includes(query)) ||
      (d.clinicAr && d.clinicAr.includes(query)) ||
      (d.name && d.name.toLowerCase().includes(query.toLowerCase()));
    const matchSpec = !specialty || d.specialty === specialty;
    const matchCity = !city || (d.city && d.city === city) || (d.cityAr && d.cityAr === city);
    return matchQ && matchSpec && matchCity;
  });

  return (
    <div className="page-container py-8">
      {/* Search bar */}
      <div className="mb-6">
        <h1 className="section-title mb-4">البحث عن طبيب</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو التخصص أو المدينة..."
          className="input-field text-lg py-4"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {/* Specialty filter */}
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="flex-shrink-0 px-4 py-2 rounded-2xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="">كل التخصصات</option>
          {Object.entries(SPECIALTIES).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.ar}</option>
          ))}
        </select>

        {/* City filter */}
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex-shrink-0 px-4 py-2 rounded-2xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="">كل المدن</option>
          {CITIES.map((c) => (
            <option key={c.en} value={c.en}>{c.ar}</option>
          ))}
        </select>

        {(specialty || city || query) && (
          <button
            onClick={() => { setQuery(''); setSpecialty(''); setCity(''); }}
            className="flex-shrink-0 px-4 py-2 rounded-2xl border-2 border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500 mb-4 font-medium">
        {loading ? 'جارٍ التحميل...' : `${filtered.length} طبيب`}
      </p>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <DoctorCardSkeleton key={n} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <span className="text-6xl block mb-4">🔍</span>
          <h3 className="font-bold text-slate-700 mb-2">لا توجد نتائج</h3>
          <p className="text-slate-400 text-sm">جرب البحث بكلمات مختلفة</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filtered.map((doc, i) => (
            <DoctorCard key={doc.id} doctor={doc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page-container py-8"><div className="skeleton h-12 w-full rounded-2xl" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
