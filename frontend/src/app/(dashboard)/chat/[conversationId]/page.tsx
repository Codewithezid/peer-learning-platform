'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { isGuestUser } from '@/lib/guestSession';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';

interface ChatMessage {
  id: string;
  conversation_id?: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const GUEST_MESSAGES: Record<string, ChatMessage[]> = {
  'guest-conv-1': [
    {
      id: 'guest-msg-1',
      sender_id: 'guest-peer-1',
      content: 'Hey! I can help with system design interview prep.',
      created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      conversation_id: 'guest-conv-1',
    },
    {
      id: 'guest-msg-2',
      sender_id: 'guest-user',
      content: 'Great, can we start with API scaling basics?',
      created_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
      conversation_id: 'guest-conv-1',
    },
  ],
  'guest-conv-2': [
    {
      id: 'guest-msg-3',
      sender_id: 'guest-peer-2',
      content: 'Happy to help with ML roadmap and projects.',
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      conversation_id: 'guest-conv-2',
    },
  ],
};

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const guestMode = isGuestUser(user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    if (guestMode) {
      setMessages(GUEST_MESSAGES[conversationId] || []);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/conversations/${conversationId}/messages?limit=100`);
      const payload = unwrapData<ChatMessage[]>(response) || [];
      setMessages([...payload].reverse());
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, guestMode]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', { conversationId });

    const onNewMessage = (message: ChatMessage) => {
      if (message.conversation_id && message.conversation_id !== conversationId) return;
      setMessages((prev) => [...prev, message]);
    };

    socket.on('new_message', onNewMessage);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('new_message', onNewMessage);
    };
  }, [socket, conversationId]);

  const canSend = useMemo(() => {
    if (!draft.trim()) return false;
    if (guestMode) return true;
    return Boolean(socket) && isConnected;
  }, [draft, socket, isConnected, guestMode]);

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    if (guestMode) {
      const nextMessage: ChatMessage = {
        id: `guest-msg-${Date.now()}`,
        sender_id: user?.id || 'guest-user',
        content: draft.trim(),
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
      };
      setMessages((prev) => [...prev, nextMessage]);
      setDraft('');
      return;
    }

    if (!socket) {
      if (!isConnected) {
        toast.error('Chat is not connected yet');
      }
      return;
    }

    try {
      setSending(true);
      socket.emit('send_message', { conversationId, content: draft.trim() });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-14" />
        <Skeleton variant="rect" className="h-[480px]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link
        href="/chat"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to conversations
      </Link>

      <Card className="p-4 h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Start this conversation by sending a message." />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.sender_id === user?.id;
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      mine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder={guestMode || isConnected ? 'Type your message...' : 'Connecting chat...'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={!canSend} loading={sending}>
            <Send className="h-4 w-4 mr-1.5" />
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
