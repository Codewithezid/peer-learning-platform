'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Search, Trash2, Paperclip } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { timeAgo } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  views_count: number;
  created_at: string;
  author_id: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const htmlToText = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function KnowledgePage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [query, setQuery] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const loadArticles = async (search?: string) => {
    try {
      setLoading(true);
      const response = search?.trim()
        ? await api.get(`/resources/search?q=${encodeURIComponent(search.trim())}`)
        : await api.get('/resources?limit=50');
      setArticles(unwrapData<Article[]>(response) || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const myArticleCount = useMemo(
    () => (user?.id ? articles.filter((a) => a.author_id === user.id).length : 0),
    [articles, user?.id]
  );

  const handleSearch = async () => {
    await loadArticles(query);
  };

  const handleCreate = async () => {
    const plainContent = htmlToText(content);
    if (!title.trim() || !plainContent) {
      toast.error('Title and content are required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/resources', {
        title: title.trim(),
        content: content.trim(),
        category: category || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success('Resource published');
      setTitle('');
      setContent('');
      setTags('');
      await loadArticles();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to publish resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article: Article) => {
    try {
      await api.delete(`/resources/${article.id}`);
      setArticles((prev) => prev.filter((item) => item.id !== article.id));
      toast.success('Resource deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to delete resource');
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/uploads/resource', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const payload = unwrapData<{ url: string; filename?: string }>(response);
      const fileUrl = payload?.url;
      if (!fileUrl) {
        throw new Error('Upload URL not found');
      }

      const safeName = escapeHtml(payload?.filename || file.name);
      const linkHtml = `<p><a href="${fileUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a></p>`;
      setContent((prev) => `${prev}${prev ? '' : '<p></p>'}${linkHtml}`);
      toast.success('Attachment uploaded and inserted');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : null;
      toast.error(message || 'Failed to upload attachment');
    } finally {
      event.target.value = '';
      setUploadingAttachment(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Repository</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Publish resources, search shared knowledge, and build a reusable learning base.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Badge variant="primary">Total resources: {articles.length}</Badge>
          <Badge variant="success">My resources: {myArticleCount}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Publish Resource</h2>
          <Input
            label="Title"
            placeholder="Resource title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="general">General</option>
              <option value="programming">Programming</option>
              <option value="design">Design</option>
              <option value="data_science">Data Science</option>
              <option value="business">Business</option>
              <option value="devops">DevOps</option>
            </select>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Content</label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
                />
                <span className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                  <Paperclip className="mr-1 h-3.5 w-3.5" />
                  {uploadingAttachment ? 'Uploading...' : 'Attach file'}
                </span>
              </label>
            </div>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your notes, references, and best practices..."
            />
          </div>
          <Input
            label="Tags"
            placeholder="react, architecture, onboarding"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <Button onClick={handleCreate} loading={saving}>
            Publish Resource
          </Button>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
            <div className="flex-1">
              <Input
                label="Search repository"
                placeholder="Search by title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="ghost" onClick={() => { setQuery(''); loadArticles(); }}>
                Reset
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" variant="rect" />
              <Skeleton className="h-24" variant="rect" />
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No resources found"
              description="Publish your first resource or change the search query."
            />
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div key={article.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{article.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {article.profiles?.full_name || 'Unknown author'} • {timeAgo(article.created_at)}
                      </p>
                    </div>
                    {user?.id === article.author_id && (
                      <Button variant="ghost" onClick={() => handleDelete(article)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 line-clamp-3">{htmlToText(article.content)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {article.category && <Badge>{article.category}</Badge>}
                    {(article.tags || []).slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="primary">
                        #{tag}
                      </Badge>
                    ))}
                    <Badge variant="default">Views: {article.views_count || 0}</Badge>
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
