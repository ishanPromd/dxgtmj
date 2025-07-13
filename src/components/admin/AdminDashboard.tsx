import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faFileText, faRss, faBell, faUser, faPlus, faEdit, faTrash,
  faUpload, faBrain, faSignOutAlt, faChartLine, faUsers, faTrophy,
  faCog, faBookOpen, faPlay, faEye, faDownload, faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PaperUpload } from './PaperUpload';
import { QuizCreator } from './QuizCreator';
import { QuizEditor } from './QuizEditor';
import { TextCustomizationModal } from './TextCustomizationModal';
import { LessonRequestsModal } from './LessonRequestsModal';
import { Quiz, AdminStats } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const { papers, quizzes, notifications, loading, sendBroadcastNotification, updateUserRole, deletePaper, deleteQuiz, updateQuiz } = useData();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/').pop() || 'admin';
  const [showPaperUpload, setShowPaperUpload] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [showTextCustomization, setShowTextCustomization] = useState(false);
  const [showLessonRequests, setShowLessonRequests] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetAudience: 'all' as 'all' | 'students' | 'premium',
    icon: 'star'
  });
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPapers: 0,
    totalQuizzes: 0,
    totalAttempts: 0,
    averageScore: 0,
    activeUsers: 0,
  });
  const [appTexts, setAppTexts] = useState({
    heroTitle: 'Access Your Complete SFT Quiz Bank',
    heroSubtitle: 'Comprehensive study materials and practice tests',
    featuredSectionTitle: 'Featured Subjects 👆',
  });

  // Memoize navigation items
  const navigationItems = useMemo(() => [
    { id: 'dashboard', name: 'Dashboard', icon: faHome },
    { id: 'papers', name: 'Papers', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'notifications', name: 'Notifications', icon: faBell },
    { id: 'profile', name: 'Profile', icon: faUser },
  ], []);

  // Load admin data
  useEffect(() => {
    loadAdminData();
    loadAppTexts();
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
      } else {
        setUsers(usersData || []);
      }

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalPapers = papers.length;
      const totalQuizzes = quizzes.length;
      const activeUsers = usersData?.filter(u => {
        const lastActive = new Date(u.updated_at);
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7;
      }).length || 0;

      setStats({
        totalUsers,
        totalPapers,
        totalQuizzes,
        totalAttempts: 0,
        averageScore: 85,
        activeUsers,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }, [papers.length, quizzes.length]);

  const loadAppTexts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_texts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading app texts:', error);
        return;
      }

      if (data) {
        setAppTexts({
          heroTitle: data.hero_title || 'Access Your Complete SFT Quiz Bank',
          heroSubtitle: data.hero_subtitle || 'Comprehensive study materials and practice tests',
          featuredSectionTitle: data.featured_section_title || 'Featured Subjects 👆',
        });
      }
    } catch (error) {
      console.error('Error loading app texts:', error);
    }
  }, []);

  const handleSendBroadcast = useCallback(async () => {
    if (!broadcastForm.title || !broadcastForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    const result = await sendBroadcastNotification(broadcastForm);
    if (!result.error) {
      setBroadcastForm({
        title: '',
        message: '',
        priority: 'medium',
        targetAudience: 'all',
        icon: 'star'
      });
    }
  }, [broadcastForm, sendBroadcastNotification]);

  const handleEditQuiz = useCallback((quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowQuizEditor(true);
  }, []);

  const handleSaveQuiz = useCallback((updatedQuiz: Quiz) => {
    updateQuiz(updatedQuiz.id, updatedQuiz.questions);
    setShowQuizEditor(false);
    setEditingQuiz(null);
  }, [updateQuiz]);

  const handleTabChange = useCallback((tabId: string) => {
    navigate(`/admin/${tabId === 'dashboard' ? '' : tabId}`);
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
          <p className="text-gray-600 text-base font-medium">Loading admin dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (


    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 pb-24">
          {/* Dashboard Tab */}
          {(activeTab === 'admin' || activeTab === '') && (
            <div className="space-y-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700 p-6 text-white"
              >
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full"></div>
                <div className="absolute top-7 right-7 w-6 h-6 bg-white/20 rounded-full"></div>
                <div className="absolute bottom-4 right-10 w-3 h-3 bg-white/15 rounded-full"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">Tecnology A/L Admin</h2>
                      <p className="text-blue-100 text-sm">Premium Platform Management</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={signOut}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm lg:hidden"
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} className="w-3 h-3 mr-1" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: faUsers, count: stats.totalUsers, label: 'Total Users', color: 'blue' },
                  { icon: faFileText, count: stats.totalPapers, label: 'Papers', color: 'green' },
                  { icon: faBrain, count: stats.totalQuizzes, label: 'Quizzes', color: 'purple' },
                  { icon: faTrophy, count: `${stats.averageScore}%`, label: 'Avg Score', color: 'yellow' },
                  { icon: faChartLine, count: stats.activeUsers, label: 'Active Users', color: 'red' },
                  { icon: faBell, count: notifications.length, label: 'Notifications', color: 'indigo' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.count}</p>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                      </div>
                      <div className={`w-12 h-12 bg-${stat.color}-100 rounded-full flex items-center justify-center`}>
                        <FontAwesomeIcon icon={stat.icon} className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setShowPaperUpload(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4 mr-2" />
                    Upload Paper
                  </Button>
                  <Button
                    onClick={() => setShowQuizCreator(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                    Create Quiz
                  </Button>
                  <Button
                    onClick={() => setShowTextCustomization(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
                    Customize Texts
                  </Button>
                  <Button
                    onClick={() => setShowLessonRequests(true)}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                  >
                    <FontAwesomeIcon icon={faBell} className="w-4 h-4 mr-2" />
                    Lesson Requests
                  </Button>
                </div>
              </Card>

              {/* Broadcast Notifications */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Broadcast Notification</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Notification title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={broadcastForm.priority}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Notification message"
                    />
                  </div>
                  <Button
                    onClick={handleSendBroadcast}
                    disabled={!broadcastForm.title || !broadcastForm.message}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4 mr-2" />
                    Send Broadcast
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Papers Tab */}
          {activeTab === 'papers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Manage Papers</h2>
                <Button onClick={() => setShowPaperUpload(true)}>
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                  Add Paper
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {papers.map((paper) => (
                  <Card key={paper.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{paper.title}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="primary" size="sm">{paper.subject}</Badge>
                          <Badge variant="secondary" size="sm">{paper.year}</Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const associatedQuiz = quizzes.find(q => q.paperId === paper.id);
                            if (associatedQuiz) {
                              handleEditQuiz(associatedQuiz);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePaper(paper.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{paper.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{paper.difficulty}</span>
                      <span>{paper.accessLevel}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other tabs content... */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="primary" size="sm">{notification.type}</Badge>
                          <Badge variant="secondary" size="sm">{notification.priority}</Badge>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Admin Profile</h2>
              <Card className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <img
                    src="https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg"
                    alt="Admin Avatar"
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                    <Badge variant="primary" size="sm">Administrator</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Role:</span> Administrator</p>
                      <p><span className="font-medium">Status:</span> Active</p>
                      <p><span className="font-medium">Last Login:</span> Today</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Platform Stats</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Papers Created:</span> {papers.length}</p>
                      <p><span className="font-medium">Quizzes Created:</span> {quizzes.length}</p>
                      <p><span className="font-medium">Users Managed:</span> {stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
            <div className="w-full px-4">
              <nav className="flex justify-around py-2">
                {navigationItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabChange(item.id)}
                    className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                      (activeTab === item.id) || (activeTab === 'admin' && item.id === 'dashboard') || (activeTab === '' && item.id === 'dashboard')
                        ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.name}</span>
                    {((activeTab === item.id) || (activeTab === 'admin' && item.id === 'dashboard') || (activeTab === '' && item.id === 'dashboard')) && (
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

      {/* Modals */}
      <AnimatePresence>
        {showPaperUpload && (
          <PaperUpload onClose={() => setShowPaperUpload(false)} />
        )}
        {showQuizCreator && (
          <QuizCreator onClose={() => setShowQuizCreator(false)} />
        )}
        {showQuizEditor && editingQuiz && (
          <QuizEditor
            quiz={editingQuiz}
            onClose={() => {
              setShowQuizEditor(false);
              setEditingQuiz(null);
            }}
            onSave={handleSaveQuiz}
          />
        )}
        {showTextCustomization && (
          <TextCustomizationModal
            currentTexts={appTexts}
            onClose={() => setShowTextCustomization(false)}
            onSave={(texts) => {
              setAppTexts(texts);
              setShowTextCustomization(false);
            }}
          />
        )}
        {showLessonRequests && (
          <LessonRequestsModal
            onClose={() => setShowLessonRequests(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};