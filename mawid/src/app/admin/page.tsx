'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Key, Check, X, Shield, Copy, RefreshCw, 
  Users, Search, Trash2, Mail, Phone, LogOut, 
  BarChart3, Settings, AlertTriangle, ExternalLink
} from 'lucide-react';
import { 
  generateActivationCode, 
  getAllActivationCodes,
  addAd,
  getAllAds,
  deleteAd,
  getAdminStats,
  getUsers,
  deleteUser,
  resetDatabase
} from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tab, setTab] = useState<'codes' | 'ads' | 'stats' | 'users'>('stats');
  const [codes, setCodes] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalDoctors: 0, totalAppointments: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('admin_auth');
      const expiry = localStorage.getItem('admin_session_expiry');
      
      if (auth === 'true' && expiry && Date.now() < parseInt(expiry)) {
        setIsAuthorized(true);
        loadData();
      } else {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { getPasswordResetRequests } = require('@/lib/db');
      const [codesData, adsData, statsData, usersData, resetsData] = await Promise.all([
        getAllActivationCodes(),
        getAllAds(),
        getAdminStats(),
        getUsers(),
        getPasswordResetRequests()
      ]);
      setCodes(codesData);
      setAds(adsData);
      setStats(statsData);
      setUsers(usersData);
      setResets(resetsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser || !newPassword) return;
    setLoading(true);
    const { resetUserPassword } = require('@/actions/admin-actions');
    const res = await resetUserPassword(resettingUser.uid, newPassword);
    if (res.success) {
      alert('تم تغيير كلمة المرور بنجاح!');
      const request = resets.find(r => r.phone === resettingUser.phone);
      if (request) {
        const { deletePasswordResetRequest } = require('@/lib/db');
        await deletePasswordResetRequest(request.id);
      }
      setResettingUser(null);
      setNewPassword('');
      loadData();
    } else {
      alert('فشل تغيير كلمة المرور: ' + res.error);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_session_expiry');
    router.push('/admin/login');
  };

  const handleGenerate = async () => {
    setLoading(true);
    await generateActivationCode();
    await loadData();
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ الكود: ' + text);
  };

  if (!isAuthorized) return null; // Wait for redirect

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-right" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">لوحة تحكم الإدارة</h1>
              <p className="text-slate-400 font-bold text-xs">مؤسسة شهامة الأنبار - النظام المركزي</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              عرض الموقع
            </button>
            <div className="w-px h-6 bg-slate-100 mx-2" />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 p-1.5 rounded-[24px] w-fit mx-auto md:mx-0">
          <button 
            onClick={() => setTab('stats')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'stats' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 className="w-4 h-4" />
            الإحصائيات
          </button>
          <button 
            onClick={() => setTab('users')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'users' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" />
            المستخدمين
          </button>
          <button 
            onClick={() => setTab('resets')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'resets' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            طلبات الاستعادة
            {resets.length > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{resets.length}</span>}
          </button>
          <button 
            onClick={() => setTab('codes')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'codes' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Key className="w-4 h-4" />
            أكواد التفعيل
          </button>
          <button 
            onClick={() => setTab('ads')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all ${tab === 'ads' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <RefreshCw className="w-4 h-4" />
            الإعلانات
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            
            {/* STATS TAB */}
            {tab === 'stats' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <Users className="w-7 h-7" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm mb-1">إجمالي المسجلين</p>
                      <p className="text-4xl font-black text-slate-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                        <Shield className="w-7 h-7" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm mb-1">العيادات والطباء</p>
                      <p className="text-4xl font-black text-slate-900">{stats.totalDoctors}</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                        <RefreshCw className="w-7 h-7" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm mb-1">إجمالي الحجوزات</p>
                      <p className="text-4xl font-black text-slate-900">{stats.totalAppointments}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 p-10 rounded-[40px] border border-red-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-red-600 text-xl font-black">منطقة الخطر (إعادة ضبط المصنع) ⚠️</h3>
                  </div>
                  <p className="text-red-900/60 text-sm font-bold mb-8 max-w-2xl leading-relaxed">
                    سيؤدي الضغط على الزر أدناه إلى حذف كافة البيانات (حسابات المستخدمين، المواعيد، الإعلانات، أكواد التفعيل) بشكل نهائي من قاعدة البيانات. لا يمكن التراجع عن هذه العملية أبداً.
                  </p>
                  <button 
                    onClick={async () => {
                      if (confirm('هل أنت متأكد تماماً من تصفير البرنامج بالكامل؟ سيتم حذف كل البيانات!')) {
                        await resetDatabase();
                        alert('تم تصفير قاعدة البيانات بنجاح.');
                        loadData();
                      }
                    }}
                    className="px-8 py-4 bg-red-600 text-white rounded-[20px] font-extrabold shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-3"
                  >
                    <Trash2 className="w-5 h-5" />
                    تصفير البرنامج وقاعدة البيانات الآن
                  </button>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {tab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm flex items-center gap-4 max-w-2xl">
                  <Search className="w-6 h-6 text-slate-300" />
                  <input 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ابحث عن مستخدم بالاسم أو رقم الهاتف..."
                    className="flex-1 bg-transparent outline-none font-bold text-slate-700 text-lg"
                  />
                </div>

                <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[800px]">
                      <thead className="bg-slate-50/50 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-6">المستخدم</th>
                          <th className="px-8 py-6">رقم الهاتف</th>
                          <th className="px-8 py-6">الصفة</th>
                          <th className="px-8 py-6">تاريخ التسجيل</th>
                          <th className="px-8 py-6 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users && users.length > 0 ? (
                          users
                            .filter(u => {
                              if (!userSearch) return true;
                              const s = userSearch.toLowerCase();
                              return (u?.name?.toLowerCase().includes(s)) || (u?.phone?.includes(s));
                            })
                            .map((u) => (
                              <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold">
                                      {u.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-extrabold text-slate-900">{u.name || 'مستخدم بدون اسم'}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-2 font-bold text-slate-600" dir="ltr">
                                    <Phone className="w-4 h-4 text-slate-300" />
                                    <span>{u.phone || '---'}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wide ${u.role === 'secretary' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {u.role === 'secretary' ? 'سكرتيرة عيادة' : 'مريض / مراجع'}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-sm font-bold text-slate-400">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '---'}
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex justify-center gap-2">
                                    <button 
                                      onClick={() => setResettingUser(u)}
                                      className="p-3 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                      title="إعادة تعيين كلمة المرور"
                                    >
                                      <Key className="w-5 h-5" />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm(`هل أنت متأكد من حذف ${u.name}؟`)) {
                                          const { deleteUserFromAuth } = require('@/actions/admin-actions');
                                          await deleteUserFromAuth(u.uid);
                                          await deleteUser(u.uid);
                                          loadData();
                                        }
                                      }}
                                      className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-24 text-center text-slate-300 font-bold">
                              لا يوجد مستخدمون لعرضهم حالياً
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CODES TAB */}
            {tab === 'codes' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-extrabold flex items-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    توليد كود تفعيل جديد
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">إجمالي الأكواد</p>
                    <p className="text-3xl font-black text-slate-900">{codes.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">المباعة (المستخدمة)</p>
                    <p className="text-3xl font-black text-green-500">{codes.filter(c => c.used).length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">المتاحة للبيع</p>
                    <p className="text-3xl font-black text-blue-500">{codes.filter(c => !c.used).length}</p>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50/50 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-6">الكود</th>
                        <th className="px-8 py-6">تاريخ الإنشاء</th>
                        <th className="px-8 py-6">الحالة</th>
                        <th className="px-8 py-6">تاريخ الاستخدام</th>
                        <th className="px-8 py-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {codes.map((c) => (
                        <tr key={c.code} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <code className="bg-slate-100 px-4 py-2 rounded-xl font-mono font-black text-blue-600 text-base">{c.code}</code>
                              <button onClick={() => copyToClipboard(c.code)} className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl text-slate-300 hover:text-blue-600 transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-500">{new Date(c.createdAt).toLocaleDateString('ar-EG')}</td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${c.used ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {c.used ? 'مستعمل' : 'متاح للبيع'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-400">
                            {c.usedAt ? new Date(c.usedAt).toLocaleString('ar-EG') : '---'}
                          </td>
                          <td className="px-8 py-6"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADS TAB */}
            {tab === 'ads' && (
              <div className="space-y-8">
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowAdModal(true)}
                    className="px-8 py-4 bg-slate-900 text-white rounded-[24px] font-extrabold flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة إعلان جديد
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {ads.map((ad) => (
                    <div key={ad.id} className="bg-white rounded-[48px] border border-slate-50 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
                      <div className="h-56 bg-slate-100 relative overflow-hidden">
                        <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={async () => {
                            if (confirm('هل تريد حذف الإعلان؟')) {
                              await deleteAd(ad.id);
                              loadData();
                            }
                          }}
                          className="absolute top-6 left-6 p-3 bg-red-500 text-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-8">
                        <h3 className="font-black text-slate-900 text-xl mb-2">{ad.title}</h3>
                        <p className="text-sm text-slate-400 font-bold mb-6 line-clamp-2 leading-relaxed">{ad.description}</p>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-4 py-2 bg-blue-50 rounded-xl">إعلان نشط</span>
                          <p className="text-[10px] text-slate-300 font-bold">نُشر في: {new Date(ad.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ads.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 py-32 text-center bg-white rounded-[48px] border border-slate-50">
                      <p className="font-bold text-slate-300 text-lg">لا توجد إعلانات نشطة حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* AD MODAL */}
      <AnimatePresence>
        {showAdModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-slate-900">إضافة إعلان جديد</h2>
                <button onClick={() => setShowAdModal(false)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addAd({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  imageUrl: formData.get('imageUrl') as string,
                  linkUrl: formData.get('linkUrl') as string,
                });
                setShowAdModal(false);
                loadData();
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600 px-2">اسم المعلن / العنوان الرئيسي</label>
                  <input name="title" required className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:border-blue-500 font-bold" placeholder="مثلاً: مختبر البركة التخصصي" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600 px-2">الوصف (العرض المقدم)</label>
                  <input name="description" required className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:border-blue-500 font-bold" placeholder="مثلاً: خصم خاص لمرضى موعد على كافة التحاليل" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600 px-2">رابط الصورة (Image URL)</label>
                  <input name="imageUrl" required className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:border-blue-500 font-bold" placeholder="رابط مباشر للصورة (jpg, png...)" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600 px-2">رابط توجيهي (اختياري)</label>
                  <input name="linkUrl" className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:border-blue-500 font-bold" placeholder="رابط واتساب أو فيسبوك..." />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">حفظ ونشر الإعلان الآن</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      {/* PASSWORD RESET MODAL */}
      <AnimatePresence>
        {resettingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900">تغيير كلمة المرور</h2>
                <button onClick={() => setResettingUser(null)} className="p-2 rounded-full bg-slate-50 text-slate-400"><X className="w-6 h-6" /></button>
              </div>
              <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                سيتم تغيير كلمة المرور للمستخدم <span className="text-blue-600">{resettingUser.name}</span>. <br/>
                يرجى تزويده بالكلمة الجديدة بعد الحفظ.
              </p>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600 px-2">كلمة المرور الجديدة</label>
                  <input 
                    type="text" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:border-blue-500 font-bold text-center text-xl" 
                    placeholder="أدخل 6 أرقام أو أكثر"
                  />
                </div>
                <div className="flex gap-3">
                   <button 
                    onClick={handleResetPassword}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-100"
                  >
                    حفظ التغيير
                  </button>
                  <button 
                    onClick={() => {
                      const msg = `أهلاً ${resettingUser.name}، تم إعادة تعيين كلمة المرور الخاصة بك بنجاح.\nكلمة المرور الجديدة هي: ${newPassword}\nيرجى استخدامها لتسجيل الدخول الآن.`;
                      const { formatWhatsAppLink } = require('@/lib/utils');
                      window.open(formatWhatsAppLink(resettingUser.phone, msg), '_blank');
                    }}
                    disabled={!newPassword}
                    className="flex-1 py-4 bg-green-500 text-white rounded-[24px] font-black shadow-xl shadow-green-100 disabled:opacity-50"
                  >
                    إرسال واتساب
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
