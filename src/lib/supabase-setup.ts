import { supabase } from './supabase';
import toast from 'react-hot-toast';

export const setupSupabaseSchema = async () => {
  try {
    console.log('supabase-setup - Checking database schema...');
    
    // Check if required tables exist and create them if missing
    const tablesCreated = await ensureRequiredTables();
    
    if (tablesCreated) {
      console.log('Database schema verified successfully');
      return true;
    } else {
      console.warn('supabase-setup - Some database tables are missing - running in limited mode');
      return false;
    }
  } catch (error) {
    console.error('Error in schema setup:', error);
    return false;
  }
};

const ensureRequiredTables = async () => {
  try {
    // Check core tables that are essential
    const coreTablesExist = await checkCoreTables();
    
    if (!coreTablesExist) {
      console.log('Core tables missing, creating them...');
      await createCoreTables();
    }
    
    // Check optional features
    await checkOptionalFeatures();
    
    return true;
  } catch (error) {
    console.error('Error ensuring required tables:', error);
    return false;
  }
};

const checkCoreTables = async () => {
  try {
    // Check if users table exists by trying to query it
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError && usersError.code === '42P01') {
      return false;
    }

    // Check for subjects table which is needed for lessons
    const { error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .limit(1);
    
    if (subjectsError && subjectsError.code === '42P01') {
      console.log('supabase-setup - Subjects table missing');
      return false;
    }

    // Check for subject_lessons table
    const { error: subjectLessonsError } = await supabase
      .from('subject_lessons')
      .select('id')
      .limit(1);
    
    if (subjectLessonsError && subjectLessonsError.code === '42P01') {
      console.log('supabase-setup - Subject lessons table missing');
      return false;
    }

    // Check for lesson_videos table
    const { error: lessonVideosError } = await supabase
      .from('lesson_videos')
      .select('id')
      .limit(1);
    
    if (lessonVideosError && lessonVideosError.code === '42P01') {
      console.log('supabase-setup - Lesson videos table missing');
      return false;
    }

    // Check for user_lesson_access table
    const { error: userLessonAccessError } = await supabase
      .from('user_lesson_access')
      .select('id')
      .limit(1);
    
    if (userLessonAccessError && userLessonAccessError.code === '42P01') {
      console.log('supabase-setup - User lesson access table missing');
      return false;
    }

    // Check for lesson_requests table
    const { error: lessonRequestsError } = await supabase
      .from('lesson_requests')
      .select('id')
      .limit(1);
    
    if (lessonRequestsError && lessonRequestsError.code === '42P01') {
      console.log('supabase-setup - Lesson requests table missing');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking core tables:', error);
    return false;
  }
};

const createCoreTables = async () => {
  try {
    console.log('supabase-setup - Creating core database tables...');
    
    // Create users table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email text UNIQUE NOT NULL,
          name text NOT NULL,
          avatar_url text,
          role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can read own profile" ON users
          FOR SELECT TO authenticated
          USING (auth.uid() = id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
          FOR UPDATE TO authenticated
          USING (auth.uid() = id);
      `
    });
    
    // Create subjects table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS subjects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text UNIQUE NOT NULL,
          description text,
          icon text,
          color text DEFAULT '#3B82F6',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read subjects" ON subjects
          FOR SELECT TO authenticated
          USING (true);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage subjects" ON subjects
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create subject_lessons table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS subject_lessons (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text NOT NULL,
          thumbnail_url text NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE subject_lessons ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read subject lessons" ON subject_lessons
          FOR SELECT TO authenticated
          USING (true);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage subject lessons" ON subject_lessons
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create lesson_videos table (renamed from lessons)
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lesson_videos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          lesson_id uuid REFERENCES subject_lessons(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text NOT NULL,
          youtube_url text NOT NULL,
          thumbnail_url text NOT NULL,
          duration text DEFAULT '0:00',
          order_index integer DEFAULT 0,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE lesson_videos ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read lesson videos" ON lesson_videos
          FOR SELECT TO authenticated
          USING (true);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage lesson videos" ON lesson_videos
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create user_lesson_access table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_lesson_access (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          lesson_id uuid REFERENCES subject_lessons(id) ON DELETE CASCADE,
          access_granted boolean DEFAULT false,
          granted_at timestamptz,
          granted_by uuid REFERENCES auth.users(id),
          created_at timestamptz DEFAULT now(),
          UNIQUE(user_id, lesson_id)
        );
        
        ALTER TABLE user_lesson_access ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can read own lesson access" ON user_lesson_access
          FOR SELECT TO authenticated
          USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own lesson access" ON user_lesson_access
          FOR INSERT TO authenticated
          WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage all lesson access" ON user_lesson_access
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create lesson_requests table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lesson_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
          lesson_id uuid REFERENCES subject_lessons(id) ON DELETE CASCADE,
          status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          message text,
          admin_response text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          reviewed_by uuid REFERENCES auth.users(id),
          reviewed_at timestamptz,
          UNIQUE(user_id, lesson_id)
        );
        
        ALTER TABLE lesson_requests ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can read own lesson requests" ON lesson_requests
          FOR SELECT TO authenticated
          USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own lesson requests" ON lesson_requests
          FOR INSERT TO authenticated
          WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own lesson requests" ON lesson_requests
          FOR UPDATE TO authenticated
          USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage all lesson requests" ON lesson_requests
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create app_texts table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS app_texts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          key text UNIQUE NOT NULL,
          value text NOT NULL,
          description text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        
        ALTER TABLE app_texts ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read app texts" ON app_texts
          FOR SELECT TO authenticated
          USING (true);
        
        CREATE POLICY IF NOT EXISTS "Admins can manage app texts" ON app_texts
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });
    
    // Create papers table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS papers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          year integer NOT NULL,
          subject text NOT NULL,
          difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
          description text NOT NULL,
          content_url text NOT NULL,
          thumbnail_url text NOT NULL,
          access_level text DEFAULT 'free' CHECK (access_level IN ('free', 'premium')),
          parameters jsonb DEFAULT '{}',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read papers" ON papers
          FOR SELECT TO authenticated
          USING (true);
      `
    });
    
    // Create quizzes table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS quizzes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          paper_id uuid REFERENCES papers(id) ON DELETE SET NULL,
          title text NOT NULL,
          description text NOT NULL,
          questions jsonb NOT NULL DEFAULT '[]',
          time_limit integer NOT NULL DEFAULT 30,
          passing_score integer NOT NULL DEFAULT 70,
          difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
          category text NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read quizzes" ON quizzes
          FOR SELECT TO authenticated
          USING (true);
      `
    });
    
    // Create lessons table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lessons (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          description text NOT NULL,
          youtube_url text NOT NULL,
          thumbnail_url text NOT NULL,
          category text NOT NULL,
          duration text DEFAULT '0:00',
          created_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id)
        );
        
        ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Anyone can read lessons" ON lessons
          FOR SELECT TO authenticated
          USING (true);
      `
    });
    
    console.log('supabase-setup - Core tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating core tables:', error);
    // Don't throw error, just log it
    return false;
  }
};

const checkOptionalFeatures = async () => {
  try {
    // Check app_texts table
    const { error: appTextsError } = await supabase
      .from('app_texts')
      .select('id')
      .limit(1);
    
    if (appTextsError && appTextsError.code === '42P01') {
      console.log('app_texts table does not exist - text customization disabled');
    }
    
    // Check notifications table
    const { error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (notificationsError && notificationsError.code === '42P01') {
      console.log('notifications table does not exist - notifications disabled');
    }
    
    // Check storage buckets
    await checkStorageBuckets();
    
    return true;
  } catch (error) {
    console.log('Error checking optional features (non-critical):', error);
    return true;
  }
};

const checkStorageBuckets = async () => {
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.warn('Could not check storage buckets:', bucketsError);
      return false;
    }
    
    const bucketNames = buckets?.map(b => b.name) || [];
    console.log('Available storage buckets:', bucketNames);
    
    // Check for required buckets
    const requiredBuckets = ['question-images', 'avatars'];
    const missingBuckets = requiredBuckets.filter(bucket => !bucketNames.includes(bucket));
    
    if (missingBuckets.length > 0) {
      console.warn(`Missing storage buckets: ${missingBuckets.join(', ')} - these need to be created manually in Supabase dashboard`);
    }
    
    return true;
  } catch (error) {
    console.log('Could not check storage buckets (non-critical):', error);
    return true;
  }
};


export const clearAuthTokens = () => {
  try {
    // Clear all Supabase-related items from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage as well
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });

    console.log('Auth tokens cleared');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};