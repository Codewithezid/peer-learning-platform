'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Video, Link as LinkIcon, Users, Star, MonitorUp, PhoneOff } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/lib/guestSession';

interface Skill {
  id: string;
  name: string;
}

interface PeerRequest {
  id: string;
  topic: string;
  status: string;
  skill_id: string;
  created_at: string;
  skills?: Skill;
}

interface MatchItem {
  id: string;
  matched_user_id: string;
  match_score: number;
  accepted: boolean;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    headline?: string | null;
  };
}

interface SessionItem {
  id: string;
  room_name: string;
  join_url: string;
  provider: string;
  started_at: string;
}

const ENGINEERING_SKILLS: Skill[] = [
  { id: 'eng-dsa', name: 'Data Structures & Algorithms' },
  { id: 'eng-system-design', name: 'System Design' },
  { id: 'eng-backend', name: 'Backend Engineering' },
  { id: 'eng-distributed', name: 'Distributed Systems' },
  { id: 'eng-ml', name: 'Machine Learning' },
  { id: 'eng-dl', name: 'Deep Learning' },
  { id: 'eng-nlp', name: 'Natural Language Processing' },
  { id: 'eng-cv', name: 'Computer Vision' },
  { id: 'eng-mlops', name: 'MLOps' },
  { id: 'eng-cloud', name: 'Cloud & DevOps' },
];

const GUEST_MENTORS: MatchItem[] = [
  {
    id: 'mentor-1',
    matched_user_id: 'mentor-user-1',
    match_score: 96,
    accepted: false,
    profiles: {
      id: 'mentor-user-1',
      full_name: 'Aisha Verma',
      avatar_url: null,
      headline: 'Backend + System Design',
    },
  },
  {
    id: 'mentor-2',
    matched_user_id: 'mentor-user-2',
    match_score: 92,
    accepted: false,
    profiles: {
      id: 'mentor-user-2',
      full_name: 'Rahul Nair',
      avatar_url: null,
      headline: 'AIML (NLP/LLMs)',
    },
  },
  {
    id: 'mentor-3',
    matched_user_id: 'mentor-user-3',
    match_score: 89,
    accepted: false,
    profiles: {
      id: 'mentor-user-3',
      full_name: 'Neha Singh',
      avatar_url: null,
      headline: 'Computer Vision + MLOps',
    },
  },
];

export default function VideoSessionPage() {
  const { profile, user } = useAuth();
  const guestMode = isGuestUser(user);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<PeerRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSession, setActiveSession] = useState<SessionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [skillId, setSkillId] = useState('');

  const loadInitial = async () => {
    if (guestMode) {
      setSkills(ENGINEERING_SKILLS);
      setRequests([]);
      setMatches([]);
      setSkillId((prev) => prev || ENGINEERING_SKILLS[0]?.id || '');
      setSelectedRequestId('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [skillsRes, reqRes] = await Promise.all([api.get('/skills'), api.get('/peer/requests')]);
      const loadedSkills = unwrapData<Skill[]>(skillsRes) || [];
      const loadedRequests = unwrapData<PeerRequest[]>(reqRes) || [];
      setSkills(loadedSkills);
      setRequests(loadedRequests);
      setSkillId((prev) => prev || loadedSkills[0]?.id || '');
      setSelectedRequestId((prev) => prev || loadedRequests[0]?.id || '');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [guestMode]);

  const loadMatches = async (requestId: string) => {
    if (!requestId) {
      setMatches([]);
      return;
    }

    if (guestMode) {
      setMatches(
        GUEST_MENTORS.map((mentor, index) => ({
          ...mentor,
          id: `${requestId}-mentor-${index + 1}`,
        }))
      );
      return;
    }

    try {
      const res = await api.get(`/peer/matches?request_id=${requestId}`);
      setMatches(unwrapData<MatchItem[]>(res) || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load matches');
    }
  };

  useEffect(() => {
    loadMatches(selectedRequestId);
  }, [selectedRequestId]);

  const createRequest = async () => {
    if (!topic.trim() || !skillId) {
      toast.error('Topic and skill are required');
      return;
    }
    try {
      setSubmitting(true);

      if (guestMode) {
        const newRequest: PeerRequest = {
          id: `guest-request-${Date.now()}`,
          topic: topic.trim(),
          status: 'open',
          skill_id: skillId,
          created_at: new Date().toISOString(),
          skills: skills.find((item) => item.id === skillId),
        };
        setRequests((prev) => [newRequest, ...prev]);
        setSelectedRequestId(newRequest.id);
        setMatches(
          GUEST_MENTORS.map((mentor, index) => ({
            ...mentor,
            id: `${newRequest.id}-mentor-${index + 1}`,
            match_score: Math.max(75, mentor.match_score - index * 3),
          }))
        );
        setTopic('');
        setDescription('');
        toast.success('Peer request created (demo mode)');
        return;
      }

      const res = await api.post('/peer/requests', {
        topic: topic.trim(),
        description: description.trim() || null,
        skill_id: skillId,
      });
      const payload = unwrapData<{ request: PeerRequest; matches: MatchItem[] }>(res);
      const newRequest = payload?.request;
      if (newRequest) {
        setRequests((prev) => [newRequest, ...prev]);
        setSelectedRequestId(newRequest.id);
      }
      setMatches(payload?.matches || []);
      setTopic('');
      setDescription('');
      toast.success('Peer request created');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const startSession = async (match: MatchItem) => {
    if (!selectedRequestId) {
      toast.error('Select a request first');
      return;
    }
    try {
      if (guestMode) {
        const roomName = `peer-demo-${Date.now()}`;
        const session: SessionItem = {
          id: `guest-session-${Date.now()}`,
          room_name: roomName,
          join_url: `https://meet.jit.si/${roomName}`,
          provider: 'jitsi',
          started_at: new Date().toISOString(),
        };
        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
        toast.success('Demo session room created');
        return;
      }

      const response = await api.post('/peer/sessions', {
        request_id: selectedRequestId,
        peer_user_id: match.matched_user_id,
      });
      const session = unwrapData<SessionItem>(response);
      if (session) {
        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
        toast.success('Session room created');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create session');
    }
  };

  const submitFeedback = async (sessionId: string, toUserId: string, rating: number) => {
    if (guestMode) {
      toast.success('Feedback submitted (demo mode)');
      return;
    }

    try {
      await api.post('/feedback', {
        session_id: sessionId,
        to_user_id: toUserId,
        rating,
        comments: 'Session feedback submitted from video workspace.',
      });
      toast.success('Feedback submitted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit feedback');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-24" />
        <Skeleton variant="rect" className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Video Session Hub</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Create peer-help requests, choose a matched mentor, and launch Jitsi sessions.
        </p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">New Peer Request</h2>
          <Input
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Need help with API architecture"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Skill</label>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share details so a peer can help quickly..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={createRequest} loading={submitting}>
            Create Request
          </Button>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">Request Matches</h2>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Request</label>
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select request</option>
              {requests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.topic} ({request.status})
                </option>
              ))}
            </select>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No matches yet"
              description="Create a request or wait for recommendations."
            />
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {match.profiles?.full_name || 'Recommended peer'}
                      </p>
                      <p className="text-xs text-slate-500">{match.profiles?.headline || 'Mentor profile'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Score {match.match_score}</Badge>
                      {match.accepted && <Badge variant="primary">Accepted</Badge>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" onClick={() => startSession(match)}>
                      Start Session
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Created Sessions</h2>
        {sessions.length === 0 ? (
          <EmptyState
            icon={<LinkIcon className="h-8 w-8" />}
            title="No sessions created"
            description="Start a session from the matched peers list."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{session.room_name}</p>
                    <p className="text-xs text-slate-500">{session.provider}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={session.join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                      Join Room
                    </a>
                    <Button
                      size="sm"
                      onClick={() => setActiveSession(session)}
                    >
                      <MonitorUp className="h-4 w-4 mr-1" />
                      Join in App
                    </Button>
                    {matches[0]?.matched_user_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitFeedback(session.id, matches[0].matched_user_id, 5)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Rate 5
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeSession && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live Session: {activeSession.room_name}</h2>
              <p className="text-xs text-slate-500">{activeSession.provider}</p>
            </div>
            <Button variant="outline" onClick={() => setActiveSession(null)}>
              <PhoneOff className="h-4 w-4 mr-1" />
              Leave Meeting
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={activeSession.room_name}
              configOverwrite={{
                startWithAudioMuted: true,
                prejoinPageEnabled: false,
              }}
              interfaceConfigOverwrite={{
                MOBILE_APP_PROMO: false,
              }}
              userInfo={{
                displayName: profile?.full_name || 'Peer Connect User',
                email: user?.email || 'guest@peerconnect.local',
              }}
              onReadyToClose={() => setActiveSession(null)}
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = '560px';
                iframeRef.style.width = '100%';
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
