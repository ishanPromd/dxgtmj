import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faFileText, faRss, faBell, faUser, faPlay, faSignOutAlt,
  faChevronDown, faBookOpen, faPlus, faEdit, faTrash, faArrowLeft, faArrowUp, faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { PlyrPlayer } from '../user/PlyrPlayer';
import { VideoUploadModal } from '../user/VideoUploadModal';
import { SubjectManagementModal } from './SubjectManagementModal';
import { LessonManagementModal } from '../user/LessonManagementModal';
import { VideoEditModal } from './VideoEditModal';
import { extractVideoId, extractVideoDurationFromEmbed, getYouTubeThumbnail } from '../../utils/youtube';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Fast Blue Loading Line Component
const LoadingLine: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <AnimatePresence>
    {isLoading && (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        exit={{ width: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="absolute bg-black/20 rounded-full pointer-events-none z-40"
        style={{
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
      />
    )}
  </AnimatePresence>
);

interface AdminFeedPageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
  onPlayerModalToggle?: (isOpen: boolean) => void;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  imageUrl?: string;
  lessonCount: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  thumbnailUrl?: string;
  videoCount: number;
  videos: LessonVideo[];
}

interface LessonVideo {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url: string;
  duration: string;
  lessonId: string;
  subjectId: string;
  created_at: string;
  position?: number;
}

// Custom Loading Component
const CustomLoader: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="loader mb-4"></div>
      <p className="text-gray-600">Loading Admin Lessons...</p>
      <style jsx>{`
        .loader {
          width: fit-content;
          font-size: 40px;
          font-family: monospace;
          font-weight: bold;
          text-transform: uppercase;
          color: #0000;
          -webkit-text-stroke: 1px #000;
          --g: conic-gradient(#000 0 0) no-repeat text;
          background: var(--g) 0, var(--g) 1ch, var(--g) 2ch, var(--g) 3ch, var(--g) 4ch, var(--g) 5ch, var(--g) 6ch;
          animation: l17-0 1s linear infinite alternate, l17-1 2s linear infinite;
        }
        .loader:before {
          content: "Loading";
        }
        @keyframes l17-0 {
          0% { background-size: 1ch 0; }
          100% { background-size: 1ch 100%; }
        }
        @keyframes l17-1 {
          0%, 50% { background-position-y: 100%, 0; }
          50.01%, to { background-position-y: 0, 100%; }
        }
      `}</style>
    </div>
  </div>
);

export const AdminFeedPage: React.FC<AdminFeedPageProps> = ({ onNavigate, activeTab, onPlayerModalToggle }) => {
  const { lessons, addLesson, deleteLesson } = useData();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState<LessonVideo | null>(null);
  const [showSubjectManagement, setShowSubjectManagement] = useState(false);
  const [showLessonManagement, setShowLessonManagement] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentView, setCurrentView] = useState<'subjects' | 'lessons' | 'videos'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState<Set<string>>(new Set());

  // Load subjects from database
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      
      // Load subjects from database
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: true });

      if (subjectsError) {
        console.error('Error loading subjects:', subjectsError);
        // Use default subjects if database doesn't exist
        setSubjects(getDefaultSubjects());
        setLoading(false);
        return;
      }

      // Load lessons for each subject
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('subject_lessons')
        .select('*')
        .order('created_at', { ascending: true });

      if (lessonsError) {
        console.error('Error loading lessons:', lessonsError);
      }

      // Load videos for each lesson
      const { data: videosData, error: videosError } = await supabase
        .from('lesson_videos')
        .select('*')
        .order('position', { ascending: true });

      if (videosError) {
        console.error('Error loading videos:', videosError);
      }

      // Organize data into hierarchical structure
      const organizedSubjects = (subjectsData || getDefaultSubjects()).map(subject => {
        const subjectLessons = (lessonsData || [])
          .filter(lesson => lesson.subject_id === subject.id)
          .map(lesson => {
            const lessonVideos = (videosData || [])
              .filter(video => video.lesson_id === lesson.id)
              .map((video, index) => ({
                id: video.id,
                title: video.title,
                description: video.description,
                youtube_url: video.youtube_url,
                thumbnail_url: video.thumbnail_url,
                duration: video.duration,
                lessonId: lesson.id,
                subjectId: subject.id,
                created_at: video.created_at,
                position: video.position || index
              }));

            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              subjectId: subject.id,
              thumbnailUrl: lesson.thumbnail_url,
              videoCount: lessonVideos.length,
              videos: lessonVideos.sort((a, b) => (a.position || 0) - (b.position || 0))
            };
          });

        return {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          icon: subject.icon,
          color: subject.color,
          imageUrl: subject.image_url,
          lessonCount: subjectLessons.length,
          lessons: subjectLessons
        };
      });

      setSubjects(organizedSubjects);
    } catch (error) {
      console.error('Error loading data:', error);
      setSubjects(getDefaultSubjects());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSubjects = (): Subject[] => [
    {
      id: 'sft',
      name: 'SFT',
      description: 'Science for Technology - Core scientific principles',
      icon: '🔬',
      color: 'from-green-500 to-emerald-600',
      imageUrl: 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg',
      lessonCount: 0,
      lessons: []
    },
    {
      id: 'et',
      name: 'ET',
      description: 'Engineering Technology - Applied engineering concepts',
      icon: '⚙️',
      color: 'from-orange-500 to-amber-600',
      imageUrl: 'https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg',
      lessonCount: 0,
      lessons: []
    },
    {
      id: 'ict',
      name: 'ICT',
      description: 'Information & Communication Technology',
      icon: '💻',
      color: 'from-blue-500 to-indigo-600',
      imageUrl: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
      lessonCount: 0,
      lessons: []
    }
  ];

  const openVideo = (video: LessonVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
    onPlayerModalToggle?.(true);
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    onPlayerModalToggle?.(false);
  };

  const handleContainerClick = (id: string, action: () => void) => {
    setLoadingContainers(prev => new Set(prev).add(id));
    
    setTimeout(() => {
      setLoadingContainers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      action();
    }, 1500);
  };

  const handleAddVideo = async (videoData: any) => {
    if (!selectedLesson || !selectedSubject) {
      toast.error('Please select a lesson first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lesson_videos')
        .insert({
          title: videoData.title,
          description: videoData.description,
          youtube_url: videoData.youtubeUrl,
          thumbnail_url: videoData.thumbnailUrl,
          duration: videoData.duration,
          lesson_id: selectedLesson.id,
          subject_id: selectedSubject.id,
          position: selectedLesson.videos.length,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding video:', error);
        toast.error('Failed to add video to database');
        return;
      }

      toast.success('Video added successfully!');
      await loadSubjects(); // Reload data
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video');
    }
  };

  const handleEditVideo = (video: LessonVideo) => {
    setEditingVideo(video);
    setShowVideoEdit(true);
  };

  const handleUpdateVideo = async (videoData: any) => {
    if (!editingVideo) return;

    try {
      const { error } = await supabase
        .from('lesson_videos')
        .update({
          title: videoData.title,
          description: videoData.description,
          youtube_url: videoData.youtubeUrl,
          thumbnail_url: videoData.thumbnailUrl,
          duration: videoData.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingVideo.id);

      if (error) {
        console.error('Error updating video:', error);
        toast.error('Failed to update video');
        return;
      }

      toast.success('Video updated successfully!');
      await loadSubjects(); // Reload data
      setShowVideoEdit(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    }
  };

  const handleMoveVideo = async (videoId: string, direction: 'up' | 'down') => {
    if (!selectedLesson) return;

    const videos = [...selectedLesson.videos];
    const currentIndex = videos.findIndex(v => v.id === videoId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= videos.length) return;

    // Swap positions
    [videos[currentIndex], videos[newIndex]] = [videos[newIndex], videos[currentIndex]];

    try {
      // Update positions in database
      for (let i = 0; i < videos.length; i++) {
        await supabase
          .from('lesson_videos')
          .update({ position: i })
          .eq('id', videos[i].id);
      }

      toast.success('Video position updated!');
      await loadSubjects(); // Reload data
    } catch (error) {
      console.error('Error updating video position:', error);
      toast.error('Failed to update video position');
    }
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('lessons');
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentView('videos');
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    setCurrentView('subjects');
  };

  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setCurrentView('lessons');
  };

  const handleSubjectUpdate = async (updatedSubjects: Subject[]) => {
    try {
      // Update subjects in database
      for (const subject of updatedSubjects) {
        const { error } = await supabase
          .from('subjects')
          .upsert({
            id: subject.id,
            name: subject.name,
            description: subject.description,
            icon: subject.icon,
            color: subject.color,
            image_url: subject.imageUrl,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error updating subject:', error);
          toast.error(`Failed to update subject ${subject.name}: ${error.message}`);
          return;
        }
      }

      toast.success('Subjects updated successfully!');
      await loadSubjects(); // Reload to get fresh data
    } catch (error) {
      console.error('Error updating subjects:', error);
      toast.error('Failed to update subjects');
    }
  };

  const handleLessonUpdate = async (updatedSubject: Subject) => {
    try {
      // Update lessons in database
      for (const lesson of updatedSubject.lessons) {
        const { error } = await supabase
          .from('subject_lessons')
          .upsert({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            subject_id: updatedSubject.id,
            thumbnail_url: lesson.thumbnailUrl,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error updating lesson:', error);
          toast.error(`Failed to update lesson ${lesson.title}: ${error.message}`);
          return;
        }
      }

      toast.success('Lessons updated successfully!');
      await loadSubjects(); // Reload to get fresh data
    } catch (error) {
      console.error('Error updating lessons:', error);
      toast.error('Failed to update lessons');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        const { error } = await supabase
          .from('lesson_videos')
          .delete()
          .eq('id', videoId);

        if (error) {
          console.error('Error deleting video:', error);
          toast.error('Failed to delete video');
          return;
        }

        toast.success('Video deleted successfully!');
        await loadSubjects(); // Reload data
      } catch (error) {
        console.error('Error deleting video:', error);
        toast.error('Failed to delete video');
      }
    }
  };

  const bottomNavItems = [
    { id: 'home', name: 'Home', icon: faHome }, 
    { id: 'recent', name: 'Papers', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'notifications', name: 'Notifications', icon: faBell },
    { id: 'profile', name: 'Profile', icon: faUser },
  ];

  if (loading) {
    return <CustomLoader />;
  }

  // Subject view
  if (currentView === 'subjects') {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full px-4 py-6 pb-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-700 p-4 text-white mb-6"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-3">Tecnology A/L Content Management</h2>
                  <p className="text-purple-100 text-sm">Professional content administration</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={signOut}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs px-3 py-1.5"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="w-3 h-3 mr-1" />
                  Sign Out
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-sm px-4 py-2"
                  onClick={() => setShowSubjectManagement(true)}
                >
                  <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-2" />
                  Manage Subjects
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Subject Containers */}
          <SubjectsView 
            subjects={subjects} 
            onSubjectClick={handleSubjectClick}
            loadingContainers={loadingContainers}
            onContainerClick={handleContainerClick}
          />
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation items={bottomNavItems} activeTab={activeTab} onNavigate={onNavigate} />

        {/* Modals */}
        {showSubjectManagement && (
          <SubjectManagementModal
            subjects={subjects}
            onClose={() => setShowSubjectManagement(false)}
            onSave={handleSubjectUpdate}
          />
        )}
      </div>
    );
  }

  // Lessons view
  if (currentView === 'lessons' && selectedSubject) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full px-4 py-6 pb-24">
          {/* Subject Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${selectedSubject.color} p-6 text-white mb-6`}
          >
            <button
              onClick={handleBackToSubjects}
              className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </button>
            
            <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <div className="absolute top-8 right-8 w-8 h-8 bg-white/20 rounded-full"></div>
            
            <div className="relative z-10 pt-8">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl">
                  {selectedSubject.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedSubject.name} Lessons</h2>
                  <p className="text-white/80 text-sm">{selectedSubject.lessons.length} lessons available</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowLessonManagement(true)}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  size="sm"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                  Add Lesson
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Lessons Grid */}
          <LessonsView 
            subject={selectedSubject} 
            onLessonClick={handleLessonClick}
            loadingContainers={loadingContainers}
            onContainerClick={handleContainerClick}
          />
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation items={bottomNavItems} activeTab={activeTab} onNavigate={onNavigate} />

        {/* Modals */}
        {showLessonManagement && selectedSubject && (
          <LessonManagementModal
            subject={selectedSubject}
            onClose={() => setShowLessonManagement(false)}
            onSave={handleLessonUpdate}
          />
        )}
      </div>
    );
  }

  // Videos view
  if (currentView === 'videos' && selectedLesson && selectedSubject) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full px-4 py-6 pb-24">
          {/* Lesson Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${selectedSubject.color} p-6 text-white mb-6`}
          >
            <button
              onClick={handleBackToLessons}
              className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </button>
            
            <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full"></div>
            <div className="absolute top-8 right-8 w-8 h-8 bg-white/20 rounded-full"></div>
            
            <div className="relative z-10 pt-8">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl">
                  <FontAwesomeIcon icon={faPlay} className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedLesson.title}</h2>
                  <p className="text-white/80 text-sm">{selectedLesson.videos.length} videos available</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowVideoUpload(true)}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  size="sm"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                  Add Video
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Videos Grid */}
          <AdminVideosView 
            lesson={selectedLesson} 
            onVideoClick={openVideo}
            onEditVideo={handleEditVideo}
            onDeleteVideo={handleDeleteVideo}
            onMoveVideo={handleMoveVideo}
            loadingContainers={loadingContainers}
            onContainerClick={handleContainerClick}
          />
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation items={bottomNavItems} activeTab={activeTab} onNavigate={onNavigate} />

        {/* Modals */}
        {showVideoUpload && (
          <VideoUploadModal
            onClose={() => setShowVideoUpload(false)}
            onSubmit={handleAddVideo}
            defaultCategory={selectedSubject.name}
          />
        )}

        {showVideoEdit && editingVideo && (
          <VideoEditModal
            video={editingVideo}
            onClose={() => {
              setShowVideoEdit(false);
              setEditingVideo(null);
            }}
            onSubmit={handleUpdateVideo}
          />
        )}

        {/* Plyr Video Player Modal */}
        <AnimatePresence>
          {showVideoPlayer && selectedVideo && (
            <PlyrPlayer
              videoUrl={selectedVideo.youtube_url}
              title={selectedVideo.title}
              onClose={closeVideoPlayer}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
};

// Subjects View Component with Ripple Effect
const SubjectsView: React.FC<{ 
  subjects: Subject[]; 
  onSubjectClick: (subject: Subject) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subjects, onSubjectClick, loadingContainers, onContainerClick }) => {
  // Ripple Effect Hook
  const useRipple = () => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

    const createRipple = (event: React.MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now() + Math.random();

      setRipples(prev => [...prev, { x, y, id }]);

      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 800);
    };

    return { ripples, createRipple };
  };

  // Ripple Component
  const RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }> = ({ ripples }) => (
    <>
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute bg-black/20 rounded-full pointer-events-none z-10"
          style={{
            left: ripple.x - 75,
            top: ripple.y - 75,
            width: 150,
            height: 150,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject, index) => (
        <SubjectContainer
          key={subject.id}
          subject={subject}
          index={index}
          loadingContainers={loadingContainers}
          onContainerClick={onContainerClick}
          onSubjectClick={onSubjectClick}
          useRipple={useRipple}
          RippleEffect={RippleEffect}
        />
      ))}
    </div>
  );
};

// Individual Subject Container Component
const SubjectContainer: React.FC<{
  subject: Subject;
  index: number;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
  onSubjectClick: (subject: Subject) => void;
  useRipple: () => { ripples: Array<{ x: number; y: number; id: number }>; createRipple: (event: React.MouseEvent<HTMLElement>) => void };
  RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }>;
}> = ({ subject, index, loadingContainers, onContainerClick, onSubjectClick, useRipple, RippleEffect }) => {
  const { ripples, createRipple } = useRipple();

  return (
    <div
      className={`group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer`}
      onClick={(e) => {
        createRipple(e);
        onContainerClick(subject.id, () => onSubjectClick(subject));
      }}
    >
      <RippleEffect ripples={ripples} />
      <LoadingLine isLoading={loadingContainers.has(subject.id)} />
      
      {/* Subject Image with 16:9 aspect ratio */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <img 
          src={subject.imageUrl} 
          alt={subject.name} 
          className="w-full h-full object-cover"
          onError={(e) => { 
            e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Subject'; 
          }} 
        />
        
        {/* Lesson Count Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm font-medium">
          {subject.lessonCount} Lessons
        </div>

        {/* Admin Actions */}
        <div className="absolute top-2 left-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle subject management
            }}
            className="w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors"
          >
            <FontAwesomeIcon icon={faEdit} className="w-2 h-2" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-base line-clamp-1 leading-tight">
            {subject.name}
          </h3>
        </div>

        <p className="text-gray-600 mb-3 leading-relaxed text-sm line-clamp-2">
          {subject.description}
        </p>

        {/* Meta Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`px-2 py-1 bg-gradient-to-r ${subject.color} text-white rounded-full font-semibold text-xs`}>
              {subject.name}
            </span>
            <span>{subject.lessonCount} Lessons</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lessons View Component with Ripple Effect
const LessonsView: React.FC<{ 
  subject: Subject; 
  onLessonClick: (lesson: Lesson) => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ subject, onLessonClick, loadingContainers, onContainerClick }) => {
  // Ripple Effect Hook
  const useRipple = () => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

    const createRipple = (event: React.MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now() + Math.random();

      setRipples(prev => [...prev, { x, y, id }]);

      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 800);
    };

    return { ripples, createRipple };
  };

  // Ripple Component
  const RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }> = ({ ripples }) => (
    <>
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute bg-black/20 rounded-full pointer-events-none z-10"
          style={{
            left: ripple.x - 75,
            top: ripple.y - 75,
            width: 150,
            height: 150,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {subject.lessons.map((lesson, index) => (
        <LessonContainer
          key={lesson.id}
          lesson={lesson}
          index={index}
          loadingContainers={loadingContainers}
          onContainerClick={onContainerClick}
          onLessonClick={onLessonClick}
          useRipple={useRipple}
          RippleEffect={RippleEffect}
        />
      ))}

      {subject.lessons.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faBookOpen} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Yet</h3>
          <p className="text-gray-600 text-sm mb-4">Start by adding your first lesson to this subject.</p>
        </div>
      )}
    </motion.div>
  );
};

// Individual Lesson Container Component
const LessonContainer: React.FC<{
  lesson: Lesson;
  index: number;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
  onLessonClick: (lesson: Lesson) => void;
  useRipple: () => { ripples: Array<{ x: number; y: number; id: number }>; createRipple: (event: React.MouseEvent<HTMLElement>) => void };
  RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }>;
}> = ({ lesson, index, loadingContainers, onContainerClick, onLessonClick, useRipple, RippleEffect }) => {
  const { ripples, createRipple } = useRipple();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className={`group relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer`}
      onClick={(e) => {
        createRipple(e);
        onContainerClick(lesson.id, () => onLessonClick(lesson));
      }}
    >
      <RippleEffect ripples={ripples} />
      <LoadingLine isLoading={loadingContainers.has(lesson.id)} />
      
      {/* Lesson Image with 16:9 aspect ratio */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <img 
          src={lesson.thumbnailUrl || 'https://via.placeholder.com/320x180?text=Lesson'} 
          alt={lesson.title} 
          className="w-full h-full object-cover transition-all duration-300"
          onError={(e) => { 
            e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Lesson'; 
          }} 
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Video Count Badge */}
        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm font-medium">
          {lesson.videoCount} Videos
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-lg line-clamp-2 leading-tight">
            {lesson.title}
          </h3>
        </div>

        <p className="text-gray-600 mb-4 leading-relaxed text-sm line-clamp-3">
          {lesson.description}
        </p>

        {/* Meta Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
              <span>{lesson.videoCount} Videos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
    </motion.div>
  );
};

// Admin Videos View Component with Edit Controls
const AdminVideosView: React.FC<{ 
  lesson: Lesson; 
  onVideoClick: (video: LessonVideo) => void;
  onEditVideo: (video: LessonVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  onMoveVideo: (videoId: string, direction: 'up' | 'down') => void;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
}> = ({ lesson, onVideoClick, onEditVideo, onDeleteVideo, onMoveVideo, loadingContainers, onContainerClick }) => {
  // Ripple Effect Hook
  const useRipple = () => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

    const createRipple = (event: React.MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now() + Math.random();

      setRipples(prev => [...prev, { x, y, id }]);

      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 800);
    };

    return { ripples, createRipple };
  };

  // Ripple Component
  const RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }> = ({ ripples }) => (
    <>
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute bg-black/20 rounded-full pointer-events-none z-10"
          style={{
            left: ripple.x - 75,
            top: ripple.y - 75,
            width: 150,
            height: 150,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {lesson.videos.map((video, index) => (
        <VideoContainer
          key={video.id}
          video={video}
          index={index}
          lesson={lesson}
          loadingContainers={loadingContainers}
          onContainerClick={onContainerClick}
          onVideoClick={onVideoClick}
          onEditVideo={onEditVideo}
          onDeleteVideo={onDeleteVideo}
          onMoveVideo={onMoveVideo}
          useRipple={useRipple}
          RippleEffect={RippleEffect}
        />
      ))}

      {lesson.videos.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faPlay} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Yet</h3>
          <p className="text-gray-600 text-sm mb-4">Start by adding your first video to this lesson.</p>
        </div>
      )}
    </motion.div>
  );
};

// Individual Video Container Component
const VideoContainer: React.FC<{
  video: LessonVideo;
  index: number;
  lesson: Lesson;
  loadingContainers: Set<string>;
  onContainerClick: (id: string, action: () => void) => void;
  onVideoClick: (video: LessonVideo) => void;
  onEditVideo: (video: LessonVideo) => void;
  onDeleteVideo: (videoId: string) => void;
  onMoveVideo: (videoId: string, direction: 'up' | 'down') => void;
  useRipple: () => { ripples: Array<{ x: number; y: number; id: number }>; createRipple: (event: React.MouseEvent<HTMLElement>) => void };
  RippleEffect: React.FC<{ ripples: Array<{ x: number; y: number; id: number }> }>;
}> = ({ video, index, lesson, loadingContainers, onContainerClick, onVideoClick, onEditVideo, onDeleteVideo, onMoveVideo, useRipple, RippleEffect }) => {
  const { ripples, createRipple } = useRipple();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className={`group relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer`}
      onClick={(e) => {
        createRipple(e);
        onContainerClick(video.id, () => onVideoClick(video));
      }}
    >
      <RippleEffect ripples={ripples} />
      <LoadingLine isLoading={loadingContainers.has(video.id)} />
      
      {/* Video Thumbnail with 16:9 aspect ratio */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <img 
          src={video.thumbnail_url || getYouTubeThumbnail(video.youtube_url)} 
          alt={video.title} 
          className="w-full h-full object-contain transition-all duration-300"
          onError={(e) => { 
            e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video'; 
          }} 
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm font-medium">
          {video.duration}
        </div>

        {/* Admin Actions */}
        <div className="absolute top-3 left-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditVideo(video);
            }}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors"
          >
            <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteVideo(video.id);
            }}
            className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </div>

        {/* Position Controls */}
        <div className="absolute top-3 right-3 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveVideo(video.id, 'up');
              }}
              className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center text-white transition-colors"
            >
              <FontAwesomeIcon icon={faArrowUp} className="w-2 h-2" />
            </button>
          )}
          {index < lesson.videos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveVideo(video.id, 'down');
              }}
              className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center text-white transition-colors"
            >
              <FontAwesomeIcon icon={faArrowDown} className="w-2 h-2" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-lg line-clamp-2 leading-tight">
            {video.title}
          </h3>
        </div>

        <p className="text-gray-600 mb-4 leading-relaxed text-sm line-clamp-3">
          {video.description}
        </p>

        {/* Meta Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Position: {index + 1}</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 font-medium">
            {new Date(video.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
    </motion.div>
  );
};

// Bottom Navigation Component
const BottomNavigation: React.FC<{ 
  items: Array<{ id: string; name: string; icon: any }>; 
  activeTab: string; 
  onNavigate: (tab: string) => void; 
}> = ({ items, activeTab, onNavigate }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
    <div className="w-full px-4">
      <nav className="flex justify-around py-2">
        {items.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/admin/${item.id === 'home' ? '' : item.id}`)}
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
);