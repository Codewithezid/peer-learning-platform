'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface DashboardData {
  total_skills: number;
  courses_enrolled: number;
  articles_written: number;
  xp_points: number;
  level: number;
}

interface ScoreBreakdown {
  action_type: string;
  total_xp: number;
  count: number;
}

interface LeaderboardItem {
  rank: number;
  full_name: string;
  xp_points: number;
  level: number;
}

const BAR_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dashboardRes, scoreRes, leaderboardRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/scores'),
          api.get('/analytics/leaderboard'),
        ]);
        setDashboard(unwrapData<DashboardData>(dashboardRes));
        setBreakdown((unwrapData<{ breakdown?: ScoreBreakdown[] }>(scoreRes)?.breakdown || []).slice(0, 8));
        setLeaderboard((unwrapData<LeaderboardItem[]>(leaderboardRes) || []).slice(0, 10));
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-72" />
      </div>
    );
  }

  const statCards = [
    { label: 'Skills', value: dashboard?.total_skills ?? 0 },
    { label: 'Courses', value: dashboard?.courses_enrolled ?? 0 },
    { label: 'Articles', value: dashboard?.articles_written ?? 0 },
    { label: 'XP Points', value: dashboard?.xp_points ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Track your growth, contribution patterns, and leaderboard position.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="primary">Level {dashboard?.level ?? 1}</Badge>
          <Badge variant="success">XP {dashboard?.xp_points ?? 0}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">XP by Activity</h2>
          {breakdown.length === 0 ? (
            <EmptyState title="No score breakdown yet" description="Complete actions to populate this chart." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="action_type" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_xp" radius={[8, 8, 0, 0]}>
                    {breakdown.map((_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <EmptyState title="No leaderboard data" description="Data will appear once users gain XP." />
          ) : (
            <div className="space-y-2">
              {leaderboard.map((item) => (
                <div key={`${item.rank}-${item.full_name}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      #{item.rank} {item.full_name}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="warning">{item.xp_points} XP</Badge>
                      <Badge variant="primary">Lv {item.level}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
