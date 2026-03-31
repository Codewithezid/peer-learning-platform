'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import AdminDataTable from '@/components/admin/AdminDataTable';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface AdminUser {
  id: string;
  full_name: string;
  headline: string | null;
  location: string | null;
  xp_points: number;
  level: number;
  created_at: string;
}

export default function EmployeeManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/users?limit=100');
        setUsers(unwrapData<AdminUser[]>(response) || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((user) =>
    `${user.full_name} ${user.headline || ''} ${user.location || ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Employee',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.full_name}</p>
            <p className="text-xs text-slate-500">
              {row.original.headline || 'No headline'} {row.original.location ? `- ${row.original.location}` : ''}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'xp_points',
        header: 'XP',
        cell: ({ row }) => <Badge variant="warning">{row.original.xp_points || 0} XP</Badge>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => <Badge variant="primary">Level {row.original.level || 1}</Badge>,
      },
      {
        accessorKey: 'created_at',
        header: 'Joined',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">Monitor employee profiles, progression level, and contribution signals.</p>
      </Card>

      <Card className="p-6">
        <Input
          placeholder="Search employee by name, headline, or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <Card className="p-6">
        <AdminDataTable
          data={filtered}
          columns={columns}
          loading={loading}
          emptyTitle="No users found"
          emptyDescription="Try changing the search query."
        />
      </Card>
    </div>
  );
}
