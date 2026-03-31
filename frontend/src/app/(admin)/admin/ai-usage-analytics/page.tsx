'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import AdminDataTable from '@/components/admin/AdminDataTable';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface AIUsageItem {
  id: string;
  user_id: string | null;
  action_type: string;
  prompt_summary: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6'];

export default function AIUsageAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AIUsageItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/ai-usage?limit=200');
        setRows(unwrapData<AIUsageItem[]>(response) || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load AI usage');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actionChart = useMemo(() => {
    const counter: Record<string, number> = {};
    for (const row of rows) {
      const key = row.action_type || 'unknown';
      counter[key] = (counter[key] || 0) + 1;
    }
    return Object.entries(counter).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const recentColumns = useMemo<ColumnDef<AIUsageItem>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => row.original.profiles?.full_name || row.original.user_id || 'Unknown user',
      },
      {
        accessorKey: 'action_type',
        header: 'Action',
        cell: ({ row }) => <Badge variant="success">{row.original.action_type}</Badge>,
      },
      {
        accessorKey: 'prompt_summary',
        header: 'Prompt Summary',
        cell: ({ row }) => row.original.prompt_summary?.slice(0, 140) || '-',
      },
      {
        accessorKey: 'created_at',
        header: 'Time',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
    ],
    []
  );

  if (loading) {
    return <Skeleton variant="rect" className="h-72" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">AI Usage Analytics</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Inspect model usage patterns, frequent actions, and sampled prompts.</p>
        <div className="mt-4">
          <Badge variant="primary">Total AI calls: {rows.length}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Action Distribution</h2>
          {actionChart.length === 0 ? (
            <EmptyState title="No AI usage logs yet" description="AI actions will appear after users trigger AI features." />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={actionChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={115} label>
                    {actionChart.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent AI Calls</h2>
          <AdminDataTable
            data={rows.slice(0, 40)}
            columns={recentColumns}
            emptyTitle="No AI calls"
            emptyDescription="Recent calls will be listed here."
            maxHeightClassName="max-h-[24rem]"
          />
        </Card>
      </div>
    </div>
  );
}
