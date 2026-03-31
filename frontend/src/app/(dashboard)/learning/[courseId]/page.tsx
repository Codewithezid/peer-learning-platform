'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Play,
  CheckCircle,
  Clock,
  Plus,
  Sparkles,
  Brain,
  GraduationCap,
  ExternalLink,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapData } from '@/lib/apiResponse';
import { Course, Enrollment, Resource, Quiz } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';

/* ------------------------------------------------------------------ */
/*  YouTube Embed Component                                            */
/* ------------------------------------------------------------------ */
function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-slate-900">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Difficulty badge variant                                           */
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
function CourseDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton variant="rect" className="h-[400px] rounded-xl" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </Card>
          <Card className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-8 w-8" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Course Detail Page                                                 */
/* ================================================================== */
export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [completedResources, setCompletedResources] = useState<Set<string>>(new Set());

  /* ---- AI features state ------------------------------------------ */
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  /* ---- Add resource modal ----------------------------------------- */
  const [showAddResource, setShowAddResource] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    type: 'video',
    url: '',
    duration_minutes: '',
  });

  /* ---- Fetch course ----------------------------------------------- */
  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        const [courseRes, enrollRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get('/enrollments/me'),
        ]);

        const courseData = unwrapData<Course>(courseRes);
        setCourse(courseData);

        const enrollments: Enrollment[] = unwrapData<Enrollment[]>(enrollRes) || [];
        const myEnrollment = enrollments.find((e) => e.course_id === courseId);
        setEnrollment(myEnrollment || null);

        // Select first resource by default
        const resources = courseData.resources ?? [];
        if (resources.length > 0) {
          const sorted = [...resources].sort((a: Resource, b: Resource) => a.order_index - b.order_index);
          setSelectedResource(sorted[0]);
        }
      } catch (err: any) {
        console.error('Failed to load course:', err);
        toast.error('Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId]);

  /* ---- Helpers ---------------------------------------------------- */
  const resources = course?.resources
    ? [...course.resources].sort((a, b) => a.order_index - b.order_index)
    : [];

  const isCreator = profile?.id === course?.created_by;

  /* ---- Enroll ----------------------------------------------------- */
  async function handleEnroll() {
    try {
      const res = await api.post(`/courses/${courseId}/enroll`);
      setEnrollment(unwrapData<Enrollment>(res));
      toast.success('Enrolled successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to enroll');
    }
  }

  /* ---- Select resource & track progress --------------------------- */
  async function handleSelectResource(resource: Resource) {
    setSelectedResource(resource);

    if (enrollment && !completedResources.has(resource.id)) {
      const newCompleted = new Set(completedResources);
      newCompleted.add(resource.id);
      setCompletedResources(newCompleted);

      const progressPct = Math.round((newCompleted.size / resources.length) * 100);
      try {
        await api.put(`/enrollments/${enrollment.id}/progress`, {
          progress_pct: progressPct,
        });
        setEnrollment({ ...enrollment, progress_pct: progressPct });
      } catch (err: any) {
        console.error('Failed to update progress:', err);
      }
    }
  }

  /* ---- AI Summary ------------------------------------------------- */
  async function handleSummarize() {
    if (!course) return;
    try {
      setSummarizing(true);
      const res = await api.post('/ai/summarize', {
        content: course.description || course.title,
      });
      const payload = unwrapData<{ summary?: string } | string>(res);
      setAiSummary(typeof payload === 'string' ? payload : payload?.summary || '');
      toast.success('Summary generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  }

  /* ---- Generate Quiz ---------------------------------------------- */
  async function handleGenerateQuiz() {
    if (!course) return;
    try {
      setGeneratingQuiz(true);
      const res = await api.post('/ai/quiz/generate', {
        content: course.description || course.title,
        title: `${course.title} Quiz`,
        source_type: 'course',
        source_id: course.id,
      });
      toast.success('Quiz generated!');
      const quiz = unwrapData<Quiz>(res);
      if (quiz?.id) {
        router.push('/quizzes');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  }

  /* ---- Add Resource ----------------------------------------------- */
  async function handleAddResource() {
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    try {
      setAddingResource(true);
      await api.post(`/courses/${courseId}/resources`, {
        title: resourceForm.title,
        type: resourceForm.type,
        url: resourceForm.url,
        duration_minutes: resourceForm.duration_minutes ? parseInt(resourceForm.duration_minutes) : null,
        order_index: resources.length,
      });
      toast.success('Resource added!');
      setShowAddResource(false);
      setResourceForm({ title: '', type: 'video', url: '', duration_minutes: '' });
      // Refetch course
      const courseRes = await api.get(`/courses/${courseId}`);
      setCourse(unwrapData<Course>(courseRes));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to add resource');
    } finally {
      setAddingResource(false);
    }
  }

  /* ---- Loading ---------------------------------------------------- */
  if (loading) return <CourseDetailSkeleton />;

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="Course not found"
            description="The course you're looking for doesn't exist or has been removed."
            action={
              <Link href="/learning">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Learning Hub
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/learning"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learning Hub
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================================ */}
        {/*  Left: Video Player & Content                                 */}
        {/* ============================================================ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video / Resource display */}
          {selectedResource?.youtube_id ? (
            <YouTubeEmbed videoId={selectedResource.youtube_id} />
          ) : selectedResource?.url ? (
            <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-slate-100">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <ExternalLink className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">{selectedResource.title}</p>
                <a
                  href={selectedResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  Open Resource
                </a>
              </div>
            </div>
          ) : (
            <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-gradient-to-br from-blue-400 to-violet-500">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <BookOpen className="h-16 w-16 mb-3 opacity-80" />
                <p className="text-lg font-semibold">{course.title}</p>
                <p className="text-sm text-white/70 mt-1">Select a resource to begin</p>
              </div>
            </div>
          )}

          {/* Not enrolled overlay info */}
          {!enrollment && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                <span className="font-medium">Enroll to track progress.</span>{' '}
                Start tracking your learning journey by enrolling in this course.
              </p>
              <Button size="sm" onClick={handleEnroll} className="shrink-0 ml-auto">
                Enroll Now
              </Button>
            </div>
          )}

          {/* Selected resource info */}
          {selectedResource && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{selectedResource.title}</h2>
              {selectedResource.duration_minutes && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedResource.duration_minutes} min
                </p>
              )}
            </div>
          )}

          {/* AI Summary Card */}
          {aiSummary && (
            <Card className="p-4 bg-violet-50 border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h3 className="font-semibold text-sm text-violet-700">AI Summary</h3>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiSummary}</p>
            </Card>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Right Sidebar                                                */}
        {/* ============================================================ */}
        <div className="space-y-4">
          {/* Course Info Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">{course.title}</h2>
            {course.description && (
              <p className="text-sm text-slate-500">{course.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {course.category && <Badge variant="primary">{course.category}</Badge>}
              <Badge variant={difficultyVariant(course.difficulty)}>{course.difficulty}</Badge>
            </div>

            {/* Creator */}
            {course.profiles && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Avatar
                  src={course.profiles.avatar_url}
                  name={course.profiles.full_name}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{course.profiles.full_name}</p>
                  <p className="text-xs text-slate-400">Course Creator</p>
                </div>
              </div>
            )}

            {/* Enroll or Progress */}
            {enrollment ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Progress</span>
                  <span className="text-blue-600 font-semibold">{enrollment.progress_pct}%</span>
                </div>
                <ProgressBar value={enrollment.progress_pct} />
                {enrollment.completed_at && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Completed
                  </p>
                )}
              </div>
            ) : (
              <Button className="w-full" onClick={handleEnroll}>
                <GraduationCap className="h-4 w-4 mr-1.5" />
                Enroll in Course
              </Button>
            )}

            {/* AI Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleSummarize}
                loading={summarizing}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                AI Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleGenerateQuiz}
                loading={generatingQuiz}
              >
                <Brain className="h-3.5 w-3.5 mr-1" />
                Gen Quiz
              </Button>
            </div>
          </Card>

          {/* Resources List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">
                Resources ({resources.length})
              </h3>
              {isCreator && (
                <button
                  onClick={() => setShowAddResource(true)}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {resources.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No resources yet
              </p>
            ) : (
              <ul className="space-y-1">
                {resources.map((resource, idx) => {
                  const isSelected = selectedResource?.id === resource.id;
                  const isCompleted = completedResources.has(resource.id);

                  return (
                    <li key={resource.id}>
                      <button
                        onClick={() => handleSelectResource(resource)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-xs font-medium text-slate-400 w-5 shrink-0">
                          {idx + 1}
                        </span>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Play className="h-4 w-4 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resource.title}</p>
                          {resource.duration_minutes && (
                            <p className="text-xs text-slate-400">{resource.duration_minutes} min</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Add Resource Modal */}
      <Modal
        isOpen={showAddResource}
        onClose={() => setShowAddResource(false)}
        title="Add Resource"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Resource title"
            value={resourceForm.title}
            onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <select
              value={resourceForm.type}
              onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="video">Video</option>
              <option value="link">Link</option>
            </select>
          </div>
          <Input
            label="URL"
            placeholder="https://youtube.com/watch?v=..."
            value={resourceForm.url}
            onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            placeholder="10"
            value={resourceForm.duration_minutes}
            onChange={(e) => setResourceForm({ ...resourceForm, duration_minutes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddResource(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddResource} loading={addingResource}>
              Add Resource
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
