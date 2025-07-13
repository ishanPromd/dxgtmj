import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Paper, Quiz, QuizAttempt, Notification } from '../types';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useData = () => {
  const { user } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);

  // Memoize fetchData to prevent infinite loops
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Fetch papers with error handling
      try {
        const { data: papersData, error: papersError } = await supabase
          .from('papers')
          .select('*')
          .order('created_at', { ascending: false });

        if (papersError) {
          if (papersError.code === '42P01') {
            console.log('Papers table does not exist, using empty array');
            setPapers([]);
          } else {
            console.error('Error fetching papers:', papersError);
            setPapers([]);
          }
        } else {
          // Transform data to match frontend types
          const transformedPapers: Paper[] = papersData?.map(paper => ({
            id: paper.id,
            title: paper.title,
            year: paper.year,
            subject: paper.subject,
            difficulty: paper.difficulty,
            description: paper.description,
            contentUrl: paper.content_url,
            thumbnailUrl: paper.thumbnail_url,
            parameters: paper.parameters || {
              timeLimit: 60,
              passingScore: 70,
              attempts: 3,
              showAnswers: true,
              shuffleQuestions: false,
            },
            accessLevel: paper.access_level,
            createdAt: new Date(paper.created_at),
            updatedAt: new Date(paper.updated_at),
          })) || [];
          setPapers(transformedPapers);
        }
      } catch (error) {
        console.error('Error fetching papers:', error);
        setPapers([]);
      }

      // Fetch quizzes with questions - Fixed JSONB handling
      try {
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (quizzesError) {
          if (quizzesError.code === '42P01') {
            console.log('Quizzes table does not exist, using empty array');
            setQuizzes([]);
          } else {
            console.error('Error fetching quizzes:', quizzesError);
            setQuizzes([]);
          }
        } else {
          const transformedQuizzes: Quiz[] = quizzesData?.map(quiz => {
            // Properly handle JSONB questions array
            let questions = [];
            try {
              if (quiz.questions) {
                // If it's already an array, use it directly
                if (Array.isArray(quiz.questions)) {
                  questions = quiz.questions;
                } else if (typeof quiz.questions === 'string') {
                  // If it's a string, parse it
                  questions = JSON.parse(quiz.questions);
                } else if (typeof quiz.questions === 'object') {
                  // If it's an object but not array, try to extract array
                  questions = Array.isArray(quiz.questions) ? quiz.questions : [];
                }
              }
            } catch (parseError) {
              console.error('Error parsing questions for quiz:', quiz.id, parseError);
              questions = [];
            }

            // Ensure each question has proper structure
            questions = questions.map((q: any, index: number) => ({
              id: q.id || `q_${index}`,
              question: q.question || '',
              options: Array.isArray(q.options) ? q.options : [],
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
              explanation: q.explanation || '',
              points: typeof q.points === 'number' ? q.points : 1,
              difficulty: q.difficulty || 'medium',
              imageUrl: q.imageUrl || '',
            }));

            return {
              id: quiz.id,
              paperId: quiz.paper_id,
              title: quiz.title,
              description: quiz.description,
              questions: questions,
              timeLimit: quiz.time_limit,
              passingScore: quiz.passing_score,
              difficulty: quiz.difficulty,
              category: quiz.category,
              createdAt: new Date(quiz.created_at),
              updatedAt: new Date(quiz.updated_at),
            };
          }) || [];
          
          setQuizzes(transformedQuizzes);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        setQuizzes([]);
      }

      // Fetch lessons
      try {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .order('created_at', { ascending: false });

        if (lessonsError) {
          if (lessonsError.code === '42P01') {
            console.log('Lessons table does not exist, using empty array');
            setLessons([]);
          } else {
            console.error('Error fetching lessons:', lessonsError);
            setLessons([]);
          }
        } else {
          setLessons(lessonsData || []);
        }
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setDataFetched(true);
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Only fetch data once when component mounts or when explicitly called
  useEffect(() => {
    if (!dataFetched || !papers.length || !quizzes.length) {
      fetchData();
    }
  }, [fetchData, dataFetched]);

  // Memoize fetchUserNotifications to prevent infinite loops
  const fetchUserNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.log('useData - Notifications table does not exist, using empty array');
          setNotifications([]);
          return;
        }
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        return;
      }

      const transformedNotifications: Notification[] = data?.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        readStatus: notification.read_status,
        createdAt: new Date(notification.created_at),
      })) || [];

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setNotifications([]);
    }
  }, []); // Remove dependencies to prevent infinite loops

  const addPaper = async (paperData: {
    title: string;
    year: number;
    subject: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
    contentUrl: string;
    thumbnailUrl: string;
    accessLevel: 'free' | 'premium';
    parameters: {
      timeLimit: number;
      passingScore: number;
      attempts: number;
      showAnswers: boolean;
      shuffleQuestions: boolean;
    };
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      points: number;
      difficulty: 'easy' | 'medium' | 'hard';
      imageUrl?: string;
    }>;
  }, userId: string) => {
    try {
      // Check if papers table exists
      const { error: checkError } = await supabase
        .from('papers')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        toast.error('Database not properly configured. Please contact administrator.');
        return { data: null, error: checkError };
      }

      // Insert paper first
      const { data: paperResult, error: paperError } = await supabase
        .from('papers')
        .insert({
          title: paperData.title,
          year: paperData.year,
          subject: paperData.subject,
          difficulty: paperData.difficulty,
          description: paperData.description,
          content_url: paperData.contentUrl,
          thumbnail_url: paperData.thumbnailUrl,
          access_level: paperData.accessLevel,
          parameters: paperData.parameters,
          created_by: userId,
        })
        .select()
        .single();

      if (paperError) {
        console.error('Error creating paper:', paperError);
        toast.error(`Failed to create paper: ${paperError.message}`);
        return { data: null, error: paperError };
      }

      // Create a quiz for this paper with the questions - Ensure JSONB format
      if (paperData.questions.length > 0) {
        // Properly format questions for JSONB storage
        const formattedQuestions = paperData.questions.map((q, index) => ({
          id: `q_${Date.now()}_${index}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points,
          difficulty: q.difficulty,
          imageUrl: q.imageUrl || '',
        }));

        const { data: quizResult, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            paper_id: paperResult.id,
            title: `${paperData.title} Quiz`,
            description: `Quiz for ${paperData.title}`,
            category: paperData.subject,
            difficulty: paperData.difficulty,
            time_limit: paperData.parameters.timeLimit,
            passing_score: paperData.parameters.passingScore,
            questions: formattedQuestions, // This will be stored as JSONB
            created_by: userId,
          })
          .select()
          .single();

        if (quizError) {
          console.error('Error creating quiz:', quizError);
          // If quiz creation fails, delete the paper to maintain consistency
          await supabase.from('papers').delete().eq('id', paperResult.id);
          toast.error(`Failed to create quiz: ${quizError.message}`);
          return { data: null, error: quizError };
        }
      }

      toast.success('Paper created successfully!');
      // Force refresh data immediately
      setDataFetched(false);
      return { data: paperResult, error: null };
    } catch (error) {
      console.error('Error adding paper:', error);
      toast.error('Failed to create paper');
      return { data: null, error };
    }
  };

  const addQuiz = async (quizData: {
    title: string;
    description: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit: number;
    passingScore: number;
    paperId?: string;
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      points: number;
      difficulty: 'easy' | 'medium' | 'hard';
      imageUrl?: string;
    }>;
  }, userId: string) => {
    try {
      // Check if quizzes table exists
      const { error: checkError } = await supabase
        .from('quizzes')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        toast.error('Database not properly configured. Please contact administrator.');
        return { data: null, error: checkError };
      }

      // Properly format questions for JSONB storage
      const formattedQuestions = quizData.questions.map((q, index) => ({
        id: `q_${Date.now()}_${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        points: q.points,
        difficulty: q.difficulty,
        imageUrl: q.imageUrl || '',
      }));

      // Insert quiz
      const { data: quizResult, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizData.title,
          description: quizData.description,
          category: quizData.category,
          difficulty: quizData.difficulty,
          time_limit: quizData.timeLimit,
          passing_score: quizData.passingScore,
          paper_id: quizData.paperId || null,
          questions: formattedQuestions, // This will be stored as JSONB
          created_by: userId,
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error creating quiz:', quizError);
        toast.error(`Failed to create quiz: ${quizError.message}`);
        return { data: null, error: quizError };
      }

      toast.success('Quiz created successfully!');
      // Force refresh data immediately
      setDataFetched(false);
      return { data: quizResult, error: null };
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
      return { data: null, error };
    }
  };

  const updateQuiz = async (quizId: string, updatedQuestions: any[]) => {
    try {
      // Properly format questions for JSONB storage
      const formattedQuestions = updatedQuestions.map((q, index) => ({
        id: q.id || `q_${Date.now()}_${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        points: q.points,
        difficulty: q.difficulty,
        imageUrl: q.imageUrl || '',
      }));

      const { error } = await supabase
        .from('quizzes')
        .update({
          questions: formattedQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quizId);

      if (error) {
        console.error('Error updating quiz:', error);
        toast.error(`Failed to update quiz: ${error.message}`);
        return { error };
      }

      toast.success('Quiz updated successfully!');
      // Force refresh data immediately
      setDataFetched(false);
      fetchData(true); // Force refresh
      return { error: null };
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
      return { error };
    }
  };

  const addLesson = async (lessonData: {
    title: string;
    description: string;
    youtubeUrl: string;
    thumbnailUrl: string;
    category: string;
    duration?: string;
  }) => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if lessons table exists
      const { error: checkError } = await supabase
        .from('lessons')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        toast.error('Database not properly configured. Please contact administrator.');
        return { data: null, error: checkError };
      }

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          title: lessonData.title,
          description: lessonData.description,
          youtube_url: lessonData.youtubeUrl,
          thumbnail_url: lessonData.thumbnailUrl,
          category: lessonData.category,
          duration: lessonData.duration || '0:00',
          created_by: user.id, // Use actual user ID instead of 'admin'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding lesson:', error);
        toast.error(`Failed to add lesson: ${error.message}`);
        return { data: null, error };
      }

      toast.success('Lesson added successfully!');
      setDataFetched(false);
      return { data, error: null };
      
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast.error('Failed to add lesson');
      return { data: null, error };
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) {
        console.error('Error deleting lesson:', error);
        toast.error(`Failed to delete lesson: ${error.message}`);
        return { error };
      }

      toast.success('Lesson deleted successfully!');
      setDataFetched(false);
      return { error: null };
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Failed to delete lesson');
      return { error };
    }
  };

  const sendBroadcastNotification = async (notificationData: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    targetAudience: 'all' | 'students' | 'premium';
    icon?: string;
  }) => {
    try {
      // Check if notifications table exists
      const { error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        toast.error('Notifications feature not available. Database configuration required.');
        return { error: checkError };
      }

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Failed to send broadcast notification');
        return { error: usersError };
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'broadcast' as const,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority,
        data: { icon: notificationData.icon || 'star' },
        read_status: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error sending broadcast:', error);
        toast.error(`Failed to send broadcast: ${error.message}`);
        return { error };
      }

      toast.success('Broadcast notification sent successfully!');
      return { error: null };
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      toast.error('Failed to send broadcast notification');
      return { error };
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        toast.error(`Failed to update user role: ${error.message}`);
        return { error };
      }

      toast.success(`User role updated to ${newRole}`);
      return { error: null };
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
      return { error };
    }
  };

  const deletePaper = async (paperId: string) => {
    try {
      // First delete associated quizzes
      const { error: quizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('paper_id', paperId);

      if (quizError) {
        console.error('Error deleting associated quizzes:', quizError);
      }

      // Then delete the paper
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId);

      if (error) {
        console.error('Error deleting paper:', error);
        toast.error(`Failed to delete paper: ${error.message}`);
        return { error };
      }

      toast.success('Paper deleted successfully!');
      setDataFetched(false);
      return { error: null };
    } catch (error) {
      console.error('Error deleting paper:', error);
      toast.error('Failed to delete paper');
      return { error };
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) {
        console.error('Error deleting quiz:', error);
        toast.error(`Failed to delete quiz: ${error.message}`);
        return { error };
      }

      toast.success('Quiz deleted successfully!');
      setDataFetched(false);
      return { error: null };
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
      return { error };
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, readStatus: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return {
    papers,
    quizzes,
    attempts,
    notifications,
    lessons,
    loading,
    fetchData,
    fetchUserNotifications,
    addPaper,
    addQuiz,
    updateQuiz,
    addLesson,
    deleteLesson,
    sendBroadcastNotification,
    updateUserRole,
    deletePaper,
    deleteQuiz,
    markNotificationRead,
  };
};