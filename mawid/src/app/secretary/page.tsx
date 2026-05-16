'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  getDoctorsBySecretary, addDoctor, updateDoctor, deleteDoctor,
  updateAppointmentStatus, listenToSecretaryAppointments
} from '@/lib/db';
import { Doctor, Appointment, SPECIALTIES, Specialty, CITIES } from '@/lib/types';
import { DEMO_DOCTORS, formatIQD, formatWhatsAppLink } from '@/lib/utils';
import Sidebar from '@/components/SecretarySidebar';
import { DashboardSkeleton } from '@/components/Skeletons';
import { 
  Menu, 
  Search, 
  Plus, 
  MoreVertical, 
  MessageCircle, 
  Calendar, 
  User, 
  Phone,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  Settings,
  Bell
} from 'lucide-react';

type Tab = 'overview' | 'appointments' | 'doctors' | 'schedule' | 'notifications' | 'settings';

const STATUS_CONFIG = {
  pending:   { label: 'قيد الانتظار', color: 'orange' },
  confirmed: { label: 'مؤكد', color: 'green' },
  cancelled: { label: 'ملغى', color: 'red' },
  completed: { label: 'مكتمل', color: 'blue' },
};

export default function SecretaryDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<{id: string, text: string, time: string, isNew: boolean}[]>([]);
  const initialLoadDone = useRef(false);

  // Load Data & Listen for Real-time Updates
  useEffect(() => {
    if (!loading && (!user || user.role !== 'secretary')) router.push('/auth');
    if (!user) return;

    // Register Service Worker for Background Notifications
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
          
          // Request notification permission
          if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission();
          }

          // Start Real-time listener
          unsubscribe = listenToSecretaryAppointments(doctorIds, (updatedApts) => {
            setAppointments(prev => {
              // Get the newest appointment from the updated list
              const newestApt = updatedApts[0];
              
              // Only notify if this is NOT the initial load AND the newest ID is different
              if (initialLoadDone.current && newestApt && !prev.some(a => a.id === newestApt.id)) {
                // UI Notification History only. Sound and OS Push are handled globally.
                setNotifications(n => [{
                  id: Date.now().toString(),
                  text: `حجز جديد: ${newestApt.patientName} عند ${newestApt.doctorNameAr}`,
                  time: 'الآن',
                  isNew: true
                }, ...n]);
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
      await updateAppointmentStatus(id, status);

      // 📱 إرسال إشعار عبر واتساب تلقائياً
      if (apt && apt.patientPhone) {
        let msg = '';
        if (status === 'confirmed') {
          msg = `أهلاً ${apt.patientName}،\nتم تأكيد موعدك بنجاح في عيادة ${apt.doctorNameAr}.\n📅 اليوم: ${apt.date}\nيرجى الحضور في الموعد المحدد. نتمنى لك دوام الصحة! 🏥`;
        } else if (status === 'cancelled') {
          msg = `أهلاً ${apt.patientName}،\nنعتذر منك، تم إلغاء موعدك في عيادة ${apt.doctorNameAr} ليوم ${apt.date}.\nيرجى التواصل معنا لتحديد موعد آخر أو الحجز عبر التطبيق. 🏥`;
        }
        
        if (msg) {
          // يفتح واتساب في نافذة جديدة لإرسال الرسالة الجاهزة
          window.open(formatWhatsAppLink(apt.patientPhone, msg), '_blank');
        }
      }

      if (status === 'cancelled') {
        // Immediately remove from local state to satisfy "ينمسح من شاشة السكرتير مباشرة"
        setAppointments(prev => prev.filter(a => a.id !== id));
        showToast('تم إلغاء الموعد وحذفه من القائمة وإرسال إشعار للمريض');
      } else {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        showToast(`تم تأكيد الموعد وإرسال إشعار واتساب للمريض`);
      }
    } catch {
      showToast('فشل التحديث');
    }
  };

  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return [
      { label: 'مواعيد اليوم', value: appointments.filter(a => a.date === today).length, icon: <Calendar />, color: 'blue' },
      { label: 'طلبات جديدة', value: appointments.filter(a => a.status === 'pending').length, icon: <AlertCircle />, color: 'orange' },
      { label: 'إجمالي الأطباء', value: doctors.length, icon: <User />, color: 'purple' },
      { label: 'النسبة المكتملة', value: '88%', icon: <TrendingUp />, color: 'green' },
    ];
  };

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#fcfdfe] p-10">
      <DashboardSkeleton />
    </div>
  );

  // SECURE RENDER GUARD: Prevent any rendering if not a secretary
  if (!user || user.role !== 'secretary') {
    return null; // Wait for router.push to redirect
  }

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

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-6 md:px-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl bg-slate-50">
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <h1 className="font-extrabold text-xl text-slate-900">
              {activeTab === 'overview' && 'لوحة التحكم'}
              {activeTab === 'appointments' && 'إدارة المواعيد'}
              {activeTab === 'doctors' && 'الأطباء والعيادات'}
              {activeTab === 'schedule' && 'إدارة الجدول'}
              {activeTab === 'notifications' && 'الإشعارات'}
              {activeTab === 'settings' && 'الإعدادات'}
            </h1>
          </div>

            <div className="flex items-center gap-2 md:gap-4">
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
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Search className="w-4 h-4 text-slate-400" />
                <input placeholder="بحث سريع..." className="bg-transparent border-none outline-none text-xs font-bold w-32" />
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100">
                {user?.name.charAt(0)}
              </div>
            </div>
          </header>

          {/* APP VERSION: v1.0.5 (FORCE REFRESH) */}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {getStats().map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
                    <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-500 flex items-center justify-center mb-4`}>
                      {stat.icon}
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Row 2: Recent Appts & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-extrabold text-slate-900">أحدث المواعيد</h3>
                    <button onClick={() => setActiveTab('appointments')} className="text-xs font-bold text-blue-500 hover:underline">عرض الكل</button>
                  </div>
                  <div className="bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50/50 text-slate-400 font-bold">
                        <tr>
                          <th className="px-6 py-4">المريض</th>
                          <th className="px-6 py-4">الموعد</th>
                          <th className="px-6 py-4">الحالة</th>
                          <th className="px-6 py-4 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {appointments
                          .filter(a => a.status !== 'cancelled') // STRICT FILTER
                          .slice(0, 8)
                          .map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-slate-800">{apt.patientName}</p>
                                <p className="text-[10px] text-slate-400 mb-2" dir="ltr">{apt.patientPhone}</p>
                                
                                {/* Mobile Quick Actions */}
                                {apt.status === 'pending' && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <button 
                                      onClick={() => updateStatus(apt.id, 'confirmed')}
                                      className="flex-1 py-2 px-3 rounded-lg bg-green-500 text-white text-[10px] font-bold shadow-md flex items-center justify-center gap-1"
                                    >
                                      <Check className="w-3 h-3" /> تأكيد
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600">{apt.date} <br/> <span className="text-xs opacity-50">{apt.time}</span></td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold bg-${STATUS_CONFIG[apt.status].color}-50 text-${STATUS_CONFIG[apt.status].color}-500`}>
                                {STATUS_CONFIG[apt.status].label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => updateStatus(apt.id, 'cancelled')} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" title="حذف المريض">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-900 px-2">إجراءات سريعة</h3>
                  {doctors.length === 0 ? (
                    <div className="bg-blue-500 rounded-[32px] p-8 text-white shadow-xl shadow-blue-100 flex flex-col gap-6 relative overflow-hidden">
                      <div className="relative z-10">
                        <h4 className="text-xl font-extrabold mb-2">إضافة طبيب جديد</h4>
                        <p className="text-blue-100 text-xs mb-6">قم بتوسيع عيادتك بإضافة كادر طبي جديد بسهولة.</p>
                        <button onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }} className="w-full py-4 bg-white text-blue-500 rounded-[20px] font-extrabold shadow-lg">
                          + ابدأ الآن
                        </button>
                      </div>
                      <Plus className="absolute -bottom-8 -left-8 w-40 h-40 text-white/10" />
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-[32px] p-8 border border-blue-100 text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <Check className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-blue-800 mb-2">الطبيب مسجل</h4>
                      <p className="text-xs text-blue-600">تمت إضافة طبيب العيادة بنجاح. لا يمكنك إضافة طبيب آخر.</p>
                      <button onClick={() => setActiveTab('doctors')} className="mt-6 text-sm font-bold text-blue-500 hover:underline">
                        إدارة بيانات الطبيب
                      </button>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-[32px] p-6 border border-slate-50 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">التنبيهات</h4>
                    <div className="space-y-4">
                      {appointments
                        .filter(a => a.status === 'pending')
                        .slice(0, 3)
                        .map(apt => (
                        <div key={apt.id} className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">طلب حجز جديد</p>
                            <p className="text-[10px] text-slate-400">المريض: {apt.patientName}</p>
                          </div>
                        </div>
                      ))}
                      {appointments.filter(a => a.status === 'pending').length === 0 && (
                        <p className="text-[10px] text-slate-300 text-center py-4">لا توجد تنبيهات عاجلة</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: APPOINTMENTS (FULL TABLE) */}
          {activeTab === 'appointments' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
                  {['all', 'pending', 'confirmed', 'completed'].map(s => (
                    <button key={s} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-500">
                      {s === 'all' ? 'الكل' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 bg-white rounded-2xl border border-slate-50 shadow-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-600">آخر 7 أيام</span>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-8 py-5">المريض</th>
                      <th className="px-8 py-5">الموعد</th>
                      <th className="px-8 py-5">الحالة</th>
                      <th className="px-8 py-5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {appointments
                      .filter(a => a.status !== 'cancelled') // STRICT FILTER
                      .map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/30">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                              {apt.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{apt.patientName}</p>
                              <p className="text-[10px] text-slate-400" dir="ltr">{apt.patientPhone}</p>
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
                            {apt.status === 'pending' && (
                              <button onClick={() => updateStatus(apt.id, 'confirmed')} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all shadow-sm">
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <a href={`https://wa.me/${apt.patientPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <button onClick={() => updateStatus(apt.id, 'cancelled')} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" title="حذف المريض">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB: DOCTORS */}
          {activeTab === 'doctors' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-[40px] p-8 border border-slate-50 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-20 h-20 rounded-[28px] bg-blue-500 flex items-center justify-center text-4xl text-white shadow-xl shadow-blue-100">
                        {SPECIALTIES[doc.specialty as Specialty]?.icon || '🏥'}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => { setEditingDoctor(doc); setShowDoctorModal(true); }}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('هل أنت متأكد من حذف هذا الطبيب؟')) {
                              try {
                                await deleteDoctor(doc.id);
                                showToast('تم حذف الطبيب');
                                setDoctors(prev => prev.filter(d => d.id !== doc.id));
                              } catch {
                                showToast('فشل الحذف');
                              }
                            }
                          }}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-extrabold text-slate-800 mb-1">{doc.nameAr}</h3>
                    <p className="text-sm font-bold text-blue-500 mb-6">{doc.specialtyAr}</p>
                    
                    <div className="space-y-3 pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span>{doc.clinicAr} - {doc.cityAr}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>{doc.workingHours.start} - {doc.workingHours.end}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span dir="ltr">{doc.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add New Doctor Placeholder Card */}
                {!fetching && doctors.length === 0 && (
                  <button 
                    onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}
                    className="rounded-[40px] border-4 border-dashed border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-4 transition-all group py-16"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-extrabold text-slate-400 group-hover:text-blue-500 transition-all">إضافة طبيب العيادة</span>
                  </button>
                )}

                {doctors.length >= 1 && (
                  <div className="md:col-span-2 lg:col-span-3 bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-lg">ℹ️</div>
                    <p className="text-xs font-bold text-blue-700">لقد قمتِ بإضافة الطبيب بنجاح. لا يمكنكِ إضافة طبيب آخر إلا بعد حذف الحالي.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-slate-800">مركز الإشعارات</h2>
                <button onClick={() => setNotifications([])} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">مسح الكل</button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border border-slate-50">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="font-bold text-slate-400">لا توجد إشعارات جديدة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.isNew ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{notif.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{notif.time}</p>
                      </div>
                      {notif.isNew && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Fallback for other tabs */}
          {['schedule', 'settings'].includes(activeTab) && (
            <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <Settings className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-bold">هذا القسم قيد التطوير...</p>
            </div>
          )}

        </div>
      </main>

      {/* DOCTOR MODAL */}
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
                  {editingDoctor ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
                </h2>
                <button onClick={() => setShowDoctorModal(false)} className="p-2 rounded-full bg-slate-50 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data: any = {
                  nameAr: formData.get('nameAr'),
                  specialty: formData.get('specialty'),
                  specialtyAr: SPECIALTIES[formData.get('specialty') as Specialty].ar,
                  fee: Number(formData.get('fee')),
                  cityAr: formData.get('cityAr'),
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
                    showToast('تم تحديث البيانات بنجاح');
                  } else {
                    await addDoctor(data);
                    showToast('تم إضافة الطبيب بنجاح');
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
                    <label className="text-sm font-bold text-slate-600">التخصص</label>
                    <select name="specialty" required defaultValue={editingDoctor?.specialty} className="input-field">
                      {Object.entries(SPECIALTIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.ar}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">سعر الكشفية (دينار)</label>
                    <input name="fee" type="number" required defaultValue={editingDoctor?.fee} className="input-field" placeholder="25000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">رقم الهاتف</label>
                    <input name="phone" required defaultValue={editingDoctor?.phone} className="input-field" placeholder="0770XXXXXXX" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">المدينة</label>
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
                        <input name="days" type="checkbox" value={day} defaultChecked={editingDoctor?.workingDays.includes(day)} className="w-4 h-4 text-blue-500 rounded border-slate-300" />
                        <span className="text-xs font-bold text-slate-600">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">نبذة عن الطبيب (اختياري)</label>
                  <textarea name="bioAr" defaultValue={editingDoctor?.bioAr} className="input-field min-h-[100px]" placeholder="اكتب وصفاً مختصراً لخبرات الطبيب..." />
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
                    {editingDoctor ? 'حفظ التعديلات' : 'إضافة الطبيب الآن'}
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
