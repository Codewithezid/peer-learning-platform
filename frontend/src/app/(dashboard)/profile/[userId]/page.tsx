'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  MessageCircle,
  Star,
  Lightbulb,
  Clock,
  Sparkles,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  Users,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { getLevelTitle, timeAgo } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { Profile, UserSkill, ActivityLog } from '@/types';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Star Rating                                                        */
/* ------------------------------------------------------------------ */

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

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
    icon: <BookOpen className="h-4 w-4" />,
    color: 'text-violet-500 bg-violet-50',
  },
  quiz_taken: {
    label: 'Completed a quiz',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-amber-500 bg-amber-50',
  },
};

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function UserProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton variant="circle" className="h-24 w-24" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
            <Skeleton className="h-3 w-full max-w-md mx-auto sm:mx-0" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  User Profile Page                                                  */
/* ================================================================== */

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  /* ---- fetch data ---- */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [profileRes, skillsRes, activityRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/user-skills/user/${userId}`),
          api.get(`/users/${userId}/activity`),
        ]);
        setProfile(unwrapData<Profile>(profileRes));
        setUserSkills(unwrapData<UserSkill[]>(skillsRes) || []);
        setActivities((unwrapData<ActivityLog[]>(activityRes) || []).slice(0, 10));

        // Fetch own skills for matching
        if (currentUser && currentUser.id !== userId) {
          try {
            const mySkillsRes = await api.get(`/user-skills/user/${currentUser.id}`);
            setMySkills(unwrapData<UserSkill[]>(mySkillsRes) || []);
          } catch {
            // Ignore - not critical
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        toast.error('Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId, currentUser]);

  /* ---- start chat ---- */
  const handleStartChat = async () => {
    try {
      setStartingChat(true);
      const res = await api.post('/conversations', { user_id: userId });
      const conversationId = unwrapData<{ id: string }>(res)?.id;
      if (!conversationId) {
        throw new Error('Conversation id missing');
      }
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      toast.error('Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  /* ---- find matching skills ---- */
  const matchingSkills = mySkills.filter((ms) =>
    userSkills.some((us) => us.skill_id === ms.skill_id)
  );

  /* ---- XP calculations ---- */
  const xpForNextLevel = (profile?.level ?? 1) * 100;
  const xpProgress = ((profile?.xp_points ?? 0) % 100) / xpForNextLevel * 100 * ((profile?.level ?? 1));

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <UserProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="User not found"
            description="The user you're looking for doesn't exist or has been removed."
            action={
              <Link href="/dashboard">
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Back Link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* ============================================================ */}
      {/*  Profile Header Card                                          */}
      {/* ============================================================ */}
      <Card className="p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <Avatar
            src={profile.avatar_url}
            name={profile.full_name}
            size="xl"
            className="!h-24 !w-24 text-2xl"
          />

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{profile.full_name}</h1>
              <Badge variant="primary" size="sm">
                Level {profile.level} &middot; {getLevelTitle(profile.level)}
              </Badge>
            </div>

            {profile.headline && (
              <p className="mt-1 text-slate-600">{profile.headline}</p>
            )}

            {profile.location && (
              <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </div>
            )}

            {profile.bio && (
              <p className="mt-3 text-sm text-slate-600 max-w-2xl">{profile.bio}</p>
            )}

            {/* XP Progress Bar */}
            <div className="mt-4 max-w-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{profile.xp_points} XP</span>
                <span>Level {profile.level + 1}</span>
              </div>
              <ProgressBar value={xpProgress} color="violet" size="sm" />
            </div>

            {/* Start Chat Button */}
            {currentUser && currentUser.id !== userId && (
              <Button
                className="mt-4"
                size="sm"
                onClick={handleStartChat}
                loading={startingChat}
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Start Chat
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  Matching Skills                                              */}
      {/* ============================================================ */}
      {matchingSkills.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Skills in Common</h2>
            <Badge variant="warning" size="sm">{matchingSkills.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {matchingSkills.map((ms) => (
              <Badge key={ms.id} variant="primary" size="md">
                {ms.skills?.name ?? 'Unknown'}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  Skills Section                                               */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">Skills</h2>
        </div>

        {userSkills.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={<Lightbulb className="h-8 w-8" />}
              title="No skills yet"
              description="This user hasn't added any skills to their profile."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userSkills.map((us) => (
              <Card key={us.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {us.skills?.name ?? 'Unknown Skill'}
                    </p>
                    <StarRating value={us.proficiency_level} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {us.is_teaching && (
                      <Badge variant="success" size="sm">Teaching</Badge>
                    )}
                    {us.is_learning && (
                      <Badge variant="primary" size="sm">Learning</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Activity Feed                                                */}
      {/* ============================================================ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8" />}
            title="No recent activity"
            description="This user doesn't have any recent activity."
          />
        ) : (
          <ul className="space-y-4">
            {activities.map((item) => {
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
                    <Badge variant="warning" size="sm">+{item.xp_earned} XP</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
