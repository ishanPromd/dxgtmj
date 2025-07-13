import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faEnvelope, faCopy, faCheck, faEdit, faCamera, faTrophy, faCog,
  faBrain, faTrendingUp, faStar, faSignOutAlt, faHome, faFileText, faRss, faFire,
  faBell, faUpload, faSpinner, faQuestionCircle, faShieldAlt, faMoon, faLanguage,
  faDownload, faHistory, faChartLine, faCalendarAlt, faArrowRight, faTimes, faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { Target } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
}

interface ProfileData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  progress: { completedQuizzes: number; averageScore: number; streak: number; };
  refCode: string;
  created_at: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, activeTab }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { quizzes } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '' });
  const [realStats, setRealStats] = useState({ completedQuizzes: 0, averageScore: 0, streak: 0 });
  const [showSettings, setShowSettings] = useState(false);

  const generateRefCode = useCallback((userId: string, createdAt?: string) => {
    try {
      const timestamp = createdAt ? new Date(createdAt).getTime() : Date.now();
      const userPart = userId.replace(/-/g, '').slice(0, 4).toUpperCase();
      const timePart = timestamp.toString().slice(-4);
      return `${userPart}${timePart}`;
    } catch (error) {
      console.error('Error generating ref code:', error);
      return 'REF' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  }, []);

  const defaultProfileData = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id, email: user.email || '', name: user.name || user.email?.split('@')[0] || 'User',
      avatar_url: 'https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg',
      progress: { completedQuizzes: 15, averageScore: 88, streak: 5, },
      refCode: generateRefCode(user.id), created_at: new Date().toISOString(),
    };
  }, [user, generateRefCode]);

  // Fetch real quiz statistics
  const fetchRealStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get recent quiz attempts from localStorage
      const recentQuizzesKey = `recentQuizzes_${user.id}`;
      const storedQuizzes = localStorage.getItem(recentQuizzesKey);
      
      if (storedQuizzes) {
        const recentQuizzes = JSON.parse(storedQuizzes);
        const completedQuizzes = recentQuizzes.length;
        const scores = recentQuizzes.filter((q: any) => q.score !== undefined).map((q: any) => q.score);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        
        // Calculate streak (consecutive days with quiz activity)
        const today = new Date();
        let streak = 0;
        const sortedQuizzes = recentQuizzes.sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        
        for (let i = 0; i < sortedQuizzes.length; i++) {
          const quizDate = new Date(sortedQuizzes[i].completedAt);
          const daysDiff = Math.floor((today.getTime() - quizDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= i) {
            streak++;
          } else {
            break;
          }
        }
        
        setRealStats({ completedQuizzes, averageScore, streak });
      } else {
        setRealStats({ completedQuizzes: 0, averageScore: 0, streak: 0 });
      }
    } catch (error) {
      console.error('Error fetching real stats:', error);
      setRealStats({ completedQuizzes: 0, averageScore: 0, streak: 0 });
    }
  }, [user?.id]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id || profileData) return;

    try {
      setProfileLoading(true);
      const { data: profile, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        throw error;
      }

      let userData;
      if (profile) {
        userData = profile;
      } else {
        const { data: newProfile, error: createError } = await supabase.from('users').insert({
          id: user.id, email: user.email, name: user.email?.split('@')[0] || 'User',
          avatar_url: 'https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg',
          role: user.email === 'ishanstc123@gmail.com' ? 'admin' : 'user',
        }).select().single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        userData = newProfile;
      }

      if (userData) {
        const refCode = generateRefCode(userData.id, userData.created_at);
        const newProfileData = {
          id: userData.id, email: userData.email, name: userData.name,
          avatar_url: userData.avatar_url || 'https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg',
          progress: realStats,
          refCode, created_at: userData.created_at,
        };

        setProfileData(newProfileData);
        setEditForm({ name: userData.name });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (defaultProfileData) {
        setProfileData(defaultProfileData);
        setEditForm({ name: defaultProfileData.name });
      }
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, user?.email, generateRefCode, defaultProfileData, profileData, realStats]);

  useEffect(() => {
    if (user?.id && !profileData && !profileLoading) {
      fetchProfile();
      fetchRealStats();
    }
  }, [user?.id, profileData, profileLoading, fetchProfile, fetchRealStats]);

  useEffect(() => {
    if (user && !profileData && !profileLoading && defaultProfileData) {
      const updatedDefaultData = {
        ...defaultProfileData,
        progress: realStats
      };
      setProfileData(updatedDefaultData);
      setEditForm({ name: defaultProfileData.name });
    }
  }, [user, profileData, profileLoading, defaultProfileData, realStats]);

  const handleCopyRefCode = useCallback(async () => {
    if (!profileData?.refCode) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileData.refCode);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = profileData.refCode;
        tempInput.style.position = 'fixed';
        tempInput.style.left = '-999999px';
        tempInput.style.top = '-999999px';
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setCopied(true);
      toast.success('Reference code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy reference code');
    }
  }, [profileData?.refCode]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id || !profileData) {
      toast.error('User not authenticated');
      return;
    }

    if (!editForm.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase.from('users').update({
        name: editForm.name.trim(), updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      setProfileData(prev => prev ? {
        ...prev, name: editForm.name.trim(),
      } : prev);

      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  }, [user?.id, profileData, editForm]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !profileData) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600', upsert: false
      });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast.error('Failed to upload image. Please contact administrator.');
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('users').update({
        avatar_url: publicUrl, updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      if (updateError) {
        console.error('Error updating avatar:', updateError);
        toast.error('Failed to update profile picture');
        await supabase.storage.from('avatars').remove([filePath]);
        return;
      }

      setProfileData(prev => prev ? { ...prev, avatar_url: publicUrl, } : prev);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [user?.id, profileData]);

  const bottomNavItems = useMemo(() => [
    { id: 'home', name: 'Home', icon: faHome }, { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss }, { id: 'notifications', name: 'Notifications', icon: faBell },
    { id: 'profile', name: 'Profile', icon: faUser },
  ], []);

  const sectionVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 15, stiffness: 100, staggerChildren: 0.08, }, },
  }), []);

  const AnimateOnScrollDiv: React.FC<{ children: React.ReactNode, delay?: number, className?: string }> = useCallback(({ children, delay = 0, className }) => {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1, });

    return (
      <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={sectionVariants} className={className}>
        {children}
      </motion.div>
    );
  }, [sectionVariants]);

  if (profileLoading && !profileData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayData = profileData || defaultProfileData;

  if (!displayData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 pb-24">
        <AnimateOnScrollDiv className="relative">
          <Card className="p-8 text-center bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-60">
              <motion.div initial={{ x: -100, y: -100, scale: 0.5 }} animate={{ x: 100, y: 100, scale: 1.2, rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute top-0 left-0 w-48 h-48 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl animate-blob">
              </motion.div>
              <motion.div initial={{ x: 100, y: 100, scale: 0.7 }} animate={{ x: -100, y: -100, scale: 1.3, rotate: -360 }}
                transition={{ repeat: Infinity, duration: 18, ease: "linear", delay: 2 }}
                className="absolute bottom-0 right-0 w-40 h-40 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000">
              </motion.div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative inline-block mb-4 group">
                <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto relative overflow-hidden ring-4 ring-blue-300/60 shadow-lg bg-gray-100">
                  <img src={displayData.avatar_url} alt="Profile" className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg';
                    }} />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <motion.button whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-700 transition-colors duration-200 ring-2 ring-white disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Change profile picture">
                  {uploading ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : <FontAwesomeIcon icon={faCamera} className="w-5 h-5" />}
                </motion.button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {isEditing ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 w-full">
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-center text-gray-700 placeholder-gray-400 focus:ring-3 focus:ring-blue-400 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="Your name" maxLength={50} />
                  <div className="flex space-x-3 justify-center">
                    <Button size="sm" onClick={handleSaveProfile}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-full shadow-md transform hover:scale-105 transition-transform"
                      disabled={!editForm.name.trim()}>
                      <FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditForm({ name: displayData.name });
                    }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full shadow-sm transform hover:scale-105 transition-transform">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{displayData.name || displayData.email}</h2>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsEditing(true)}
                      className="text-gray-500 hover:text-blue-600 transition-colors" aria-label="Edit profile">
                      <FontAwesomeIcon icon={faEdit} className="w-5 h-5" />
                    </motion.button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-2" />
                    {displayData.email}
                  </p>
                </>
              )}

              <div className="flex items-center justify-center space-x-2 mb-6">
                <motion.div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200 shadow-inner"
                  whileHover={{ scale: 1.02 }}>
                  <span className="text-sm font-semibold text-blue-700">REF CODE - {displayData.refCode}</span>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopyRefCode}
                    className="text-blue-600 hover:text-blue-800 transition-colors" aria-label="Copy reference code">
                    {copied ? <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-green-500" /> : <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />}
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </Card>
        </AnimateOnScrollDiv>

        {/* Stats Cards */}
        <AnimateOnScrollDiv>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: faTrophy, count: realStats.completedQuizzes, label: 'Completed', color: 'yellow' },
              { icon: Target, count: `${realStats.averageScore}%`, label: 'Average', color: 'green' },
              { icon: faFire, count: realStats.streak, label: 'Streak', color: 'red' }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="text-center p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg"
              >
                {stat.icon === Target ? (
                  <Target className={`w-6 h-6 text-${stat.color}-600 mx-auto mb-2`} />
                ) : (
                  <FontAwesomeIcon icon={stat.icon} className={`w-6 h-6 text-${stat.color}-600 mx-auto mb-2`} />
                )}
                <p className={`text-lg font-bold text-${stat.color}-600`}>{stat.count}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </AnimateOnScrollDiv>

        {/* Settings and Features Section */}
        <AnimateOnScrollDiv>
          <div className="mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={faCog} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Settings & More</h3>
                    <p className="text-sm text-gray-600">Coming Soon</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20"
                />
              </div>
            
              <div className="space-y-4">
                {/* Primary Actions */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow border border-gray-200">
                        <FontAwesomeIcon icon={faCog} className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">App Settings</h4>
                        <p className="text-sm text-gray-600">Notifications, privacy & preferences</p>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-2xl border border-green-200/50 hover:border-green-300/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow border border-gray-200">
                        <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">Performance Analytics</h4>
                        <p className="text-sm text-gray-600">Track your learning progress</p>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 rounded-2xl border border-purple-200/50 hover:border-purple-300/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow border border-gray-200">
                        <FontAwesomeIcon icon={faHistory} className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">Activity History</h4>
                        <p className="text-sm text-gray-600">View your quiz attempts & scores</p>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">Support & Resources</span>
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-2xl border border-orange-200/50 hover:border-orange-300/50 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow mb-3">
                      <FontAwesomeIcon icon={faQuestionCircle} className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Help Center</h4>
                    <p className="text-xs text-gray-600 text-center leading-tight">Get support & FAQs</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-2xl border border-teal-200/50 hover:border-teal-300/50 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow mb-3">
                      <FontAwesomeIcon icon={faDownload} className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Export Data</h4>
                    <p className="text-xs text-gray-600 text-center leading-tight">Download your data</p>
                  </motion.button>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <FontAwesomeIcon icon={faBell} className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Member since</p>
                        <p className="text-xs text-gray-600">
                          {displayData.created_at ? new Date(displayData.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                          }) : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Account Status</p>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-xs text-green-600 font-medium">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimateOnScrollDiv>

        <AnimateOnScrollDiv>
          <Button variant="outline"
            className="w-full text-red-600 border-red-300 hover:bg-red-50/70 hover:border-red-400 rounded-full py-3 text-base shadow-md active:scale-98 transition-transform mt-6"
            onClick={signOut}>
            <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </AnimateOnScrollDiv>
      </div>

      {/* Bottom Navigation with Animation */}
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
                }`}>
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.4, ease: "easeOut", type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={faCog} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">App Settings</h3>
                    <p className="text-sm text-gray-600">Customize your experience</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200">
                      <FontAwesomeIcon icon={faBell} className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                      <p className="text-xs text-gray-600">Get notified about new content</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-6 bg-blue-600 rounded-full relative shadow-inner">
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-lg"
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-200/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                      <FontAwesomeIcon icon={faMoon} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Dark Mode</p>
                      <p className="text-xs text-gray-600">Switch to dark theme</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-6 bg-gray-300 rounded-full relative shadow-inner">
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-lg"
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                      <FontAwesomeIcon icon={faLanguage} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Language</p>
                      <p className="text-xs text-gray-600">Choose your preferred language</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm">English</span>
                    <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4 text-gray-400" />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
                      <FontAwesomeIcon icon={faShieldAlt} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Privacy & Security</p>
                      <p className="text-xs text-gray-600">Manage your privacy settings</p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-400" />
                </motion.div>

              </div>
              
              {/* App Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4, ease: "easeOut" }}
                className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200/50"
              >
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">Tecnology A/L Premium</h4>
                  <p className="text-xs text-gray-600 mb-3">Version 2.0.0 • Professional Learning Platform</p>
                
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};