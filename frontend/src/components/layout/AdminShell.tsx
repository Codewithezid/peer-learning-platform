'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/adminAccess';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Employees', href: '/admin/employees' },
  { label: 'Resources', href: '/admin/resources' },
  { label: 'Performance', href: '/admin/performance-analytics' },
  { label: 'Peer Sessions', href: '/admin/peer-session-analytics' },
  { label: 'AI Usage', href: '/admin/ai-usage-analytics' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    let active = true;

    const verify = async () => {
      const canAccess = await hasAdminAccess();
      if (!active) return;

      if (!canAccess) {
        toast.error('Admin access required');
        setAllowed(false);
        setCheckingAccess(false);
        router.replace('/dashboard');
        return;
      }

      setAllowed(true);
      setCheckingAccess(false);
    };

    verify();

    return () => {
      active = false;
    };
  }, [loading, router, user]);

  if (loading || checkingAccess || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading admin workspace...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium text-blue-600">Admin Console</p>
            <h1 className="text-lg font-bold text-slate-900">Peer Connect</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back to Employee App
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
