'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapData, unwrapPagination } from '@/lib/apiResponse';
import { Course, Enrollment } from '@/types';
import { SKILL_CATEGORIES, DIFFICULTY_LEVELS } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

/* ------------------------------------------------------------------ */
/*  Difficulty badge color helper                                      */
/* ------------------------------------------------------------------ */
function difficultyVariant(difficulty: string) {
  switch (difficulty) {
    case 'beginner':
      return 'success' as const;
    case 'intermediate':
      return 'warning' as const;
    case 'advanced':
      return 'error' as const;
    default:
      return 'default' as const;
  }
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */
function LearningHubSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton variant="rect" className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gradient placeholder thumbnails                                    */
/* ------------------------------------------------------------------ */
const GRADIENTS = [
  'from-blue-400 to-violet-500',
  'from-emerald-400 to-cyan-500',
  'from-orange-400 to-pink-500',
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-rose-400 to-red-500',
];

function getGradient(id: string) {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

/* ================================================================== */
/*  Learning Hub Page                                                  */
/* ================================================================== */
export default function LearningHubPage() {
  const { profile } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  /* ---- Create course modal state ---------------------------------- */
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'programming',
    difficulty: 'beginner',
    thumbnail_url: '',
  });

  /* ---- Fetch courses ---------------------------------------------- */
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page };
      if (category !== 'all') params.category = category;

      const [coursesRes, enrollRes] = await Promise.all([
        api.get('/courses', { params }),
        api.get('/enrollments/me'),
      ]);

      const data = unwrapData<Course[]>(coursesRes) || [];
      const pagination = unwrapPagination(coursesRes);
      setCourses(data);
      setHasMore(Boolean(pagination && page < pagination.pages));
      setEnrollments(unwrapData<Enrollment[]>(enrollRes) || []);
    } catch (err: any) {
      console.error('Failed to load courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  /* ---- Is enrolled helper ----------------------------------------- */
  function getEnrollment(courseId: string) {
    return enrollments.find((e) => e.course_id === courseId);
  }

  /* ---- Filtered courses (local search + difficulty) --------------- */
  const filtered = courses.filter((c) => {
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === 'all' || c.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  /* ---- Enroll ----------------------------------------------------- */
  async function handleEnroll(courseId: string) {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      toast.success('Enrolled successfully!');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to enroll');
    }
  }

  /* ---- Create course ---------------------------------------------- */
  async function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    try {
      setCreating(true);
      await api.post('/courses', {
        title: form.title,
        description: form.description,
        category: form.category,
        difficulty: form.difficulty,
        thumbnail_url: form.thumbnail_url || undefined,
      });
      toast.success('Course created!');
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'programming', difficulty: 'beginner', thumbnail_url: '' });
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  }

  /* ---- Category tabs ---------------------------------------------- */
  const categories = [{ value: 'all', label: 'All' }, ...SKILL_CATEGORIES];

  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-blue-500" />
            Learning Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">Explore courses and level up your skills</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Course
        </Button>
      </div>

      {/* Search & Difficulty filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Levels</option>
          {DIFFICULTY_LEVELS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setCategory(cat.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <LearningHubSkeleton />}

      {/* Course Grid */}
      {!loading && filtered.length === 0 && (
        <Card className="p-8">
          <EmptyState
            icon={<GraduationCap className="h-10 w-10" />}
            title="No courses found"
            description="Try adjusting your filters or create the first course!"
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Course
              </Button>
            }
          />
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const enrollment = getEnrollment(course.id);
            return (
              <Card key={course.id} hover className="overflow-hidden flex flex-col">
                {/* Thumbnail */}
                <Link href={`/learning/${course.id}`}>
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-40 bg-gradient-to-br ${getGradient(course.id)} flex items-center justify-center`}
                    >
                      <BookOpen className="h-12 w-12 text-white/80" />
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <Link href={`/learning/${course.id}`}>
                    <h3 className="font-semibold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                  </Link>

                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {course.category && <Badge variant="primary">{course.category}</Badge>}
                    <Badge variant={difficultyVariant(course.difficulty)}>{course.difficulty}</Badge>
                  </div>

                  {course.profiles && (
                    <p className="text-xs text-slate-400">
                      by {course.profiles.full_name}
                    </p>
                  )}

                  <div className="mt-auto pt-2">
                    {enrollment ? (
                      <Link href={`/learning/${course.id}`} className="block">
                        <Button variant="secondary" className="w-full">
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          Continue
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleEnroll(course.id)}
                      >
                        <GraduationCap className="h-4 w-4 mr-1.5" />
                        Enroll
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Create Course Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Course" size="lg">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Course title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              placeholder="Describe your course..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Thumbnail URL (optional)"
            placeholder="https://example.com/image.jpg"
            value={form.thumbnail_url}
            onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Create Course
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
