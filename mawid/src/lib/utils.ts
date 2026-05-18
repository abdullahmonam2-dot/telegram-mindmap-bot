import { Doctor, SPECIALTIES, Specialty } from './types';

export const DEMO_DOCTORS: Doctor[] = [];

export function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let current = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  while (current + 30 <= endMin) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += 30;
  }
  return slots;
}

export function formatIQD(amount: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getNextDays(count: number): { date: string; label: string; dayName: string }[] {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long' }).format(d);
    const label = i === 0 ? 'اليوم' : i === 1 ? 'غداً' : new Intl.DateTimeFormat('ar-IQ', { month: 'short', day: 'numeric' }).format(d);
    days.push({ date: dateStr, label, dayName });
  }
  return days;
}

export function getSpecialtyIcon(specialty: string): string {
  return SPECIALTIES[specialty as Specialty]?.icon || '🏥';
}
export function formatWhatsAppLink(phone: string, message?: string): string {
  // Remove all non-numeric characters
  let cleanNumber = phone.replace(/\D/g, '');
  
  // Iraqi specific handling:
  // If number starts with 07... (local format), replace 0 with 964
  if (cleanNumber.startsWith('07')) {
    cleanNumber = '964' + cleanNumber.substring(1);
  } 
  // If it starts with 7... (local format without 0), add 964
  else if (cleanNumber.startsWith('7') && cleanNumber.length === 10) {
    cleanNumber = '964' + cleanNumber;
  }
  // If it starts with 00964, replace with 964
  else if (cleanNumber.startsWith('00964')) {
    cleanNumber = cleanNumber.substring(2);
  }

  let url = `https://wa.me/${cleanNumber}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

export function formatTime12(time24: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}
