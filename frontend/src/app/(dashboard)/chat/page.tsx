'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  Search,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { isGuestUser } from '@/lib/guestSession';
import { timeAgo } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { Conversation } from '@/types';

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function ChatListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton variant="circle" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

const GUEST_CONVERSATIONS: Conversation[] = [
  {
    id: 'guest-conv-1',
    participant_1: 'guest-user',
    participant_2: 'guest-peer-1',
    created_at: new Date().toISOString(),
    last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    other_user: {
      id: 'guest-peer-1',
      full_name: 'Aisha Verma',
      avatar_url: null,
      bio: 'Backend engineer and mentor',
      headline: 'Backend & System Design',
      location: 'Bengaluru',
      xp_points: 920,
      level: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'guest-conv-2',
    participant_1: 'guest-user',
    participant_2: 'guest-peer-2',
    created_at: new Date().toISOString(),
    last_message_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    other_user: {
      id: 'guest-peer-2',
      full_name: 'Rahul Nair',
      avatar_url: null,
      bio: 'AIML engineer',
      headline: 'ML Engineer (NLP/LLMs)',
      location: 'Hyderabad',
      xp_points: 810,
      level: 6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

/* ================================================================== */
/*  Chat Page                                                          */
/* ================================================================== */

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchConversations() {
      if (isGuestUser(user)) {
        setConversations(GUEST_CONVERSATIONS);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/conversations');
        setConversations(unwrapData<Conversation[]>(response) || []);
      } catch (err: any) {
        console.error('Failed to load conversations:', err);
        setError('Unable to load conversations. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [user]);

  /* ---- Filtered conversations -------------------------------------- */
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const other = conv.other_user || conv.other_participant;
    return other?.full_name?.toLowerCase().includes(q);
  });

  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
          <p className="mt-1 text-slate-500">Your conversations with peers</p>
        </div>
        <Button onClick={() => router.push('/peers')}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-16rem)]">
        {/* ============================================================ */}
        {/*  Left panel: Conversation list                                */}
        {/* ============================================================ */}
        <Card className="lg:col-span-1 overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100">
            <Input
              placeholder="Search conversations..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className="overflow-y-auto max-h-[calc(100vh-20rem)]">
            {loading ? (
              <ChatListSkeleton />
            ) : error ? (
              <div className="p-4">
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="Error loading chats"
                  description={error}
                />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<MessageSquare className="h-10 w-10" />}
                  title="Start connecting with peers"
                  description="Find peers to start a conversation"
                  action={
                    <Button size="sm" onClick={() => router.push('/peers')}>
                      Find Peers
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filteredConversations.map((conv) => {
                  const otherUser = conv.other_user || conv.other_participant;
                  const isOnline = otherUser
                    ? onlineUsers.includes(otherUser.id)
                    : false;

                  return (
                    <li
                      key={conv.id}
                      onClick={() => router.push(`/chat/${conv.id}`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Avatar
                        src={otherUser?.avatar_url}
                        name={otherUser?.full_name || 'User'}
                        size="md"
                        online={isOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {otherUser?.full_name || 'Unknown User'}
                          </p>
                          <span className="text-xs text-slate-400 shrink-0 ml-2">
                            {timeAgo(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {otherUser?.headline || 'Tap to open conversation'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* ============================================================ */}
        {/*  Right panel: Placeholder                                     */}
        {/* ============================================================ */}
        <Card className="hidden lg:flex lg:col-span-2 items-center justify-center">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Select a conversation to start chatting"
            description="Choose a conversation from the list or start a new one"
          />
        </Card>
      </div>
    </div>
  );
}
