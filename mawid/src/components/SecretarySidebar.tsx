'use client';
import { motion } from 'framer-motion';
import { 
  CalendarCheck, 
  Bell, 
  LogOut,
  X
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onClose?: () => void;
}

const MENU_ITEMS = [
  { id: 'requests', label: 'الطلبات الجديدة', icon: <Bell className="w-5 h-5" /> },
  { id: 'appointments', label: 'إدارة المواعيد', icon: <CalendarCheck className="w-5 h-5" /> },
];

export default function Sidebar({ activeTab, setActiveTab, onClose }: SidebarProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <aside className="h-full bg-white border-l border-slate-50 flex flex-col p-6 overflow-y-auto">
      {/* Mobile Close */}
      <div className="flex md:hidden justify-end mb-4">
        <button onClick={onClose} className="p-3 rounded-2xl bg-slate-50 text-slate-400 active:scale-90 transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-100">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <div className="text-right">
          <h2 className="font-extrabold text-2xl text-slate-900 leading-none">موعد</h2>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab(item.id);
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[20px] font-bold text-sm transition-all active:scale-95 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`${activeTab === item.id ? 'text-white' : 'text-blue-400'}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="pt-8 border-t border-slate-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] font-bold text-sm text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
