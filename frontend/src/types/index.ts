export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  xp_points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: number;
  is_teaching: boolean;
  is_learning: boolean;
  created_at: string;
  skills?: Skill;
  profiles?: Profile;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  skill_id: string | null;
  difficulty: string;
  thumbnail_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  resources?: Resource[];
}

export interface Resource {
  id: string;
  course_id: string;
  title: string;
  type: string;
  url: string;
  youtube_id: string | null;
  duration_minutes: number | null;
  order_index: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_pct: number;
  completed_at: string | null;
  score: number | null;
  created_at: string;
  courses?: Course;
}

export interface Article {
  id: string;
  author_id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  views_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: Profile;
  other_participant?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  source_type: string | null;
  source_id: string | null;
  questions: QuizQuestion[];
  created_by: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, number>;
  score: number;
  completed_at: string;
  quizzes?: Quiz;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  xp_earned: number;
  created_at: string;
}

export interface DashboardStats {
  skills_count: number;
  total_skills?: number;
  courses_enrolled: number;
  articles_written: number;
  xp_points: number;
  level: number;
  recent_activity: ActivityLog[];
}

export interface PeerRecommendation {
  user: Profile;
  matchingSkills: { skillName: string; peerProficiency: number }[];
  matchScore: number;
  explanation?: string;
}
