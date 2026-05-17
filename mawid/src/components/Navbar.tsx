'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Hide nav on admin and secretary pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/secretary')) return null;

  const tabs = user?.role === 'secretary' 
    ? [
        { icon: '🏠', label: 'الرئيسية', href: '/' },
        { icon: '📋', label: 'لوحتي', href: '/secretary' },
        { icon: '👤', label: 'حسابي', href: '/auth' },
      ]
    : [
        { icon: '🏠', label: 'الرئيسية', href: '/' },
        { icon: '🔍', label: 'بحث', href: '/search' },
        { icon: '📅', label: 'مواعيدي', href: '/my-appointments' },
        { icon: '👤', label: user ? 'حسابي' : 'دخول', href: user ? '/profile' : '/auth' },
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#e2e8f0] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] flex z-50 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 gap-1 border-t-2 transition-colors ${
              isActive ? 'border-[#0ea5e9]' : 'border-transparent'
            }`}
          >
            <span className="text-[20px]">{tab.icon}</span>
            <span className={`text-[10px] font-bold ${isActive ? 'text-[#0ea5e9]' : 'text-[#94a3b8]'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
