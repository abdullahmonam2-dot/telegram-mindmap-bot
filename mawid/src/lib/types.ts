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
  sequenceNumber?: number;
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
  | 'ent'
  | 'surgery'
  | 'internal'
  | 'nephrology'
  | 'oncology'
  | 'endocrinology'
  | 'plastic'
  | 'therapy'
  | 'radiology'
  | 'gastroenterology'
  | 'hematology'
  | 'pulmonology'
  | 'rheumatology';

export const SPECIALTIES: Record<Specialty, { en: string; ar: string; icon: string }> = {
  general: { en: 'General Practice', ar: 'طب عام', icon: '🩺' },
  cardiology: { en: 'Cardiology', ar: 'أمراض القلب والشرايين', icon: '🫀' },
  dermatology: { en: 'Dermatology', ar: 'الأمراض الجلدية والتجميل', icon: '✨' },
  orthopedics: { en: 'Orthopedics', ar: 'الكسور والعظام والمفاصل', icon: '🦴' },
  neurology: { en: 'Neurology', ar: 'الجملة العصبية والأعصاب', icon: '🧠' },
  pediatrics: { en: 'Pediatrics', ar: 'طب الأطفال وحديثي الولادة', icon: '👶' },
  gynecology: { en: 'Gynecology', ar: 'النسائية والتوليد والعقم', icon: '🌸' },
  ophthalmology: { en: 'Ophthalmology', ar: 'طب وجراحة العيون', icon: '👁️' },
  dentistry: { en: 'Dentistry', ar: 'طب وجراحة الأسنان', icon: '🦷' },
  psychiatry: { en: 'Psychiatry', ar: 'الطب النفسي والعصبي', icon: '🧘' },
  urology: { en: 'Urology', ar: 'جراحة المسالك البولية والتناسلية', icon: '💊' },
  ent: { en: 'ENT', ar: 'الأنف والأذن والحنجرة', icon: '👂' },
  surgery: { en: 'General Surgery', ar: 'الجراحة العامة', icon: '🔪' },
  internal: { en: 'Internal Medicine', ar: 'الأمراض الباطنية والصدرية', icon: '🩺' },
  nephrology: { en: 'Nephrology', ar: 'أمراض وجراحة الكلى', icon: '💧' },
  oncology: { en: 'Oncology', ar: 'الأورام والسرطان', icon: '🎗️' },
  endocrinology: { en: 'Endocrinology', ar: 'الغدد الصماء والسكري', icon: '🧪' },
  plastic: { en: 'Plastic Surgery', ar: 'التجميل والليزر والجراحة التجميلية', icon: '💉' },
  therapy: { en: 'Physical Therapy', ar: 'العلاج الطبيعي والفيزيائي', icon: '🏃' },
  radiology: { en: 'Radiology', ar: 'الأشعة والسونار والرنين', icon: '🩻' },
  gastroenterology: { en: 'Gastroenterology', ar: 'الجهاز الهضمي والكبد', icon: '🧪' },
  hematology: { en: 'Hematology', ar: 'أمراض الدم', icon: '🩸' },
  pulmonology: { en: 'Pulmonology', ar: 'الأمراض الصدرية والتنفسية', icon: '🫁' },
  rheumatology: { en: 'Rheumatology', ar: 'أمراض المفاصل والروماتيزم', icon: '🦴' },
};

export const CITIES = [
  { en: 'Baghdad', ar: 'بغداد' },
  { en: 'Basra', ar: 'البصرة' },
  { en: 'Nineveh', ar: 'نينوى (الموصل)' },
  { en: 'Erbil', ar: 'أربيل' },
  { en: 'Najaf', ar: 'النجف' },
  { en: 'Karbala', ar: 'كربلاء' },
  { en: 'Kirkuk', ar: 'كركوك' },
  { en: 'Sulaymaniyah', ar: 'السليمانية' },
  { en: 'Anbar', ar: 'الأنبار' },
  { en: 'Dhi Qar', ar: 'ذي قار' },
  { en: 'Babil', ar: 'بابل' },
  { en: 'Diyala', ar: 'ديالى' },
  { en: 'Maysan', ar: 'ميسان' },
  { en: 'Wasit', ar: 'واسط' },
  { en: 'Salah Al-Din', ar: 'صلاح الدين' },
  { en: 'Al-Muthanna', ar: 'المثنى' },
  { en: 'Al-Qadisiyah', ar: 'القادسية (الديوانية)' },
  { en: 'Duhok', ar: 'دهوك' },
  { en: 'Halabja', ar: 'حلبجة' },
];

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  createdAt: number;
}
