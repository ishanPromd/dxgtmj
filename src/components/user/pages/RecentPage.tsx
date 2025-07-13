import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faFileText, faRss, faBell, faUser, faSignOutAlt,
  faTrophy, faArrowRight, faPlay
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useData } from '../../../hooks/useData';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { QuizInterface } from '../../quiz/QuizInterface';
import { QuizResults } from '../../quiz/QuizResults';
import { Quiz, QuizSession, RecentQuiz } from '../../../types';

interface RecentPageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export const RecentPage: React.FC<RecentPageProps> = ({ onNavigate, activeTab }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { quizzes } = useData();
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Memoize bottom nav items
  const bottomNavItems = useMemo(() => [
    { id: 'home', name: 'Home', icon: faHome },
    { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'my-lessons', name: 'My Lessons', icon: faUser },
    { id: 'notifications', name: 'Notifications', icon: faBell },
  ], []);

  // Load recent quizzes from localStorage
  const loadRecentQuizzes = useCallback(() => {
    if (!user?.id) return;
    
    const stored = localStorage.getItem(`recentQuizzes_${user.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentQuizzes(parsed.map((item: any) => ({
          ...item,
          completedAt: new Date(item.completedAt)
        })));
      } catch (error) {
        console.error('Error loading recent quizzes:', error);
        setRecentQuizzes([]);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadRecentQuizzes();
  }, [loadRecentQuizzes]);

  // Add to recent quizzes
  const addToRecentQuizzes = useCallback((quiz: Quiz, score?: number) => {
    if (!user?.id) return;

    const newRecentQuiz: RecentQuiz = {
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions.length,
      completedAt: new Date(),
      score,
      originalQuiz: quiz
    };

    setRecentQuizzes(prev => {
      const updatedRecents = [newRecentQuiz, ...prev.filter(r => r.id !== quiz.id)].slice(0, 10);
      localStorage.setItem(`recentQuizzes_${user.id}`, JSON.stringify(updatedRecents));
      return updatedRecents;
    });
  }, [user?.id]);

  const handleRecentQuizClick = useCallback((recentQuiz: RecentQuiz) => {
    if (recentQuiz.originalQuiz) {
      setActiveQuiz(recentQuiz.originalQuiz);
    }
  }, []);

  const handleQuizComplete = useCallback((session: QuizSession) => {
    setQuizSession(session);
    setShowQuizResults(true);
    setActiveQuiz(null);
    
    const score = Math.round((session.responses.filter(r => r.isCorrect).length / session.quiz.questions.length) * 100);
    addToRecentQuizzes(session.quiz, score);
  }, [addToRecentQuizzes]);

  const handleQuizExit = useCallback(() => {
    setActiveQuiz(null);
    setQuizSession(null);
    setShowQuizResults(false);
  }, []);

  const handleRetryQuiz = useCallback(() => {
    if (quizSession) {
      setActiveQuiz(quizSession.quiz);
      setShowQuizResults(false);
      setQuizSession(null);
    }
  }, [quizSession]);

  // Show quiz interface when quiz is active
  if (activeQuiz) {
    return (
      <QuizInterface
        quiz={activeQuiz}
        onComplete={handleQuizComplete}
        onExit={handleQuizExit}
      />
    );
  }

  // Show quiz results when quiz is completed
  if (showQuizResults && quizSession) {
    return (
      <QuizResults
        session={quizSession}
        onRetry={handleRetryQuiz}
        onHome={handleQuizExit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-700 p-6 text-white mb-6"
        >
          <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full"></div>
          <div className="absolute top-7 right-7 w-6 h-6 bg-white/20 rounded-full"></div>
          <div className="absolute bottom-4 right-10 w-3 h-3 bg-white/15 rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-3">Recent Papers</h2>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs px-3 py-1.5 ml-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Recent Quizzes Section */}
        <div className="space-y-4">


          {recentQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentQuizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => handleRecentQuizClick(quiz)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white group-hover:border-indigo-300 transition-colors shadow-lg">
                        <span className="text-sm font-bold text-white">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <FontAwesomeIcon icon={faFileText} className="w-3 h-3" />
                            <span>Questions {quiz.questions}</span>
                          </div>
                          {quiz.score !== undefined && (
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
                              <span>{quiz.score}%</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <span className="text-xs text-gray-400">
                            {quiz.completedAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center group-hover:from-indigo-600 group-hover:to-purple-700 transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>

                  {/* Score Badge */}
                  {quiz.score !== undefined && (
                    <div className="mt-3 flex items-center justify-between">
                      <Badge 
                        variant={quiz.score >= 80 ? 'success' : quiz.score >= 60 ? 'warning' : 'error'}
                        size="sm"
                      >
                        Score: {quiz.score}%
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <FontAwesomeIcon icon={faPlay} className="w-3 h-3 mr-1" />
                        Retry Paper
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faFileText} className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Papers</h3>
              <p className="text-gray-600 text-sm mb-4">
                Your recently completed papers will appear here.
              </p>
              <Button
                onClick={() => navigate('/home')}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                Start Learning
              </Button>
            </motion.div>
          )}
        </div>

  
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
        <div className="w-full px-4">
          <nav className="flex justify-around py-2">
            {bottomNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/${item.id}`)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};