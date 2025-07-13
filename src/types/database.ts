export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string;
          role: 'admin' | 'user';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
      };
      papers: {
        Row: {
          id: string;
          title: string;
          year: number;
          subject: string;
          difficulty: 'easy' | 'medium' | 'hard';
          description: string;
          content_url: string;
          thumbnail_url: string;
          access_level: 'free' | 'premium';
          parameters: any;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          title: string;
          year: number;
          subject: string;
          difficulty: 'easy' | 'medium' | 'hard';
          description: string;
          content_url: string;
          thumbnail_url: string;
          access_level?: 'free' | 'premium';
          parameters?: any;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          title?: string;
          year?: number;
          subject?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          description?: string;
          content_url?: string;
          thumbnail_url?: string;
          access_level?: 'free' | 'premium';
          parameters?: any;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          paper_id?: string;
          title: string;
          description: string;
          questions: any[];
          time_limit: number;
          passing_score: number;
          difficulty: 'easy' | 'medium' | 'hard';
          category: string;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          paper_id?: string;
          title: string;
          description: string;
          questions: any[];
          time_limit: number;
          passing_score: number;
          difficulty: 'easy' | 'medium' | 'hard';
          category: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          paper_id?: string;
          title?: string;
          description?: string;
          questions?: any[];
          time_limit?: number;
          passing_score?: number;
          difficulty?: 'easy' | 'medium' | 'hard';
          category?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          responses: any[];
          score: number;
          total_points: number;
          time_spent: number;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          responses: any[];
          score: number;
          total_points: number;
          time_spent: number;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          responses?: any[];
          score?: number;
          total_points?: number;
          time_spent?: number;
          completed_at?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'quiz_result' | 'achievement' | 'reminder' | 'broadcast';
          title: string;
          message: string;
          data?: any;
          priority: 'low' | 'medium' | 'high';
          read_status: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'quiz_result' | 'achievement' | 'reminder' | 'broadcast';
          title: string;
          message: string;
          data?: any;
          priority?: 'low' | 'medium' | 'high';
          read_status?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'quiz_result' | 'achievement' | 'reminder' | 'broadcast';
          title?: string;
          message?: string;
          data?: any;
          priority?: 'low' | 'medium' | 'high';
          read_status?: boolean;
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          title: string;
          description: string;
          youtube_url: string;
          thumbnail_url: string;
          category: string;
          duration: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          youtube_url: string;
          thumbnail_url: string;
          category: string;
          duration: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          youtube_url?: string;
          thumbnail_url?: string;
          category?: string;
          duration?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      app_texts: {
        Row: {
          id: string;
          hero_title: string;
          hero_subtitle: string;
          featured_section_title: string;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          hero_title: string;
          hero_subtitle: string;
          featured_section_title: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          hero_title?: string;
          hero_subtitle?: string;
          featured_section_title?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}