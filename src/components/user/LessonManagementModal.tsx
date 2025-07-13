import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Plus, Trash2, Edit, Image, Link } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

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
  videos: any[];
}

interface LessonManagementModalProps {
  subject: Subject;
  onClose: () => void;
  onSave: (subject: Subject) => void;
}

export const LessonManagementModal: React.FC<LessonManagementModalProps> = ({
  subject,
  onClose,
  onSave,
}) => {
  const [editedSubject, setEditedSubject] = useState<Subject>({ ...subject });
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson({ ...lesson });
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;

    if (!editingLesson.title.trim() || !editingLesson.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setEditedSubject(prev => ({
      ...prev,
      lessons: prev.lessons.map(lesson =>
        lesson.id === editingLesson.id ? editingLesson : lesson
      )
    }));

    setEditingLesson(null);
    toast.success('Lesson updated successfully!');
  };

  const handleAddLesson = () => {
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: 'New Lesson',
      description: 'Enter lesson description',
      subjectId: subject.id,
      thumbnailUrl: 'https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg',
      videoCount: 0,
      videos: [],
    };

    setEditedSubject(prev => ({
      ...prev,
      lessons: [...prev.lessons, newLesson],
      lessonCount: prev.lessons.length + 1
    }));
    setEditingLesson(newLesson);
  };

  const handleDeleteLesson = (lessonId: string) => {
    const lesson = editedSubject.lessons.find(l => l.id === lessonId);
    if (lesson && lesson.videoCount > 0) {
      toast.error('Cannot delete lesson with existing videos');
      return;
    }

    if (window.confirm('Are you sure you want to delete this lesson?')) {
      setEditedSubject(prev => ({
        ...prev,
        lessons: prev.lessons.filter(l => l.id !== lessonId),
        lessonCount: prev.lessons.length - 1
      }));
      toast.success('Lesson deleted successfully!');
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // Validate all lessons
      for (const lesson of editedSubject.lessons) {
        if (!lesson.title.trim() || !lesson.description.trim()) {
          toast.error(`Please complete all fields for ${lesson.title || 'unnamed lesson'}`);
          setLoading(false);
          return;
        }
      }

      onSave(editedSubject);
      onClose();
    } catch (error) {
      console.error('Error saving lessons:', error);
      toast.error('Failed to save lessons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-gradient-to-r ${subject.color.replace('500', '100').replace('600', '200')} rounded-lg flex items-center justify-center`}>
                <span className="text-lg">{subject.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage {subject.name} Lessons</h2>
                <p className="text-sm text-gray-600">Add and organize lessons for this subject</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add New Lesson Button */}
          <div className="mb-6">
            <Button
              onClick={handleAddLesson}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Lesson
            </Button>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editedSubject.lessons.map((lesson) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faBookOpen} className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                      <p className="text-sm text-gray-600">{lesson.videoCount} videos</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditLesson(lesson)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={lesson.videoCount > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{lesson.description}</p>

                {lesson.thumbnailUrl && (
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    className="w-full h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Lesson+Image';
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Edit Lesson Modal */}
        {editingLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Edit Lesson</h3>
                  <button
                    onClick={() => setEditingLesson(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={editingLesson.title}
                    onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lesson title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={editingLesson.description}
                    onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter lesson description"
                  />
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Image className="w-4 h-4 inline mr-1" />
                    Thumbnail Image URL
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={editingLesson.thumbnailUrl || ''}
                        onChange={(e) => setEditingLesson({ ...editingLesson, thumbnailUrl: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  {editingLesson.thumbnailUrl && (
                    <div className="mt-2">
                      <img
                        src={editingLesson.thumbnailUrl}
                        alt="Lesson preview"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                  <div className={`bg-gradient-to-r ${subject.color.replace('500', '100').replace('600', '200')} rounded-2xl p-4`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faBookOpen} className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{editingLesson.title}</h4>
                        <p className="text-sm text-gray-600">{editingLesson.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditingLesson(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveLesson}
                    disabled={!editingLesson.title.trim() || !editingLesson.description.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Lesson
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              loading={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};