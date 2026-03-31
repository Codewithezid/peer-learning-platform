'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Search,
  Sparkles,
  Users,
  MapPin,
  MessageSquare,
  UserPlus,
  Filter,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/lib/guestSession';
import { getLevelTitle } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { Profile, PeerRecommendation } from '@/types';

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function PeersSkeleton() {
  return (
    <div className="space-y-8">
      {/* Recommended skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <Skeleton variant="circle" className="h-12 w-12" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* All peers skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-4">
                <Skeleton variant="circle" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const GUEST_PEERS: Profile[] = [
  {
    id: 'guest-peer-1',
    full_name: 'Aisha Verma',
    avatar_url: null,
    bio: 'Backend engineer focused on distributed systems and API design.',
    headline: 'Backend & System Design',
    location: 'Bengaluru',
    xp_points: 920,
    level: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'guest-peer-2',
    full_name: 'Rahul Nair',
    avatar_url: null,
    bio: 'AIML engineer with NLP and LLM evaluation experience.',
    headline: 'ML Engineer (NLP/LLMs)',
    location: 'Hyderabad',
    xp_points: 810,
    level: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'guest-peer-3',
    full_name: 'Neha Singh',
    avatar_url: null,
    bio: 'Computer vision enthusiast and MLOps practitioner.',
    headline: 'Computer Vision + MLOps',
    location: 'Pune',
    xp_points: 760,
    level: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const GUEST_RECOMMENDATIONS: PeerRecommendation[] = [
  {
    user: GUEST_PEERS[0],
    matchingSkills: [
      { skillName: 'System Design', peerProficiency: 5 },
      { skillName: 'Backend Engineering', peerProficiency: 5 },
    ],
    matchScore: 95,
    explanation: 'Great mentor for scalable API architecture.',
  },
  {
    user: GUEST_PEERS[1],
    matchingSkills: [
      { skillName: 'Machine Learning', peerProficiency: 5 },
      { skillName: 'NLP', peerProficiency: 4 },
    ],
    matchScore: 91,
    explanation: 'Strong fit for CS + AIML background.',
  },
];

/* ================================================================== */
/*  Peers Page                                                         */
/* ================================================================== */

export default function PeersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PeerRecommendation[]>([]);
  const [allPeers, setAllPeers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'programming', label: 'Programming' },
    { value: 'design', label: 'Design' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'business', label: 'Business' },
    { value: 'languages', label: 'Languages' },
    { value: 'devops', label: 'DevOps' },
  ];

  useEffect(() => {
    async function fetchPeers() {
      if (isGuestUser(user)) {
        setRecommendations(GUEST_RECOMMENDATIONS);
        setAllPeers(GUEST_PEERS);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [recsRes, peersRes] = await Promise.all([
          api.get('/ai/recommendations'),
          api.get('/users?page=1&limit=20'),
        ]);

        const recPayload = unwrapData<PeerRecommendation[] | { recommendations?: PeerRecommendation[] }>(recsRes);
        const peersPayload = unwrapData<Profile[]>(peersRes);

        setRecommendations(
          Array.isArray(recPayload) ? recPayload : recPayload?.recommendations || []
        );
        setAllPeers(peersPayload || []);
      } catch (err: any) {
        console.error('Failed to load peers:', err);
        setError('Unable to load peers. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPeers();
  }, [user]);

  /* ---- Connect / Chat handler -------------------------------------- */
  const handleConnect = async (peerId: string) => {
    if (isGuestUser(user)) {
      toast.success('Demo mode: opening chat workspace');
      router.push('/chat');
      return;
    }

    try {
      setConnectingId(peerId);
      const response = await api.post('/conversations', { user_id: peerId });
      const conversation = unwrapData<{ id: string }>(response);
      if (conversation?.id) {
        router.push(`/chat/${conversation.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
    } finally {
      setConnectingId(null);
    }
  };

  /* ---- Filtered peers ---------------------------------------------- */
  const filteredPeers = allPeers.filter((peer) => {
    if (user && peer.id === user.id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return peer.full_name.toLowerCase().includes(q);
    }
    return true;
  });

  /* ---- Loading state ----------------------------------------------- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PeersSkeleton />
      </div>
    );
  }

  /* ---- Error state ------------------------------------------------- */
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Something went wrong"
            description={error}
          />
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Discover Peers</h1>
        <p className="mt-1 text-slate-500">
          Find learning partners and connect with fellow learners
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Recommended for You                                          */}
      {/* ============================================================ */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Recommended for You</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.user.id}
                className="p-6 border-blue-100 bg-gradient-to-b from-blue-50/50 to-white"
              >
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    src={rec.user.avatar_url}
                    name={rec.user.full_name}
                    size="lg"
                  />
                  <h3 className="mt-3 font-semibold text-slate-800">
                    {rec.user.full_name}
                  </h3>
                  {rec.user.headline && (
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">
                      {rec.user.headline}
                    </p>
                  )}

                  {/* Matching skills */}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {rec.matchingSkills.map((ms) => (
                      <Badge key={ms.skillName} variant="primary" size="sm">
                        {ms.skillName}
                      </Badge>
                    ))}
                  </div>

                  {/* Match score */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, rec.matchScore)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-emerald-600">
                      {rec.matchScore}% match
                    </span>
                  </div>

                  {/* Connect button */}
                  <Button
                    size="sm"
                    className="mt-4"
                    loading={connectingId === rec.user.id}
                    onClick={() => handleConnect(rec.user.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Connect
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  All Peers                                                    */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">All Peers</h2>
        </div>

        {/* Search and filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search peers by name..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Peers grid */}
        {filteredPeers.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No peers found"
              description="Try adjusting your search or filters"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeers.map((peer) => (
              <Card key={peer.id} hover className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={peer.avatar_url}
                    name={peer.full_name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">
                        {peer.full_name}
                      </h3>
                      <Badge variant="primary" size="sm">
                        Lv.{peer.level}
                      </Badge>
                    </div>
                    {peer.headline && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {peer.headline}
                      </p>
                    )}
                    {peer.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {peer.location}
                      </div>
                    )}

                    {/* Top skills (from profile - placeholder as badges) */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="default" size="sm">
                        {getLevelTitle(peer.level)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/profile/${peer.id}`)}
                  >
                    View Profile
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    loading={connectingId === peer.id}
                    onClick={() => handleConnect(peer.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Chat
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
