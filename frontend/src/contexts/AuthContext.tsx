'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';
import {
  buildGuestProfile,
  buildGuestUser,
  clearGuestSession,
  createLocalGuestSession,
  getGuestSession,
  saveGuestSession,
} from '@/lib/guestSession';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const applyGuestSession = (guest: ReturnType<typeof getGuestSession>) => {
    if (!guest) return;
    setSession(null);
    setUser(buildGuestUser(guest));
    setProfile(buildGuestProfile(guest));
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const profilePayload = unwrapData<Profile & { user_skills?: unknown[] }>(response);
      setProfile(profilePayload ?? null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const localGuest = getGuestSession();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          clearGuestSession();
          await fetchProfile();
        } else if (localGuest) {
          applyGuestSession(localGuest);
        } else {
          setProfile(null);
        }
      } catch {
        if (localGuest) applyGuestSession(localGuest);
        else setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        clearGuestSession();
        setUser(session.user);
        fetchProfile();
      } else {
        const localGuest = getGuestSession();
        if (localGuest) applyGuestSession(localGuest);
        else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    clearGuestSession();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    clearGuestSession();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) throw error;
  };

  const signInAsGuest = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: 'Guest User',
          },
        },
      });
      if (error) throw error;
    } catch {
      const localGuest = createLocalGuestSession();
      saveGuestSession(localGuest);
      applyGuestSession(localGuest);
    }
  };

  const signOut = async () => {
    clearGuestSession();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network failures so local guest logout still works.
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = fetchProfile;

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signUp, signIn, signInWithGoogle, signInAsGuest, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
