'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LibraryBig } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import AdminDataTable from '@/components/admin/AdminDataTable';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';

interface AdminResource {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  views_count: number;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
  };
}

export default function ResourceManagementPage() {
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/resources?limit=100');
        setResources(unwrapData<AdminResource[]>(response) || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = resources.filter((item) =>
    `${item.title} ${item.category || ''} ${(item.tags || []).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const columns = useMemo<ColumnDef<AdminResource>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Resource',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.title}</p>
            <p className="text-xs text-slate-500 mt-1">{row.original.profiles?.full_name || 'Unknown author'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category / Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.category && <Badge>{row.original.category}</Badge>}
            {(row.original.tags || []).slice(0, 4).map((tag) => (
              <Badge key={tag} variant="primary">
                #{tag}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'views_count',
        header: 'Views',
        cell: ({ row }) => <Badge variant="warning">Views {row.original.views_count || 0}</Badge>,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <LibraryBig className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Resource Management</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Review repository quality, metadata consistency, and usage patterns.
        </p>
      </Card>

      <Card className="p-6">
        <Input
          placeholder="Filter by title, category, or tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <Card className="p-6">
        <AdminDataTable
          data={filtered}
          columns={columns}
          loading={loading}
          emptyTitle="No resources found"
          emptyDescription="No resource matches the current filter."
        />
      </Card>
    </div>
  );
}
