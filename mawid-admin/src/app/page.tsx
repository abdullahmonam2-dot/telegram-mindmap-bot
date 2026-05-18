'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, get, remove, update, onValue } from 'firebase/database';
import { Users, Stethoscope, Calendar, Trash2, Key, MessageCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Megaphone, Plus } from 'lucide-react';
import { verifyAdminPassword } from '@/actions/auth';

type Tab = 'users' | 'doctors' | 'appointments' | 'recovery' | 'ads';

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [recoveryReqs, setRecoveryReqs] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resetUid, setResetUid] = useState<string | null>(null);
  const [resetName, setResetName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setAuthed(true);
          } else {
            setAuthed(false);
            sessionStorage.removeItem('admin_authed');
          }
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!authed) return;

    const unsub1 = onValue(ref(db, 'users'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setUsers(arr.filter(u => u && typeof u === 'object' && u.uid));
      } else {
        setUsers([]);
      }
    });

    const unsub2 = onValue(ref(db, 'doctors'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setDoctors(arr.filter(d => d && typeof d === 'object'));
      } else {
        setDoctors([]);
      }
    });

    const unsub3 = onValue(ref(db, 'appointments'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setAppointments(arr.filter(a => a && typeof a === 'object'));
      } else {
        setAppointments([]);
      }
    });

    const unsub4 = onValue(ref(db, 'passwordResets'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setRecoveryReqs(arr.filter(r => r && typeof r === 'object'));
      } else {
        setRecoveryReqs([]);
      }
    });

    const unsub5 = onValue(ref(db, 'activationCodes'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setCodes(arr.filter(c => typeof c === 'string'));
      } else {
        setCodes([]);
      }
    });

    const unsub6 = onValue(ref(db, 'ads'), snap => {
      if (snap.exists() && snap.val()) {
        const val = snap.val();
        const arr = Array.isArray(val) ? val : Object.values(val);
        setAds(arr.filter(a => a && typeof a === 'object'));
      } else {
        setAds([]);
      }
    });

    setLoading(false);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyAdminPassword(password);
    if (res.success) {
      if (res.token) {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');
        try {
          await signInWithCustomToken(auth, res.token);
        } catch (err) {
          console.error("Firebase Auth sign in failed", err);
          setError("خطأ في تسجيل الدخول مع Firebase.");
          return;
        }
      }
      sessionStorage.setItem('admin_authed', 'true');
      setAuthed(true);
    } else {
      setError(res.error || 'كلمة المرور غير صحيحة');
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await remove(ref(db, `users/${uid}`));
    
    // Delete via API
    await fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid }) });
  };

  const deleteDoctor = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;
    await remove(ref(db, `doctors/${id}`));
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    await remove(ref(db, `appointments/${id}`));
  };

  const addCode = async () => {
    if (!newCode.trim()) return;
    const code = newCode.trim().toUpperCase();
    const newRef = ref(db, `activationCodes/${code}`);
    await update(ref(db), { [`activationCodes/${code}`]: code });
    setNewCode('');
  };

  const deleteCode = async (code: string) => {
    await remove(ref(db, `activationCodes/${code}`));
  };

  const addAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const linkUrl = formData.get('linkUrl') as string;
    
    if (!title || !description || !imageUrl) return;
    
    const id = `ad-${Date.now()}`;
    try {
      await update(ref(db), {
        [`ads/${id}`]: { id, title, description, imageUrl, linkUrl: linkUrl || '', createdAt: Date.now() }
      });
      (e.target as HTMLFormElement).reset();
      alert('✅ تم نشر الإعلان بنجاح!');
    } catch (err: any) {
      console.error('Ad write error:', err);
      alert('❌ فشل النشر: ' + (err?.message || 'خطأ غير معروف') + '\n\nتحقق من إعدادات Firebase.');
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    await remove(ref(db, `ads/${id}`));
  };

  const dismissRecovery = async (key: string) => {
    await remove(ref(db, `passwordResets/${key}`));
  };

  const resetPassword = async () => {
    if (!resetUid || !newPass || newPass.length < 6) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: resetUid, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMsg('✅ تم تغيير كلمة المرور بنجاح!');
        setNewPass('');
        // Clean up recovery request if one matches
        const matchedUser = users.find(u => u && u.uid === resetUid);
        if (matchedUser) {
          const req = recoveryReqs.find(r => r && r.phone === matchedUser.phone);
          if (req) {
            await remove(ref(db, `passwordResets/${req.id}`));
          }
        }
        setTimeout(() => { setResetUid(null); setResetMsg(''); }, 2000);
      } else {
        setResetMsg('❌ فشل: ' + data.error);
      }
    } catch {
      setResetMsg('❌ خطأ في الاتصال');
    }
    setResetLoading(false);
  };

  const secretaries = users.filter(u => u && u.role === 'secretary');
  const patients = users.filter(u => u && u.role === 'patient');

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/40">
              <span className="text-3xl font-black text-white">M</span>
            </div>
            <h1 className="text-2xl font-black text-white">لوحة تحكم الإدارة</h1>
            <p className="text-slate-400 text-sm mt-1">نظام موعد - مخصص للمدير فقط</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-300 block mb-2">كلمة مرور الإدارة</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 text-right"
                placeholder="أدخل كلمة المرور"
                required
                dir="rtl"
              />
            </div>
            {error && <p className="text-red-400 text-sm font-bold text-center bg-red-500/10 rounded-xl py-2">{error}</p>}
            <button type="submit" className="w-full bg-blue-500 text-white rounded-xl py-3 font-black text-base shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors">
              دخول
            </button>
          </form>
          <p className="text-center text-slate-600 text-xs mt-6">هذه اللوحة منفصلة تماماً عن تطبيق موعد</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TABS = [
    { id: 'users', label: 'المستخدمون', icon: Users, count: users.length },
    { id: 'doctors', label: 'الأطباء', icon: Stethoscope, count: doctors.length },
    { id: 'appointments', label: 'المواعيد', icon: Calendar, count: appointments.length },
    { id: 'recovery', label: 'طلبات الاستعادة', icon: AlertTriangle, count: recoveryReqs.length },
    { id: 'ads', label: 'الإعلانات', icon: Megaphone, count: ads.length },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">M</div>
          <div>
            <h1 className="font-black text-white text-lg leading-none">لوحة تحكم موعد</h1>
            <p className="text-slate-500 text-xs">Admin Dashboard</p>
          </div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('admin_authed'); setAuthed(false); }} className="text-slate-500 text-sm hover:text-red-400 transition-colors font-bold">
          تسجيل الخروج
        </button>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col p-4 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{tab.label}</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}

          {/* Activation Codes Section */}
          <div className="mt-6 border-t border-slate-800 pt-6">
            <p className="text-slate-500 text-xs font-bold mb-3 px-2">🔑 أكواد التفعيل</p>
            <div className="space-y-1">
              {codes.map(code => (
                <div key={code} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-green-400 font-mono text-xs font-bold">{code}</span>
                  <button onClick={() => deleteCode(code)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="كود جديد..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 uppercase"
                onKeyDown={e => e.key === 'Enter' && addCode()}
              />
              <button onClick={addCode} className="bg-blue-500 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-blue-600 transition-colors">
                +
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-6 mb-6">
                <div className="bg-slate-800 rounded-2xl px-6 py-4">
                  <p className="text-slate-400 text-xs font-bold">سكرتارية</p>
                  <p className="text-2xl font-black text-blue-400">{secretaries.length}</p>
                </div>
                <div className="bg-slate-800 rounded-2xl px-6 py-4">
                  <p className="text-slate-400 text-xs font-bold">مرضى</p>
                  <p className="text-2xl font-black text-green-400">{patients.length}</p>
                </div>
              </div>
              <h2 className="text-lg font-black text-white mb-4">جميع المستخدمين ({users.length})</h2>
              {users.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold">لا يوجد مستخدمون</div>
              ) : (
                <div className="space-y-3">
                  {users.map(user => (
                    <div key={user.uid} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${user.role === 'secretary' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {user.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white">{user.name}</p>
                            <p className="text-slate-500 text-xs" dir="ltr">{user.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${user.role === 'secretary' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                            {user.role === 'secretary' ? 'سكرتير' : 'مريض'}
                          </span>
                          <button
                            onClick={() => { setResetUid(user.uid); setResetName(user.name); setNewPass(''); setResetMsg(''); }}
                            className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteUser(user.uid)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Reset Password inline form */}
                      {resetUid === user.uid && (
                        <div className="mt-4 bg-slate-800 rounded-xl p-4 space-y-3">
                          <p className="text-yellow-400 text-xs font-bold">🔑 إعادة تعيين كلمة مرور: {resetName}</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPass}
                              onChange={e => setNewPass(e.target.value)}
                              placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-yellow-500"
                              dir="ltr"
                            />
                            <button
                              onClick={resetPassword}
                              disabled={resetLoading || newPass.length < 6}
                              className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-yellow-400 transition-colors"
                            >
                              {resetLoading ? '...' : 'تغيير'}
                            </button>
                            <button onClick={() => setResetUid(null)} className="px-3 py-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors">
                              ✕
                            </button>
                          </div>
                          {resetMsg && <p className="text-xs font-bold text-center">{resetMsg}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Doctors Tab */}
          {activeTab === 'doctors' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white mb-4">الأطباء المسجلون ({doctors.length})</h2>
              {doctors.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold">لا يوجد أطباء</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map(doc => (
                    <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-black text-white text-base">{doc.nameAr}</p>
                          <p className="text-blue-400 text-xs font-bold">{doc.specialtyAr}</p>
                        </div>
                        <button onClick={() => deleteDoctor(doc.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1 text-xs font-bold text-slate-500">
                        <p>🏥 {doc.clinicAr}</p>
                        <p>📍 {doc.cityAr}</p>
                        <p>💰 {doc.fee?.toLocaleString()} دينار</p>
                        <p dir="ltr">📞 {doc.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white mb-4">جميع المواعيد ({appointments.length})</h2>
              {appointments.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold">لا توجد مواعيد</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <table className="w-full text-right">
                    <thead className="bg-slate-900">
                      <tr className="text-slate-500 text-xs font-black uppercase">
                        <th className="px-6 py-4">المريض</th>
                        <th className="px-6 py-4">الطبيب</th>
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950">
                      {appointments.map(apt => (
                        <tr key={apt.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white text-sm">{apt.patientName}</p>
                            <p className="text-slate-500 text-xs" dir="ltr">{apt.patientPhone}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm font-bold">{apt.doctorNameAr}</td>
                          <td className="px-6 py-4 text-slate-300 text-sm">{apt.date} - {apt.time}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              apt.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                              apt.status === 'pending' ? 'bg-orange-500/10 text-orange-400' :
                              apt.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {apt.status === 'confirmed' ? 'مؤكد' : apt.status === 'pending' ? 'انتظار' : apt.status === 'cancelled' ? 'ملغى' : 'مكتمل'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => deleteAppointment(apt.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recovery Requests Tab */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white mb-4">طلبات استعادة الحساب ({recoveryReqs.length})</h2>
              {recoveryReqs.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold">لا توجد طلبات استعادة</div>
              ) : (
                <div className="space-y-3">
                  {recoveryReqs.map((req, idx) => {
                    const matchedUser = users.find(u => u && u.phone === req.phone);
                    return (
                      <div key={req.id || idx} className="bg-slate-900 border border-orange-500/20 rounded-2xl p-5 hover:border-orange-500/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-white">{req.name}</p>
                              {matchedUser ? (
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold">حساب مسجل</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-bold">غير مسجل بالرقم</span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mt-1" dir="ltr">{req.phone}</p>
                            {req.createdAt && <p className="text-slate-600 text-xs mt-1">{new Date(req.createdAt).toLocaleString('ar-IQ')}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {matchedUser && (
                              <button 
                                onClick={() => { setResetUid(matchedUser.uid); setResetName(req.name); setNewPass(''); setResetMsg(''); }}
                                className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-slate-950 transition-all"
                                title="إعادة تعيين كلمة المرور"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            )}
                            <a 
                              href={`https://wa.me/${req.phone?.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-slate-950 transition-all"
                              title="تواصل واتساب"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => dismissRecovery(req.id || idx.toString())} 
                              className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              title="حذف الطلب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Reset Password form nested inside card */}
                        {matchedUser && resetUid === matchedUser.uid && (
                          <div className="mt-4 bg-slate-800 rounded-xl p-4 space-y-3 border border-yellow-500/20">
                            <p className="text-yellow-400 text-xs font-bold">🔑 إعادة تعيين كلمة مرور: {resetName}</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-yellow-500"
                                dir="ltr"
                              />
                              <button
                                onClick={resetPassword}
                                disabled={resetLoading || newPass.length < 6}
                                className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-yellow-400 transition-colors"
                              >
                                {resetLoading ? '...' : 'تغيير'}
                              </button>
                              <button onClick={() => setResetUid(null)} className="px-3 py-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors">
                                ✕
                              </button>
                            </div>
                            {resetMsg && <p className="text-xs font-bold text-center">{resetMsg}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" /> إضافة إعلان جديد
                </h2>
                <form onSubmit={addAd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="title" required placeholder="العنوان (مثال: مختبر البركة)" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                  <input name="description" required placeholder="الوصف (الخصم أو العرض)" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                  <input name="imageUrl" required placeholder="رابط الصورة (Image URL)" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" dir="ltr" />
                  <input name="linkUrl" placeholder="رابط توجيهي اختياري (واتساب...)" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" dir="ltr" />
                  <button type="submit" className="md:col-span-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-black text-sm transition-colors">
                    نشر الإعلان الآن
                  </button>
                </form>
              </div>

              <h2 className="text-lg font-black text-white mb-4">الإعلانات النشطة ({ads.length})</h2>
              {ads.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold">لا يوجد إعلانات حالياً</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ads.map((ad) => (
                    <div key={ad.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
                      <div className="h-40 bg-slate-800 relative">
                        <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => deleteAd(ad.id)}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-black text-white text-base mb-1">{ad.title}</p>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed line-clamp-2">{ad.description}</p>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md">إعلان نشط</span>
                          <span className="text-slate-500 text-[10px]">{new Date(ad.createdAt).toLocaleDateString('ar-IQ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
