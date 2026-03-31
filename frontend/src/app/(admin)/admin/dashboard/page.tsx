'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface AdminSummary {
  total_users?: number;
  active_users_30d?: number;
  total_resources?: number;
  total_sessions?: number;
  total_feedback?: number;
  total_ai_requests?: number;
  average_feedback_rating?: number | null;
}

interface AdminReport {
  summary?: {
    total_users: number;
    total_courses: number;
    total_resources: number;
    total_sessions: number;
    total_feedback: number;
  };
  ai_action_breakdown?: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [report, setReport] = useState<AdminReport | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dashboardRes, reportRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/reports'),
        ]);
        setSummary(unwrapData<{ summary?: AdminSummary }>(dashboardRes)?.summary || null);
        setReport(unwrapData<AdminReport>(reportRes) || null);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Skeleton variant="rect" className="h-72" />;
  }

  const stats = [
    { label: 'Total users', value: summary?.total_users ?? 0 },
    { label: 'Active users (30d)', value: summary?.active_users_30d ?? 0 },
    { label: 'Resources', value: summary?.total_resources ?? 0 },
    { label: 'Sessions', value: summary?.total_sessions ?? 0 },
    { label: 'Feedback records', value: summary?.total_feedback ?? 0 },
    { label: 'AI requests', value: summary?.total_ai_requests ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Operational snapshot for platform usage and learning impact.</p>
        <div className="mt-3">
          <Badge variant="success">
            Avg feedback rating: {summary?.average_feedback_rating ?? '--'}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Action Breakdown</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(report?.ai_action_breakdown || {}).length === 0 && (
            <span className="text-sm text-slate-500">No AI usage data yet.</span>
          )}
          {Object.entries(report?.ai_action_breakdown || {}).map(([key, val]) => (
            <Badge key={key} variant="primary">
              {key}: {val}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
