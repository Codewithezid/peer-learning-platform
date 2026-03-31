'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Brain,
  LayoutDashboard,
  UserCircle,
  Lightbulb,
  Library,
  Sparkles,
  Bot,
  Users,
  MessageCircle,
  Video,
  History,
  HelpCircle,
  BarChart3,
  Shield,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@/lib/adminAccess';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', href: '/profile', icon: UserCircle },
  { label: 'Skills', href: '/skills', icon: Lightbulb },
  { label: 'Learning', href: '/learning', icon: Sparkles },
  { label: 'Repository', href: '/knowledge', icon: Library },
  { label: 'AI Assistant', href: '/ai-assistant', icon: Bot },
  { label: 'Peers', href: '/peers', icon: Users },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Video Session', href: '/video-session', icon: Video },
  { label: 'History', href: '/history', icon: History },
  { label: 'Quizzes', href: '/quizzes', icon: HelpCircle },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Admin Console', href: '/admin/dashboard', icon: Shield },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

  // Track viewport size for mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      if (!profile?.id) {
        if (active) setCanAccessAdmin(false);
        return;
      }
      const access = await hasAdminAccess();
      if (active) {
        setCanAccessAdmin(access);
      }
    };

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [profile?.id]);

  const handleSignOut = async () => {
    await signOut();
  };

  const visibleNavItems = canAccessAdmin
    ? navItems
    : navItems.filter((item) => item.href !== '/admin/dashboard');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="font-bold text-xl text-blue-600">Peer Connect</span>
        </Link>
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobile && onClose) onClose();
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Mini Profile */}
      <div className="border-t border-slate-200 p-4">
        {profile ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile.full_name}
              </p>
              <Badge variant="primary" size="sm">
                Level {profile.level}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name="User" size="sm" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mt-1" />
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg mx-0 mt-2 w-full text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut size={20} />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:w-64 md:h-screen bg-white border-r border-slate-200 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-in sidebar */}
          <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-slate-200 z-50 md:hidden shadow-xl animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
