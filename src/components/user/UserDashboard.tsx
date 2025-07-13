import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen, faBrain, faTrophy, faTrendingUp, faClock, faStar, faSearch, faPlay,
  faAward, faBolt, faArrowRight, faHome, faFileText, faRss, faBell,
  faUser, faFolder, faFile, faChevronLeft, faExclamationCircle, faPlus, faUpload,
  faYoutube, faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import { Target } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Quiz, QuizSession, RecentQuiz } from '../../types';
import { QuizInterface } from '../quiz/QuizInterface';
import { QuizResults } from '../quiz/QuizResults';

// Typing animation component
const TypingText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return <span className={className}>{displayText}</span>;
};

export const UserDashboard: React.FC = () => {
  const { papers, quizzes, notifications, loading, markNotificationRead, fetchUserNotifications } = useData();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [notificationsFetched, setNotificationsFetched] = useState(false);

  // Use useCallback to memoize the loadRecentQuizzes function
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

  // Only fetch notifications once when user changes
  useEffect(() => {
    if (user?.id && !notificationsFetched) {
      fetchUserNotifications(user.id);
      setNotificationsFetched(true);
      loadRecentQuizzes();
    }
  }, [user?.id, notificationsFetched, fetchUserNotifications, loadRecentQuizzes]);

  // Memoize the addToRecentQuizzes function
  const addToRecentQuizzes = useCallback((quiz: Quiz, score?: number) => {
    if (!user?.id) return;

    // Find the associated paper for this quiz
    const associatedPaper = papers.find(paper => paper.id === quiz.paperId);
    const paperTitle = associatedPaper ? associatedPaper.title : `${quiz.category} Quiz - ${new Date().getFullYear()}`;

    const newRecentQuiz: RecentQuiz = {
      id: quiz.id,
      title: paperTitle, // Use the actual paper title
      questions: quiz.questions.length,
      completedAt: new Date(),
      score,
      originalQuiz: quiz
    };

    setRecentQuizzes(prev => {
      const updatedRecents = [newRecentQuiz, ...prev.filter(r => r.id !== quiz.id)].slice(0, 3);
      localStorage.setItem(`recentQuizzes_${user.id}`, JSON.stringify(updatedRecents));
      return updatedRecents;
    });
  }, [user?.id, papers]);

  // Memoize filtered data to prevent unnecessary recalculations
  const { filteredPapers, filteredQuizzes, allowedSubjects } = useMemo(() => {
    const allowedSubjects = ['SFT', 'ET', 'ICT'];
    const filteredPapers = papers.filter(paper => allowedSubjects.includes(paper.subject));
    const filteredQuizzes = quizzes.filter(quiz => allowedSubjects.includes(quiz.category));
    
    return { filteredPapers, filteredQuizzes, allowedSubjects };
  }, [papers, quizzes]);

  // Memoize unread notifications
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.readStatus && n.userId === user?.id),
    [notifications, user?.id]
  );

  // Memoize bottom nav items
  const bottomNavItems = useMemo(() => [
    { id: 'home', name: 'Home', icon: faHome },
    { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'my-lessons', name: 'My Lessons', icon: faBookOpen },
    { id: 'notifications', name: 'Notifications', icon: faBell },
  ], []);

  // Group papers by subject (only SFT, ET, ICT) - memoized
  const papersBySubject = useMemo(() => {
    return filteredPapers.reduce((acc, paper) => {
      if (!acc[paper.subject]) {
        acc[paper.subject] = [];
      }
      acc[paper.subject].push(paper);
      return acc;
    }, {} as Record<string, typeof papers>);
  }, [filteredPapers]);

  // Memoize subject cards
  const subjectCards = useMemo(() => {
    return Object.keys(papersBySubject).map(subject => {
      const subjectPapers = papersBySubject[subject];
      const subjectQuizzes = filteredQuizzes.filter(q => q.category === subject);
      
      return {
        title: subject,
        icon: getSubjectIcon(subject),
        papers: subjectPapers.length,
        questions: subjectQuizzes.reduce((sum, q) => sum + q.questions.length, 0),
        color: 'from-blue-400 to-blue-600', // Same color for all subjects
        papersData: subjectPapers,
      };
    });
  }, [papersBySubject, filteredQuizzes]);

  function getSubjectIcon(subject: string): string {
    const icons: Record<string, string> = {
      'SFT': '🔬',
      'ET': '⚙️',
      'ICT': '💻',
    };
    return icons[subject] || '📖';
  }

  function getSubjectColor(subject: string): string {
    return 'from-blue-400 to-blue-600'; // Same color for all subjects
  }

  const handleStartLearning = useCallback(() => {
    // Check if Chrome is available
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    if (isChrome) {
      window.open('https://tecnology.great-site.net/', '_blank');
    } else {
      // Try to open in Chrome if available
      const chromeUrl = 'googlechrome://tecnology.great-site.net/';
      const fallbackUrl = 'https://tecnology.great-site.net/';
      
      try {
        window.location.href = chromeUrl;
        // Fallback after a short delay
        setTimeout(() => {
          window.open(fallbackUrl, '_blank');
        }, 1000);
      } catch (error) {
        window.open(fallbackUrl, '_blank');
      }
    }
  }, []);

  const handleNotificationClick = useCallback(async (notification: any) => {
    await markNotificationRead(notification.id);
  }, [markNotificationRead]);

  const handlePaperClick = useCallback((paper: any) => {
    const associatedQuiz = filteredQuizzes.find(quiz => quiz.paperId === paper.id);
    setSelectedPaper({ ...paper, quiz: associatedQuiz });
  }, [filteredQuizzes]);

  const handleRecentQuizClick = useCallback((recentQuiz: RecentQuiz) => {
    if (recentQuiz.originalQuiz) {
      setActiveQuiz(recentQuiz.originalQuiz);
    }
  }, []);

  const handleStartQuiz = useCallback((quiz: Quiz) => {
    setActiveQuiz(quiz);
    setShowQuizResults(false);
    setQuizSession(null);
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

  const handleBackFromPaper = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  const handleBackFromSubject = useCallback(() => {
    setSelectedSubject(null);
    setSelectedPaper(null);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    navigate(`/${tabId}`);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-base font-medium"
          >
            <TypingText text="Loading..." />
          </motion.p>
        </motion.div>
      </div>
    );
  }

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
        {/* Main View */}
        {!selectedSubject && !selectedPaper && (
          <div className="space-y-6">
            {/* Hero Section - Updated text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 p-6 text-white"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full"></div>
              <div className="absolute top-7 right-7 w-6 h-6 bg-white/20 rounded-full"></div>
              <div className="absolute bottom-4 right-10 w-3 h-3 bg-white/15 rounded-full"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-3">
                      <TypingText text="Tecnology A/L " className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent" />
                    </h2>
                    <p className="text-blue-100 mb-4 text-sm">
                      Advanced Level Tecnology
                    </p>
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
                <Button 
                  variant="outline" 
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-sm px-4 py-2"
                  onClick={handleStartLearning}
                >
                  Continue To Old Website
                </Button>
              </div>
            </motion.div>

            {/* Featured Section with updated title */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  A/L MCQ Papers (Quiz) 👇
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {subjectCards.length > 0 ? (
                  subjectCards.map((subject, index) => (
                    <motion.div
                      key={subject.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-gradient-to-r ${subject.color.replace('400', '100').replace('600', '200')} rounded-2xl p-4 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300`}
                      onClick={() => setSelectedSubject(subject.title)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg">
                            {subject.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {subject.title}
                            </h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1 text-xs text-gray-600">
                                <FontAwesomeIcon icon={faFolder} className="w-3 h-3" />
                                <span>Papers {subject.papers}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-600">
                                <FontAwesomeIcon icon={faFile} className="w-3 h-3" />
                                <span>Questions {subject.questions}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-10 h-10 bg-gradient-to-r ${subject.color} rounded-2xl flex items-center justify-center group-hover:shadow-lg transition-all`}
                        >
                          <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-white" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 col-span-full">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FontAwesomeIcon icon={faFileText} className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">No Papers Added</h3>
                    <p className="text-gray-600 text-sm">
                      No papers have been added yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subject Papers View */}
        {selectedSubject && !selectedPaper && (
          <div className="space-y-4">
            {/* Subject Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${getSubjectColor(selectedSubject)} p-5 text-white`}
            >
              <button
                onClick={handleBackFromSubject}
                className="absolute top-3 left-3 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 text-white" />
              </button>
              <div className="absolute top-3 right-3 w-12 h-12 bg-white/10 rounded-full"></div>
              <div className="relative z-10 pt-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-xl">{getSubjectIcon(selectedSubject)}</div>
                  <h2 className="text-lg font-bold">{selectedSubject}</h2>
                </div>
                <p className="text-white/80 text-sm">
                  {papersBySubject[selectedSubject]?.length || 0} Papers • {filteredQuizzes.filter(q => q.category === selectedSubject).reduce((sum, q) => sum + q.questions.length, 0)} Questions
                </p>
              </div>
            </motion.div>

            {/* Papers List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {papersBySubject[selectedSubject]?.length > 0 ? (
                papersBySubject[selectedSubject].map((paper, index) => {
                  const associatedQuiz = filteredQuizzes.find(quiz => quiz.paperId === paper.id);
                  const questionCount = associatedQuiz?.questions.length || 0;
                  
                  return (
                    <motion.div
                      key={paper.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => handlePaperClick(paper)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {paper.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <FontAwesomeIcon icon={faFile} className="w-3 h-3 mr-1" />
                                Questions {questionCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-8 h-8 bg-gradient-to-r ${getSubjectColor(selectedSubject)} rounded-full flex items-center justify-center hover:shadow-lg transition-all`}
                        >
                          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-white" />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FontAwesomeIcon icon={faFileText} className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-2">No Papers Added</h3>
                  <p className="text-gray-600 text-sm">
                    No papers have been added to this subject yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paper Questions View */}
        {selectedPaper && (
          <div className="space-y-4">
            {/* Paper Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${getSubjectColor(selectedPaper.subject)} p-5 text-white`}
            >
              <button
                onClick={handleBackFromPaper}
                className="absolute top-3 left-3 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 text-white" />
              </button>
              <div className="absolute top-3 right-3 w-12 h-12 bg-white/10 rounded-full"></div>
              <div className="relative z-10 pt-6">
                <div className="flex items-center space-x-3 mb-2">
             
                  <h2 className="text-lg font-bold">{selectedPaper.title}</h2>
                </div>
                <p className="text-white/80 text-sm mb-3">
                  {selectedPaper.description}
                </p>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="flex items-center">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3 mr-1" />
                    {selectedPaper.parameters?.timeLimit || selectedPaper.time_limit || 60} min
                  </span>
                  <span className="flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    {selectedPaper.parameters?.passingScore || selectedPaper.passing_score || 70}% to pass
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Start Quiz Button */}
            {selectedPaper.quiz && selectedPaper.quiz.questions.length > 0 && (
              <div className="text-center">
                <Button 
                  className={`bg-gradient-to-r ${getSubjectColor(selectedPaper.subject)} hover:shadow-lg text-lg px-8 py-4 rounded-2xl`}
                  onClick={() => handleStartQuiz(selectedPaper.quiz)}
                >
                  <FontAwesomeIcon icon={faPlay} className="w-5 h-5 mr-2" />
                  Start Paper ({selectedPaper.quiz.questions.length} questions)
                </Button>
              </div>
            )}
          </div>
        )}

        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
            <div className="w-full px-4">
              <nav className="flex justify-around py-2">
                {bottomNavItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabChange(item.id)}
                    className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                      window.location.pathname === `/${item.id}` || (window.location.pathname === '/home' && item.id === 'home')
                        ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.name}</span>
                    {(window.location.pathname === `/${item.id}` || (window.location.pathname === '/home' && item.id === 'home')) && (
                      <motion.div
                        layoutId="activeTabMobile"
                        className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    {item.id === 'notifications' && unreadNotifications.length > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                      >
                        {unreadNotifications.length}
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </nav>
            </div>
        </div>
    </div>
  );
};