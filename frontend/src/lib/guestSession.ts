import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';

const GUEST_SESSION_KEY = 'peer_connect_guest_session';
const GUEST_EMAIL = 'guest@peerconnect.local';

interface LocalGuestSession {
  id: string;
  fullName: string;
  createdAt: string;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getGuestSession(): LocalGuestSession | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalGuestSession;
  } catch {
    window.localStorage.removeItem(GUEST_SESSION_KEY);
    return null;
  }
}

export function saveGuestSession(session: LocalGuestSession) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

export function clearGuestSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(GUEST_SESSION_KEY);
}

export function isGuestSessionActive() {
  return !!getGuestSession();
}

export function isGuestUser(user: Pick<User, 'id' | 'email' | 'user_metadata'> | null | undefined) {
  if (!user) return false;
  if (typeof user.id === 'string' && user.id.startsWith('guest-')) return true;
  if (user.email === GUEST_EMAIL) return true;
  return Boolean((user.user_metadata as { is_guest?: boolean } | null)?.is_guest);
}

export function createLocalGuestSession(): LocalGuestSession {
  const createdAt = new Date().toISOString();
  return {
    id: `guest-${createdAt}`,
    fullName: 'Guest User',
    createdAt,
  };
}

export function buildGuestUser(guest: LocalGuestSession): User {
  return {
    id: guest.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: GUEST_EMAIL,
    email_confirmed_at: guest.createdAt,
    phone: '',
    confirmed_at: guest.createdAt,
    last_sign_in_at: guest.createdAt,
    app_metadata: { provider: 'guest-local', providers: ['guest-local'] },
    user_metadata: { full_name: guest.fullName, is_guest: true },
    identities: [],
    created_at: guest.createdAt,
    updated_at: guest.createdAt,
    is_anonymous: true,
  };
}

export function buildGuestProfile(guest: LocalGuestSession): Profile {
  return {
    id: guest.id,
    full_name: guest.fullName,
    avatar_url: null,
    bio: 'Guest session',
    headline: 'Explore as guest',
    location: null,
    xp_points: 0,
    level: 1,
    created_at: guest.createdAt,
    updated_at: guest.createdAt,
  };
}
