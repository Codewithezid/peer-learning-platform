'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  MapPin,
  Edit3,
  Save,
  X,
  Star,
  Lightbulb,
  Clock,
  Sparkles,
  GraduationCap,
  BookOpen,
  Settings,
  ImagePlus,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { getLevelTitle, timeAgo } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { Profile, UserSkill, ActivityLog } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

/* ------------------------------------------------------------------ */
/*  Star Rating (display only)                                         */
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

interface ProfileFormValues {
  full_name: string;
  headline: string;
  bio: string;
  location: string;
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ProfileSkeleton() {
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
/*  Profile Page                                                       */
/* ================================================================== */

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: '',
      headline: '',
      bio: '',
      location: '',
    },
  });

  /* ---- fetch data ---- */
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        setLoading(true);
        const [skillsRes, activityRes] = await Promise.all([
          api.get(`/user-skills/user/${user.id}`),
          api.get(`/users/${user.id}/activity`),
        ]);
        setUserSkills(unwrapData<UserSkill[]>(skillsRes) || []);
        setActivities((unwrapData<ActivityLog[]>(activityRes) || []).slice(0, 10));
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  /* ---- sync form with profile ---- */
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: profile.location || '',
      });
    }
  }, [profile, reset]);

  /* ---- save profile ---- */
  const handleSave = async (values: ProfileFormValues) => {
    try {
      await api.put('/auth/profile', values);
      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/uploads/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await refreshProfile();
      toast.success('Profile photo updated');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : null;
      toast.error(message || 'Failed to upload avatar');
    } finally {
      event.target.value = '';
      setAvatarUploading(false);
    }
  };

  /* ---- XP calculations ---- */
  const xpForNextLevel = (profile?.level ?? 1) * 100;
  const xpProgress = ((profile?.xp_points ?? 0) % 100) / xpForNextLevel * 100 * ((profile?.level ?? 1));

  /* ---- loading ---- */
  if (loading || !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
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
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <span className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                {avatarUploading ? 'Uploading...' : 'Change photo'}
              </span>
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {isEditing ? (
              <form
                onSubmit={handleSubmit(handleSave)}
                className="space-y-3 max-w-lg"
              >
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  error={errors.full_name?.message}
                  {...register('full_name', {
                    required: 'Full name is required',
                    minLength: {
                      value: 2,
                      message: 'Full name must be at least 2 characters',
                    },
                  })}
                />
                <Input
                  label="Headline"
                  placeholder="e.g. Full-Stack Developer"
                  error={errors.headline?.message}
                  {...register('headline', {
                    maxLength: {
                      value: 120,
                      message: 'Headline must be 120 characters or less',
                    },
                  })}
                />
                <Input
                  label="Location"
                  placeholder="e.g. San Francisco, CA"
                  error={errors.location?.message}
                  {...register('location', {
                    maxLength: {
                      value: 100,
                      message: 'Location must be 100 characters or less',
                    },
                  })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                  <textarea
                    placeholder="Tell others about yourself..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-800 placeholder-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    {...register('bio', {
                      maxLength: {
                        value: 500,
                        message: 'Bio must be 500 characters or less',
                      },
                    })}
                  />
                  {errors.bio?.message && (
                    <p className="mt-1.5 text-sm text-red-500">{errors.bio.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" loading={isSubmitting} size="sm">
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      reset({
                        full_name: profile.full_name || '',
                        headline: profile.headline || '',
                        bio: profile.bio || '',
                        location: profile.location || '',
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
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

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  Skills Section                                               */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">My Skills</h2>
          </div>
          <Link
            href="/skills"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Settings className="h-4 w-4" />
            Manage Skills
          </Link>
        </div>

        {userSkills.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={<Lightbulb className="h-8 w-8" />}
              title="No skills yet"
              description="Add skills to your profile to find peers and learning partners."
              action={
                <Link href="/skills">
                  <Button size="sm">Browse Skills</Button>
                </Link>
              }
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
            description="Your learning activities will appear here."
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
