'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  getDoctorsBySecretary, addDoctor, updateDoctor, deleteDoctor,
  updateAppointmentStatus, deleteAppointment, listenToSecretaryAppointments
} from '@/lib/db';
import { Doctor, Appointment, SPECIALTIES, Specialty, CITIES } from '@/lib/types';
import { formatWhatsAppLink } from '@/lib/utils';
import Sidebar from '@/components/SecretarySidebar';
import { DashboardSkeleton } from '@/components/Skeletons';
import { 
  Menu, 
  Search, 
  Plus, 
  MessageCircle, 
  Calendar, 
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Bell,
  Stethoscope
} from 'lucide-react';

type Tab = 'requests' | 'appointments' | 'doctors';

const STATUS_CONFIG = {
  pending:   { label: 'قيد الانتظار', color: 'orange' },
  confirmed: { label: 'مؤكد', color: 'green' },
  cancelled: { label: 'ملغى', color: 'red' },
  completed: { label: 'مكتمل', color: 'blue' },
};

export default function SecretaryDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [toast, setToast] = useState('');
  const initialLoadDone = useRef(false);

  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);
  const [customSpecialtyText, setCustomSpecialtyText] = useState('');

  useEffect(() => {
    if (editingDoctor) {
      const defaultAr = SPECIALTIES[editingDoctor.specialty as Specialty]?.ar || '';
      const isCustom = editingDoctor.specialtyAr !== defaultAr;
      setIsCustomSpecialty(isCustom);
      setCustomSpecialtyText(editingDoctor.specialtyAr || defaultAr);
    } else {
      setIsCustomSpecialty(false);
      setCustomSpecialtyText(SPECIALTIES['general']?.ar || 'طب عام');
    }
  }, [editingDoctor, showDoctorModal]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'secretary')) router.push('/auth');
    if (!user) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW Registered', reg);
      });
    }

    let unsubscribe: () => void;

    const init = async () => {
      try {
        const uid = user.uid;
        const docs = await getDoctorsBySecretary(uid);
        setDoctors(docs);
        
        if (docs.length) {
          const doctorIds = docs.map(d => d.id);
          if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission();
          }

          unsubscribe = listenToSecretaryAppointments(doctorIds, (updatedApts) => {
            setAppointments(prev => {
              const newestApt = updatedApts.find(a => !prev.some(p => p.id === a.id));
              if (initialLoadDone.current && newestApt && newestApt.status === 'pending') {
                playNotificationSound();
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('حجز جديد قيد الانتظار!', {
                    body: `المريض: ${newestApt.patientName}\nالتاريخ: ${newestApt.date} - الوقت: ${newestApt.time}`,
                    icon: '/favicon.ico'
                  });
                }
              }
              initialLoadDone.current = true;
              return updatedApts;
            });
            setFetching(false);
          });
        } else {
          setFetching(false);
        }
      } catch (err) {
        console.error(err);
        setFetching(false);
      }
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user, loading, router]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      const apt = appointments.find(a => a.id === id);
      
      if (status === 'cancelled') {
        await deleteAppointment(id);
      } else {
        await updateAppointmentStatus(id, status);
      }

      if (apt && apt.patientPhone) {
        let msg = '';
        if (status === 'confirmed') {
          msg = `أهلاً ${apt.patientName}،\nتم تأكيد موعدك بنجاح في عيادة ${apt.doctorNameAr}.\n📅 اليوم: ${apt.date}\nيرجى الحضور في الموعد المحدد. نتمنى لك دوام الصحة! 🏥`;
        } else if (status === 'cancelled') {
          msg = `أهلاً ${apt.patientName}،\nنعتذر منك، تم إلغاء موعدك في عيادة ${apt.doctorNameAr} ليوم ${apt.date}.\nيرجى التواصل معنا لتحديد موعد آخر أو الحجز عبر التطبيق. 🏥`;
        }
        
        if (msg) {
          window.open(formatWhatsAppLink(apt.patientPhone, msg), '_blank');
        }
      }

      if (status === 'cancelled') {
        setAppointments(prev => prev.filter(a => a.id !== id));
        showToast('تم إلغاء الموعد وحذفه نهائياً وإرسال إشعار للمريض');
      } else {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        showToast(`تم تأكيد الموعد وإرسال إشعار واتساب للمريض`);
      }
    } catch {
      showToast('فشل التحديث');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الحجز نهائياً من النظام؟')) {
      try {
        await deleteAppointment(id);
        setAppointments(prev => prev.filter(a => a.id !== id));
        showToast('تم حذف الحجز نهائياً بنجاح');
      } catch {
        showToast('فشل حذف الحجز');
      }
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطبيب وكل بياناته نهائياً من العيادة؟')) {
      try {
        await deleteDoctor(id);
        setDoctors(prev => prev.filter(d => d.id !== id));
        showToast('تم حذف الطبيب بنجاح');
      } catch {
        showToast('فشل حذف الطبيب');
      }
    }
  };

  const toggleDoctorStatus = async (doctor: Doctor) => {
    try {
      const updatedFields = {
        isClosed: !doctor.isClosed,
        closedMessage: !doctor.isClosed ? 'الطبيب مسافر / غير متواجد حالياً' : ''
      };
      await updateDoctor(doctor.id, updatedFields);
      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, ...updatedFields } : d));
      showToast(updatedFields.isClosed ? '🚫 تم إغلاق حجوزات الطبيب (الطبيب غير متواجد)' : '✅ تم تفعيل حجوزات الطبيب بنجاح');
    } catch {
      showToast('فشل تحديث حالة الطبيب');
    }
  };

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#fcfdfe] p-10">
      <DashboardSkeleton />
    </div>
  );

  if (!user || user.role !== 'secretary') {
    return null;
  }

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const otherAppointments = appointments.filter(a => a.status !== 'pending' && a.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex text-right" dir="rtl">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block w-72 h-screen sticky top-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-0 z-[100] md:hidden"
          >
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72">
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-6 md:px-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl bg-slate-50">
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <h1 className="font-extrabold text-xl text-slate-900">
              {activeTab === 'requests' && 'الطلبات الجديدة'}
              {activeTab === 'appointments' && 'إدارة المواعيد'}
              {activeTab === 'doctors' && 'إدارة الأطباء'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
              إضافة طبيب جديد
            </button>
            <button 
              onClick={async () => {
                playNotificationSound();
                if ('Notification' in window) {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    showToast('✅ تم تفعيل التنبيهات والصوت بنجاح');
                  }
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100 transition-all font-bold text-[10px]"
            >
              <Bell className="w-3 h-3" />
              تفعيل التنبيهات
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 md:pb-10">
          
          {/* Missing Doctor Warning */}
          {doctors.length === 0 && (
            <div className="mb-6 bg-blue-500 rounded-[32px] p-8 text-white shadow-xl shadow-blue-100 flex flex-col gap-6 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-xl font-extrabold mb-2">إضافة طبيب العيادة</h4>
                <p className="text-blue-100 text-xs mb-6">يجب إضافة بيانات الطبيب أولاً للتمكن من استقبال طلبات الحجز.</p>
                <button onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }} className="px-8 py-3 bg-white text-blue-500 rounded-[20px] font-extrabold shadow-lg inline-block">
                  + إضافة الطبيب الآن
                </button>
              </div>
              <Plus className="absolute -bottom-8 -left-8 w-40 h-40 text-white/10" />
            </div>
          )}

          {/* TAB: REQUESTS (Pending) */}
          {activeTab === 'requests' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="text-lg font-extrabold text-slate-800">طلبات الحجز قيد الانتظار ({pendingAppointments.length})</h2>
              </div>
              
              {pendingAppointments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-50">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="font-bold text-slate-400">لا توجد طلبات حجز جديدة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pendingAppointments.map(apt => (
                    <div key={apt.id} className="bg-white p-6 rounded-[24px] border border-orange-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-2 h-full bg-orange-400" />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-extrabold text-slate-900 text-lg mb-1">{apt.patientName}</p>
                          <p className="text-xs font-bold text-slate-500" dir="ltr">{apt.patientPhone}</p>
                        </div>
                        <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold">جديد</span>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-3 mb-6">
                        {apt.sequenceNumber && (
                          <p className="text-[11px] font-black text-orange-600 mb-2 border-b border-orange-100/50 pb-1.5 flex items-center gap-1">
                            🔢 رقم التسلسل: {apt.sequenceNumber}
                          </p>
                        )}
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-500" /> 
                          التاريخ: {apt.date}
                        </p>
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" /> 
                          الوقت: {apt.time}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(apt.id, 'confirmed')}
                          className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-xs shadow-md shadow-green-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                          <Check className="w-4 h-4" /> تأكيد
                        </button>
                        <button 
                          onClick={() => updateStatus(apt.id, 'cancelled')}
                          className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: APPOINTMENTS (All other) */}
          {activeTab === 'appointments' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-8 py-5">المريض</th>
                      <th className="px-8 py-5">الموعد</th>
                      <th className="px-8 py-5">الحالة</th>
                      <th className="px-8 py-5 text-center">تواصل / إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {otherAppointments.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold">لا توجد مواعيد سابقة أو مؤكدة</td>
                       </tr>
                    ) : (
                      otherAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/30">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                {apt.patientName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{apt.patientName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-slate-400" dir="ltr">{apt.patientPhone}</p>
                                  {apt.sequenceNumber && (
                                    <span className="inline-block text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                      تسلسل: {apt.sequenceNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-700">{apt.date}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{apt.time}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold bg-${STATUS_CONFIG[apt.status].color}-50 text-${STATUS_CONFIG[apt.status].color}-500 inline-block`}>
                              {STATUS_CONFIG[apt.status].label}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-2">
                              <a href={formatWhatsAppLink(apt.patientPhone)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              {apt.status !== 'cancelled' && (
                                <button onClick={() => updateStatus(apt.id, 'cancelled')} className="p-2 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-orange-100" title="إلغاء الحجز">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleDeleteAppointment(apt.id)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" title="حذف الحجز نهائياً">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden space-y-4">
                {otherAppointments.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[32px] border border-slate-50">
                    <p className="font-bold text-slate-400">لا توجد مواعيد سابقة أو مؤكدة</p>
                  </div>
                ) : (
                  otherAppointments.map((apt) => (
                    <div key={apt.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                            {apt.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{apt.patientName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-400" dir="ltr">{apt.patientPhone}</p>
                              {apt.sequenceNumber && (
                                <span className="inline-block text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                  تسلسل: {apt.sequenceNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold bg-${STATUS_CONFIG[apt.status].color}-50 text-${STATUS_CONFIG[apt.status].color}-500 border border-${STATUS_CONFIG[apt.status].color}-100`}>
                          {STATUS_CONFIG[apt.status].label}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 flex justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">📅 {apt.date}</span>
                        <span className="flex items-center gap-1.5">⏰ {apt.time}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold ml-auto">طبيب العيادة: {apt.doctorNameAr}</span>
                        <a 
                          href={formatWhatsAppLink(apt.patientPhone)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                          title="تواصل واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        {apt.status !== 'cancelled' && (
                          <button 
                            onClick={() => updateStatus(apt.id, 'cancelled')} 
                            className="p-2.5 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-orange-100" 
                            title="إلغاء الحجز"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteAppointment(apt.id)} 
                          className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" 
                          title="حذف الحجز نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: DOCTORS (Doctor Management) */}
          {activeTab === 'doctors' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-slate-800">إدارة أطباء العيادة ({doctors.length})</h2>
                <button onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" /> إضافة طبيب جديد
                </button>
              </div>
              
              {doctors.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-50">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="font-bold text-slate-400">لا يوجد أطباء مسجلين حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {doctors.map(doc => (
                    <div key={doc.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-extrabold text-slate-900 text-lg mb-1">{doc.nameAr}</p>
                            <p className="text-xs font-bold text-blue-500">{doc.specialtyAr}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${doc.isClosed ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {doc.isClosed ? '🚫 غير متواجد / مسافر' : '✅ متاح للحجز'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <p className="text-xs font-bold text-slate-500">📍 العيادة: <span className="text-slate-700">{doc.clinicAr || 'غير محدد'} ({doc.cityAr})</span></p>
                          <p className="text-xs font-bold text-slate-500">📞 الهاتف: <span className="text-slate-700" dir="ltr">{doc.phone}</span></p>
                          <p className="text-xs font-bold text-slate-500">💵 سعر الكشفية: <span className="text-slate-700">{doc.fee} دينار</span></p>
                          
                          {doc.isClosed && doc.closedMessage && (
                            <div className="mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-xl">
                              <p className="text-[10px] font-black text-orange-800">✉️ رسالة التنبيه للمرضى:</p>
                              <p className="text-xs font-bold text-orange-700 mt-0.5">{doc.closedMessage}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-50 pt-4 mt-auto">
                        <button 
                          onClick={() => toggleDoctorStatus(doc)}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                            doc.isClosed 
                              ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                          }`}
                        >
                          {doc.isClosed ? 'تفعيل الحجوزات' : 'إغلاق (مسافر)'}
                        </button>
                        <button 
                          onClick={() => { setEditingDoctor(doc); setShowDoctorModal(true); }}
                          className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="تعديل بيانات الطبيب"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoctor(doc.id)}
                          className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="حذف الطبيب نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      {/* DOCTOR MODAL (Used for setup and editing) */}
      <AnimatePresence>
        {showDoctorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingDoctor ? 'إعدادات عيادة الطبيب' : 'إعداد بيانات العيادة والطبيب'}
                </h2>
                <button onClick={() => setShowDoctorModal(false)} className="p-2 rounded-full bg-slate-50 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const specialtyKey = formData.get('specialty') as Specialty;
                const customText = formData.get('customSpecialtyAr')?.toString().trim();

                const data: any = {
                  nameAr: formData.get('nameAr'),
                  specialty: specialtyKey,
                  specialtyAr: (isCustomSpecialty && customText) ? customText : (SPECIALTIES[specialtyKey]?.ar || 'طب عام'),
                  fee: Number(formData.get('fee')),
                  cityAr: formData.get('cityAr'),
                  city: CITIES.find(c => c.ar === formData.get('cityAr'))?.en || '',
                  name: formData.get('nameAr'),
                  clinicAr: formData.get('clinicAr'),
                  phone: formData.get('phone'),
                  bioAr: formData.get('bioAr'),
                  workingHours: {
                    start: formData.get('start'),
                    end: formData.get('end'),
                  },
                  workingDays: Array.from(formData.getAll('days')) as string[],
                  secretaryId: user!.uid,
                  available: true,
                  isClosed: formData.get('isClosed') === 'on',
                  closedMessage: formData.get('closedMessage')?.toString() || '',
                  rating: editingDoctor?.rating || 5.0,
                  reviewCount: editingDoctor?.reviewCount || 0,
                  createdAt: editingDoctor?.createdAt || new Date().toISOString(),
                };

                try {
                  setFetching(true);
                  if (editingDoctor) {
                    await updateDoctor(editingDoctor.id, data);
                    showToast('تم حفظ إعدادات العيادة بنجاح');
                  } else {
                    await addDoctor(data, user?.phone);
                    showToast('تم تفعيل العيادة بنجاح! يمكنك الآن استقبال الطلبات.');
                  }
                  const uid = user!.uid;
                  const docs = await getDoctorsBySecretary(uid);
                  setDoctors(docs);
                  setShowDoctorModal(false);
                } catch (err: any) {
                  showToast(`فشل الحفظ: (${err?.code || err?.message})`);
                } finally {
                  setFetching(false);
                }
              }} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">اسم الطبيب (بالعربي)</label>
                    <input name="nameAr" required defaultValue={editingDoctor?.nameAr} className="input-field" placeholder="د. علي السعدي" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">التخصص الرئيسي</label>
                    <select 
                      name="specialty" 
                      required 
                      defaultValue={editingDoctor?.specialty || 'general'} 
                      onChange={(e) => {
                        const val = e.target.value as Specialty;
                        setCustomSpecialtyText(SPECIALTIES[val]?.ar || '');
                      }}
                      className="input-field"
                    >
                      {Object.entries(SPECIALTIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.ar}</option>
                      ))}
                    </select>
                  </div>

                  {/* خيار تعديل نص التخصص كتابة للتوضيح والدقة */}
                  <div className="space-y-2 md:col-span-2 bg-slate-50 p-4 rounded-[20px] border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">✍️ تخصيص نص التخصص يدوياً (مثال: أخصائي بورد...)</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isCustomSpecialty}
                          onChange={(e) => setIsCustomSpecialty(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    {isCustomSpecialty && (
                      <input 
                        name="customSpecialtyAr" 
                        required 
                        value={customSpecialtyText} 
                        onChange={(e) => setCustomSpecialtyText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" 
                        placeholder="مثال: أخصائي طب وجراحة العيون والشبكية" 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">سعر الكشفية (دينار)</label>
                    <input name="fee" type="number" required defaultValue={editingDoctor?.fee} className="input-field" placeholder="25000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">رقم الهاتف للتواصل</label>
                    <input name="phone" required defaultValue={editingDoctor?.phone} className="input-field" placeholder="0770XXXXXXX" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">المحافظة</label>
                    <select name="cityAr" required defaultValue={editingDoctor?.cityAr} className="input-field">
                      {CITIES.map(city => <option key={city.ar} value={city.ar}>{city.ar}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">اسم العيادة / المركز</label>
                    <input name="clinicAr" required defaultValue={editingDoctor?.clinicAr} className="input-field" placeholder="عيادة الشفاء" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">أوقات العمل</label>
                  <div className="flex items-center gap-4">
                    <input name="start" type="time" required defaultValue={editingDoctor?.workingHours.start} className="input-field" />
                    <span className="font-bold text-slate-400">إلى</span>
                    <input name="end" type="time" required defaultValue={editingDoctor?.workingHours.end} className="input-field" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">أيام العمل</label>
                  <div className="flex flex-wrap gap-2">
                    {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(day => (
                      <label key={day} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                        <input name="days" type="checkbox" value={day} defaultChecked={editingDoctor?.workingDays?.includes(day)} className="w-4 h-4 text-blue-500 rounded border-slate-300" />
                        <span className="text-xs font-bold text-slate-600">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-orange-50 rounded-[32px] border border-orange-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xl">🚫</div>
                      <div>
                        <h4 className="text-sm font-extrabold text-orange-900">إغلاق الحجوزات مؤقتاً</h4>
                        <p className="text-[10px] font-bold text-orange-700">سيمنع المرضى من حجز أي موعد جديد</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input name="isClosed" type="checkbox" defaultChecked={editingDoctor?.isClosed} className="sr-only peer" />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-orange-800">رسالة تظهر للمريض (مثلاً: الدكتور مسافر)</label>
                    <input 
                      name="closedMessage" 
                      defaultValue={editingDoctor?.closedMessage} 
                      className="w-full bg-white border border-orange-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-500" 
                      placeholder="اكتب هنا سبب إغلاق الحجز..." 
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="btn-primary w-full py-4 rounded-[20px] text-lg">
                    {editingDoctor ? 'حفظ إعدادات العيادة' : 'تفعيل العيادة وبدء العمل'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-2xl z-[1000] flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-sm font-bold">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
