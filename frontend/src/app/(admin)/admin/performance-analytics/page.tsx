'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trophy } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import AdminDataTable from '@/components/admin/AdminDataTable';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Contributor {
  id: string;
  full_name: string;
  xp_points: number;
  level: number;
}

interface ReportsPayload {
  summary?: {
    total_users: number;
    total_courses: number;
    total_resources: number;
    total_sessions: number;
    total_feedback: number;
  };
  top_contributors?: Contributor[];
}

export default function PerformanceAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsPayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/reports');
        setData(unwrapData<ReportsPayload>(response) || null);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load performance analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const contributorColumns = useMemo<ColumnDef<Contributor>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        cell: ({ row }) => <span className="font-medium text-slate-800">#{row.index + 1}</span>,
      },
      {
        accessorKey: 'full_name',
        header: 'Contributor',
      },
      {
        accessorKey: 'xp_points',
        header: 'XP',
        cell: ({ row }) => <Badge variant="warning">{row.original.xp_points} XP</Badge>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => <Badge variant="primary">Lv {row.original.level}</Badge>,
      },
    ],
    []
  );

  if (loading) {
    return <Skeleton variant="rect" className="h-72" />;
  }

  const summaryCards = [
    { label: 'Users', value: data?.summary?.total_users ?? 0 },
    { label: 'Courses', value: data?.summary?.total_courses ?? 0 },
    { label: 'Resources', value: data?.summary?.total_resources ?? 0 },
    { label: 'Sessions', value: data?.summary?.total_sessions ?? 0 },
    { label: 'Feedback', value: data?.summary?.total_feedback ?? 0 },
  ];

  const summaryChartData = useMemo(
    () => ({
      labels: summaryCards.map((item) => item.label),
      datasets: [
        {
          label: 'Count',
          data: summaryCards.map((item) => item.value),
          backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#14B8A6'],
          borderRadius: 8,
        },
      ],
    }),
    [summaryCards]
  );

  const summaryChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    []
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Track platform outcomes and top contributors.</p>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Platform Metrics (Chart.js)</h2>
        <div className="h-72">
          <Bar data={summaryChartData} options={summaryChartOptions} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Contributors</h2>
        <AdminDataTable
          data={data?.top_contributors || []}
          columns={contributorColumns}
          emptyTitle="No contributor data"
          emptyDescription="Contributors will appear once users earn XP."
          maxHeightClassName="max-h-[26rem]"
        />
      </Card>
    </div>
  );
}
