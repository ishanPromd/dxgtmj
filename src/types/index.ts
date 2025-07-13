export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  progress: UserProgress;
  preferences: UserPreferences;
}

export interface UserProgress {
  totalQuizzes: number;
  completedQuizzes: number;
  totalScore: number;
  averageScore: number;
  streak: number;
  badgesEarned: string[];
}

export interface UserPreferences {
  notifications: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  subjects: string[];
}

export interface Paper {
  id: string;
  title: string;
  year: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  contentUrl: string;
  thumbnailUrl: string;
  parameters: PaperParameters;
  accessLevel: 'free' | 'premium';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaperParameters {
  timeLimit: number; // in minutes
  passingScore: number;
  attempts: number;
  showAnswers: boolean;
  shuffleQuestions: boolean;
}

export interface Quiz {
  id: string;
  paperId?: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit: number;
  passingScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  createdAt: Date;
  updatedAt: Date;
  introduction?: QuizIntroduction;
}

export interface QuizIntroduction {
  title: string;
  subtitle: string;
  instructions: string[];
  buttonText: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string; // Added image support
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  responses: QuizResponse[];
  score: number;
  totalPoints: number;
  timeSpent: number;
  completedAt: Date;
  rank?: number;
}

export interface QuizResponse {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizSession {
  quiz: Quiz;
  currentQuestionIndex: number;
  responses: QuizResponse[];
  startTime: Date;
  timeRemaining: number;
  isCompleted: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'quiz_result' | 'achievement' | 'reminder' | 'broadcast';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  readStatus: boolean;
  createdAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalPapers: number;
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  activeUsers: number;
}

export interface VideoContent {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  category: string;
  duration: string;
  createdAt: Date;
  createdBy: string;
}

export interface RecentQuiz {
  id: string;
  title: string;
  questions: number;
  completedAt: Date;
  score?: number;
  originalQuiz: Quiz;
}

// New interface for admin text customization
export interface AppTexts {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  featuredSectionTitle: string;
  createdAt: Date;
  updatedAt: Date;
}