'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  BookOpen,
  FileText,
  Star,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Brain,
  HelpCircle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/lib/guestSession';
import { timeAgo, getLevelTitle } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { DashboardStats, PeerRecommendation } from '@/types';

/* ------------------------------------------------------------------ */
/*  Activity helpers                                                   */
/* ------------------------------------------------------------------ */

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  skill_added: {
    label: 'Added a new skill',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-blue-500 bg-blue-50',
  },
  course_completed: {
    label: 'Completed a course',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'text-emerald-500 bg-emerald-50',
  },
  article_published: {
    label: 'Published an article',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-violet-500 bg-violet-50',
  },
  quiz_taken: {
    label: 'Completed a quiz',
    icon: <HelpCircle className="h-4 w-4" />,
    color: 'text-amber-500 bg-amber-50',
  },
};

/* ------------------------------------------------------------------ */
/*  Quick‑action data                                                  */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  {
    title: 'Browse Skills',
    description: 'Discover and add new skills to your profile',
    href: '/skills',
    icon: <Lightbulb className="h-6 w-6 text-blue-500" />,
  },
  {
    title: 'Explore Courses',
    description: 'Find courses to level up your knowledge',
    href: '/learning',
    icon: <BookOpen className="h-6 w-6 text-emerald-500" />,
  },
  {
    title: 'Write Article',
    description: 'Share your expertise with the community',
    href: '/knowledge',
    icon: <FileText className="h-6 w-6 text-violet-500" />,
  },
  {
    title: 'Take Quiz',
    description: 'Test your skills and earn XP points',
    href: '/quizzes',
    icon: <Brain className="h-6 w-6 text-amber-500" />,
  },
];

const GUEST_DASHBOARD_STATS: DashboardStats = {
  skills_count: 4,
  total_skills: 4,
  courses_enrolled: 2,
  articles_written: 1,
  xp_points: 120,
  level: 2,
  recent_activity: [
    {
      id: 'guest-act-1',
      user_id: 'guest',
      action_type: 'skill_added',
      entity_type: 'skill',
      entity_id: 'skill-system-design',
      xp_earned: 10,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'guest-act-2',
      user_id: 'guest',
      action_type: 'course_completed',
      entity_type: 'course',
      entity_id: 'course-ml-intro',
      xp_earned: 40,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: 'guest-act-3',
      user_id: 'guest',
      action_type: 'quiz_taken',
      entity_type: 'quiz',
      entity_id: 'quiz-dsa-basics',
      xp_earned: 20,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
  ],
};

const GUEST_RECOMMENDATIONS: PeerRecommendation[] = [
  {
    user: {
      id: 'peer-guest-1',
      full_name: 'Aisha Verma',
      avatar_url: null,
      bio: 'Backend engineer and mentor',
      headline: 'Backend + System Design Mentor',
      location: 'Bengaluru',
      xp_points: 920,
      level: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    matchingSkills: [
      { skillName: 'System Design', peerProficiency: 5 },
      { skillName: 'Backend Engineering', peerProficiency: 5 },
    ],
    matchScore: 95,
    explanation: 'Strong overlap with architecture and backend interests.',
  },
  {
    user: {
      id: 'peer-guest-2',
      full_name: 'Rahul Nair',
      avatar_url: null,
      bio: 'AIML engineer focused on NLP',
      headline: 'Machine Learning / NLP',
      location: 'Hyderabad',
      xp_points: 810,
      level: 6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    matchingSkills: [
      { skillName: 'Machine Learning', peerProficiency: 5 },
      { skillName: 'NLP', peerProficiency: 4 },
    ],
    matchScore: 91,
    explanation: 'Great fit for CS + AIML learning track.',
  },
];

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome banner skeleton */}
      <Skeleton variant="rect" className="h-32 rounded-2xl" />

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Two‑column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circle" className="h-8 w-8" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </Card>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Dashboard Page                                                     */
/* ================================================================== */

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<PeerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (isGuestUser(user)) {
        setStats(GUEST_DASHBOARD_STATS);
        setRecommendations(GUEST_RECOMMENDATIONS);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [statsRes, recsRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/ai/recommendations'),
        ]);

        const statsPayload = unwrapData<DashboardStats>(statsRes);
        const recommendationPayload = unwrapData<
          PeerRecommendation[] | { recommendations?: PeerRecommendation[] }
        >(recsRes);

        setStats(statsPayload || null);
        setRecommendations(
          Array.isArray(recommendationPayload)
            ? recommendationPayload
            : recommendationPayload?.recommendations || []
        );
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError('Unable to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  /* ---- loading state ------------------------------------------------ */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  /* ---- error state -------------------------------------------------- */
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="Something went wrong"
            description={error}
          />
        </Card>
      </div>
    );
  }

  /* ---- stat cards --------------------------------------------------- */
  const statCards = [
    {
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      bg: 'bg-blue-50',
      value: stats?.skills_count ?? stats?.total_skills ?? 0,
      label: 'Skills',
    },
    {
      icon: <BookOpen className="h-5 w-5 text-emerald-500" />,
      bg: 'bg-emerald-50',
      value: stats?.courses_enrolled ?? 0,
      label: 'Enrolled Courses',
    },
    {
      icon: <FileText className="h-5 w-5 text-violet-500" />,
      bg: 'bg-violet-50',
      value: stats?.articles_written ?? 0,
      label: 'Articles Written',
    },
    {
      icon: <Star className="h-5 w-5 text-amber-500" />,
      bg: 'bg-amber-50',
      value: stats?.xp_points ?? 0,
      label: 'XP Points',
    },
  ];

  const recentActivity = stats?.recent_activity ?? [];

  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* ============================================================ */}
      {/*  Welcome Banner                                               */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.full_name ?? 'Learner'}!
        </h1>
        <p className="mt-1 text-blue-100">Here&apos;s your learning overview</p>
        {stats && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="default" size="sm" className="bg-white/20 text-white">
              Level {stats.level} &middot; {getLevelTitle(stats.level)}
            </Badge>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Stats Grid                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`${stat.bg} rounded-lg p-2`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  Two‑column layout: Activity + Recommended Peers              */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Recent Activity -------------------------------------- */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No recent activity"
              description="Start learning or sharing to see your activity here."
            />
          ) : (
            <ul className="space-y-4">
              {recentActivity.map((item) => {
                const meta = ACTION_META[item.action_type] ?? {
                  label: item.action_type,
                  icon: <Sparkles className="h-4 w-4" />,
                  color: 'text-slate-500 bg-slate-50',
                };
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${meta.color}`}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{meta.label}</p>
                      <p className="text-xs text-slate-400">{timeAgo(item.created_at)}</p>
                    </div>
                    {item.xp_earned > 0 && (
                      <Badge variant="warning" size="sm">
                        +{item.xp_earned} XP
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ---- Recommended Peers ------------------------------------ */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-800">Recommended Peers</h2>
            </div>
            {recommendations.length > 0 && (
              <Link
                href="/peers"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {recommendations.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No recommendations yet"
              description="Complete your skills profile to get recommendations"
            />
          ) : (
            <ul className="space-y-4">
              {recommendations.slice(0, 4).map((rec) => (
                <li key={rec.user.id} className="flex items-center gap-3">
                  <Avatar
                    src={rec.user.avatar_url}
                    name={rec.user.full_name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {rec.user.full_name}
                    </p>
                    {rec.user.headline && (
                      <p className="text-xs text-slate-400 truncate">{rec.user.headline}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.matchingSkills.slice(0, 3).map((ms) => (
                        <Badge key={ms.skillName} variant="primary" size="sm">
                          {ms.skillName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Quick Actions                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card hover className="p-4 h-full">
              <div className="flex items-center gap-3">
                <div className="shrink-0">{action.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 ml-auto shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
