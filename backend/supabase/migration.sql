-- ============================================================
-- Peer Connect - Database Migration Script
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  headline VARCHAR(200),
  location VARCHAR(100),
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. SKILLS (global catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- ============================================================
-- 3. USER_SKILLS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5) DEFAULT 1,
  is_teaching BOOLEAN DEFAULT false,
  is_learning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);

-- ============================================================
-- 4. COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  difficulty VARCHAR(20) DEFAULT 'beginner',
  thumbnail_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- ============================================================
-- 5. RESOURCES (within courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) DEFAULT 'video',
  url TEXT NOT NULL,
  youtube_id VARCHAR(20),
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id);

-- ============================================================
-- 6. ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_pct DECIMAL(5,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

-- ============================================================
-- 7. ARTICLES (knowledge repository)
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_fulltext ON articles USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- ============================================================
-- 8. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE(participant_1, participant_2),
  CONSTRAINT ordered_participants CHECK (participant_1 < participant_2)
);

-- ============================================================
-- 9. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================================
-- 10. QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  source_type VARCHAR(20),
  source_id UUID,
  questions JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. QUIZ_ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}',
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

-- ============================================================
-- 12. ACTIVITY_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);

-- ============================================================
-- 13. PEER_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS peer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic VARCHAR(200) NOT NULL,
  description TEXT,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peer_requests_requester ON peer_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_peer_requests_status ON peer_requests(status);
CREATE INDEX IF NOT EXISTS idx_peer_requests_skill ON peer_requests(skill_id);

-- ============================================================
-- 14. PEER_MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS peer_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES peer_requests(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, matched_user_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_matches_request ON peer_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_peer_matches_user ON peer_matches(matched_user_id);

-- ============================================================
-- 15. VIDEO_SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES peer_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_name VARCHAR(200) NOT NULL,
  provider VARCHAR(40) DEFAULT 'jitsi',
  join_url TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_request ON video_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_requester ON video_sessions(requester_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_mentor ON video_sessions(mentor_user_id);

-- ============================================================
-- 16. FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_to_user ON feedback(to_user_id, created_at DESC);

-- ============================================================
-- 17. AI_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type VARCHAR(80) NOT NULL,
  prompt_summary TEXT,
  model VARCHAR(100),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_action_type ON ai_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);

-- ============================================================
-- XP UPDATE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    xp_points = xp_points + NEW.xp_earned,
    level = GREATEST(1, FLOOR((xp_points + NEW.xp_earned) / 200) + 1),
    updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_logged ON activity_log;
CREATE TRIGGER on_activity_logged
  AFTER INSERT ON activity_log
  FOR EACH ROW EXECUTE FUNCTION update_user_xp();

-- ============================================================
-- ROW LEVEL SECURITY (permissive for service role)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role key)
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quiz_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON peer_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON peer_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON video_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ai_logs FOR ALL USING (true) WITH CHECK (true);

-- Allow anon/authenticated read on profiles (for frontend Supabase client)
CREATE POLICY "Public profiles readable" ON profiles FOR SELECT USING (true);

-- ============================================================
-- SEED DATA: Skills catalog
-- ============================================================
INSERT INTO skills (name, category, description, icon) VALUES
  -- Programming
  ('JavaScript', 'programming', 'Web programming language for frontend and backend development', '💻'),
  ('Python', 'programming', 'Versatile language for web, data science, and automation', '🐍'),
  ('TypeScript', 'programming', 'Typed superset of JavaScript for scalable applications', '📘'),
  ('React', 'programming', 'Frontend library for building user interfaces', '⚛️'),
  ('Node.js', 'programming', 'JavaScript runtime for server-side development', '🟢'),
  ('Java', 'programming', 'Enterprise programming language', '☕'),
  ('C++', 'programming', 'Systems programming and performance-critical applications', '⚡'),
  ('Go', 'programming', 'Efficient language for cloud and systems programming', '🔵'),
  ('Rust', 'programming', 'Memory-safe systems programming language', '🦀'),
  ('SQL', 'programming', 'Database query language', '🗃️'),
  -- Design
  ('UI/UX Design', 'design', 'User interface and experience design principles', '🎨'),
  ('Figma', 'design', 'Collaborative interface design tool', '🖌️'),
  ('Adobe Photoshop', 'design', 'Image editing and graphic design', '📷'),
  ('Graphic Design', 'design', 'Visual communication and branding', '🎯'),
  ('Motion Design', 'design', 'Animation and motion graphics', '🎬'),
  -- Data Science
  ('Machine Learning', 'data_science', 'Building predictive models and algorithms', '🤖'),
  ('Data Analysis', 'data_science', 'Extracting insights from data', '📊'),
  ('TensorFlow', 'data_science', 'Deep learning framework', '🧠'),
  ('Statistics', 'data_science', 'Statistical methods and probability', '📈'),
  ('Data Visualization', 'data_science', 'Creating visual representations of data', '📉'),
  -- Business
  ('Project Management', 'business', 'Planning and executing projects effectively', '📋'),
  ('Agile/Scrum', 'business', 'Agile methodologies and frameworks', '🔄'),
  ('Product Management', 'business', 'Product strategy and roadmap planning', '🎯'),
  ('Digital Marketing', 'business', 'Online marketing strategies and tools', '📣'),
  ('Leadership', 'business', 'Team leadership and management skills', '👑'),
  -- Languages
  ('English', 'languages', 'English language proficiency', '🇬🇧'),
  ('Spanish', 'languages', 'Spanish language proficiency', '🇪🇸'),
  ('Mandarin', 'languages', 'Mandarin Chinese language proficiency', '🇨🇳'),
  -- DevOps
  ('Docker', 'devops', 'Containerization and deployment', '🐳'),
  ('AWS', 'devops', 'Amazon Web Services cloud platform', '☁️'),
  ('CI/CD', 'devops', 'Continuous integration and deployment pipelines', '🔧'),
  ('Kubernetes', 'devops', 'Container orchestration platform', '⚙️')
ON CONFLICT (name) DO NOTHING;
