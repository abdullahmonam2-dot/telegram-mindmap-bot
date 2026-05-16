export type UserRole = 'patient' | 'secretary';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  nameAr: string;
  specialty: string;
  specialtyAr: string;
  clinic: string;
  clinicAr: string;
  city: string;
  cityAr: string;
  phone: string;
  bio?: string;
  bioAr?: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  fee: number;
  available: boolean;
  isClosed?: boolean;
  closedMessage?: string;
  workingDays: string[];
  workingHours: { start: string; end: string };
  secretaryId: string;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorNameAr: string;
  doctorSpecialty: string;
  doctorSpecialtyAr: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
}

export type Specialty =
  | 'general'
  | 'cardiology'
  | 'dermatology'
  | 'orthopedics'
  | 'neurology'
  | 'pediatrics'
  | 'gynecology'
  | 'ophthalmology'
  | 'dentistry'
  | 'psychiatry'
  | 'urology'
  | 'ent';

export const SPECIALTIES: Record<Specialty, { en: string; ar: string; icon: string }> = {
  general: { en: 'General Practice', ar: 'طب عام', icon: '🩺' },
  cardiology: { en: 'Cardiology', ar: 'أمراض القلب', icon: '🫀' },
  dermatology: { en: 'Dermatology', ar: 'الأمراض الجلدية', icon: '✨' },
  orthopedics: { en: 'Orthopedics', ar: 'العظام والمفاصل', icon: '🦴' },
  neurology: { en: 'Neurology', ar: 'الأعصاب', icon: '🧠' },
  pediatrics: { en: 'Pediatrics', ar: 'طب الأطفال', icon: '👶' },
  gynecology: { en: 'Gynecology', ar: 'النساء والتوليد', icon: '🌸' },
  ophthalmology: { en: 'Ophthalmology', ar: 'طب العيون', icon: '👁️' },
  dentistry: { en: 'Dentistry', ar: 'طب الأسنان', icon: '🦷' },
  psychiatry: { en: 'Psychiatry', ar: 'الطب النفسي', icon: '🧘' },
  urology: { en: 'Urology', ar: 'المسالك البولية', icon: '💊' },
  ent: { en: 'ENT', ar: 'الأنف والأذن والحنجرة', icon: '👂' },
};

export const CITIES = [
  { en: 'Baghdad', ar: 'بغداد' },
  { en: 'Basra', ar: 'البصرة' },
  { en: 'Mosul', ar: 'الموصل' },
  { en: 'Erbil', ar: 'أربيل' },
  { en: 'Najaf', ar: 'النجف' },
  { en: 'Karbala', ar: 'كربلاء' },
  { en: 'Kirkuk', ar: 'كركوك' },
  { en: 'Sulaymaniyah', ar: 'السليمانية' },
  { en: 'Anbar', ar: 'الأنبار' },
  { en: 'Dhi Qar', ar: 'ذي قار' },
];

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  createdAt: number;
}
