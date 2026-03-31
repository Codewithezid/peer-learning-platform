'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Video } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import AdminDataTable from '@/components/admin/AdminDataTable';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface Session {
  id: string;
  request_id: string;
  room_name: string;
  provider: string;
  started_at: string;
  ended_at: string | null;
  requester?: { id: string; full_name: string };
  mentor?: { id: string; full_name: string };
}

interface Feedback {
  id: string;
  rating: number;
  comments: string | null;
  from_profile?: { full_name: string };
  to_profile?: { full_name: string };
}

export default function PeerSessionAnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/sessions?limit=100');
        const data = unwrapData<Session[]>(response) || [];
        setSessions(data);
        setSelectedSessionId(data[0]?.id || '');
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadFeedback = async (sessionId: string) => {
    if (!sessionId) {
      setFeedback([]);
      return;
    }
    try {
      const response = await api.get(`/feedback/session/${sessionId}`);
      setFeedback(unwrapData<Feedback[]>(response) || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load session feedback');
    }
  };

  useEffect(() => {
    loadFeedback(selectedSessionId);
  }, [selectedSessionId]);

  const sessionsColumns = useMemo<ColumnDef<Session>[]>(
    () => [
      {
        accessorKey: 'room_name',
        header: 'Room',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.room_name}</p>
            <p className="text-xs text-slate-500">{row.original.provider}</p>
          </div>
        ),
      },
      {
        id: 'participants',
        header: 'Participants',
        cell: ({ row }) => (
          <span>
            {row.original.requester?.full_name || 'Requester'} - {row.original.mentor?.full_name || 'Mentor'}
          </span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: 'Started',
        cell: ({ row }) => new Date(row.original.started_at).toLocaleString(),
      },
      {
        id: 'action',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(row.original.id)}>
            View Feedback
          </Button>
        ),
      },
    ],
    []
  );

  const feedbackColumns = useMemo<ColumnDef<Feedback>[]>(
    () => [
      {
        id: 'from_to',
        header: 'From -> To',
        cell: ({ row }) => (
          <span>
            {row.original.from_profile?.full_name || 'User'} {'->'} {row.original.to_profile?.full_name || 'Peer'}
          </span>
        ),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <Badge variant={row.original.rating >= 4 ? 'success' : 'warning'}>{row.original.rating}/5</Badge>
        ),
      },
      {
        accessorKey: 'comments',
        header: 'Comments',
        cell: ({ row }) => row.original.comments || '-',
      },
    ],
    []
  );

  if (loading) {
    return <Skeleton variant="rect" className="h-72" />;
  }

  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + Number(f.rating || 0), 0) / feedback.length).toFixed(2)
      : '--';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Peer Session Analytics</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Review session volume, participants, and feedback quality.</p>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.room_name} ({session.provider})
                </option>
              ))}
            </select>
          </div>
          <Badge variant="success">Avg rating: {avgRating}</Badge>
          <Badge variant="primary">Feedback count: {feedback.length}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Sessions</h2>
          <AdminDataTable
            data={sessions}
            columns={sessionsColumns}
            emptyTitle="No sessions yet"
            emptyDescription="Sessions will appear here after peer matches start calls."
            maxHeightClassName="max-h-[30rem]"
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Feedback</h2>
          <AdminDataTable
            data={feedback}
            columns={feedbackColumns}
            emptyTitle="No feedback for selected session"
            emptyDescription="Select a different session if needed."
            maxHeightClassName="max-h-[30rem]"
          />
        </Card>
      </div>
    </div>
  );
}
