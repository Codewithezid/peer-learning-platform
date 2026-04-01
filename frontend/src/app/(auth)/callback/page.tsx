'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function CallbackPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const finalizeOAuth = async () => {
      // 1) Exchange OAuth authorization code if present (PKCE flow).
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && !cancelled) {
          router.replace('/login');
          return;
        }
      }

      // 2) Read session immediately after exchange.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        await refreshProfile();
        router.replace('/dashboard');
        return;
      }

      // 3) Fallback: wait briefly for auth state propagation, then return to login.
      fallbackTimeout = setTimeout(() => {
        if (!cancelled) router.replace('/login');
      }, 15000);
    };

    if (!loading && user) {
      router.replace('/dashboard');
      return;
    }

    finalizeOAuth();

    return () => {
      cancelled = true;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [user, loading, router, refreshProfile]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <Brain className="h-12 w-12 text-blue-500" />
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-sm">
          Completing sign in, please wait...
        </p>
      </div>
    </div>
  );
}
