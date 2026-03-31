'use client';

import { useEffect, useState } from 'react';
import { Clock3, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityItem {
  id: string;
  action_type: string;
  xp_earned: number;
  created_at: string;
}

interface AttemptItem {
  id: string;
  score: number;
  completed_at: string;
  quizzes?: {
    id: string;
    title: string;
  };
}

interface PeerRequestItem {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  matches_count?: number;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [requests, setRequests] = useState<PeerRequestItem[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [activityRes, attemptsRes, requestsRes] = await Promise.all([
          api.get(`/users/${user.id}/activity`),
          api.get('/quizzes/me/attempts'),
          api.get('/peer/requests'),
        ]);
        setActivity(unwrapData<ActivityItem[]>(activityRes) || []);
        setAttempts(unwrapData<AttemptItem[]>(attemptsRes) || []);
        setRequests(unwrapData<PeerRequestItem[]>(requestsRes) || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-slate-900">Learning History</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track recent activity, quiz outcomes, and peer-help requests.
        </p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Start using modules to build your timeline." />
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.action_type}</p>
                      <p className="text-xs text-slate-500">{timeAgo(item.created_at)}</p>
                    </div>
                    {item.xp_earned > 0 && <Badge variant="warning">+{item.xp_earned} XP</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">Snapshot</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Quiz attempts</span>
              <span className="font-semibold text-slate-900">{attempts.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Peer requests</span>
              <span className="font-semibold text-slate-900">{requests.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Avg quiz score</span>
              <span className="font-semibold text-slate-900">
                {attempts.length
                  ? `${Math.round(
                      attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / attempts.length
                    )}%`
                  : '--'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quiz Attempts</h2>
          {attempts.length === 0 ? (
            <EmptyState title="No quiz attempts" description="Generate and take quizzes from AI Assistant." />
          ) : (
            <div className="space-y-3">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      {attempt.quizzes?.title || 'Untitled quiz'}
                    </p>
                    <Badge variant={attempt.score >= 70 ? 'success' : 'warning'}>{attempt.score}%</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{timeAgo(attempt.completed_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Peer Requests</h2>
          {requests.length === 0 ? (
            <EmptyState title="No peer requests" description="Open a new request from the peers module." />
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 8).map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{request.topic}</p>
                    <Badge variant={request.status === 'open' ? 'primary' : 'default'}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {timeAgo(request.created_at)} • matches: {request.matches_count || 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
