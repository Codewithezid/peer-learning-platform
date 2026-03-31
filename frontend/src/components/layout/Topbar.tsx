'use client';

import { useState } from 'react';
import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-30 flex items-center px-4 gap-4">
      {/* Mobile hamburger menu */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>

      {/* Search bar */}
      <div className="flex-1 flex justify-center">
        <div className="relative max-w-md w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search peers, skills, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-50 border-none pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name ?? 'User'}
            size="sm"
          />
          <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
            {profile?.full_name ?? 'User'}
          </span>
        </button>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">{loggingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
