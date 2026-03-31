'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }

    // Fallback redirect after 10 seconds if something goes wrong
    const timeout = setTimeout(() => {
      if (!user) {
        router.push('/login');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [user, loading, router]);

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
