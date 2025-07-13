import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Plus, Trash2, Edit, Image, Link, Palette } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlask, faCog, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
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
}

interface SubjectManagementModalProps {
  subjects: Subject[];
  onClose: () => void;
  onSave: (subjects: Subject[]) => void;
}

export const SubjectManagementModal: React.FC<SubjectManagementModalProps> = ({
  subjects,
  onClose,
  onSave,
}) => {
  const [editedSubjects, setEditedSubjects] = useState<Subject[]>([...subjects]);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    { name: 'Green', value: 'from-green-500 to-emerald-600', preview: 'bg-gradient-to-r from-green-500 to-emerald-600' },
    { name: 'Blue', value: 'from-blue-500 to-indigo-600', preview: 'bg-gradient-to-r from-blue-500 to-indigo-600' },
    { name: 'Orange', value: 'from-orange-500 to-amber-600', preview: 'bg-gradient-to-r from-orange-500 to-amber-600' },
    { name: 'Purple', value: 'from-purple-500 to-violet-600', preview: 'bg-gradient-to-r from-purple-500 to-violet-600' },
    { name: 'Pink', value: 'from-pink-500 to-rose-600', preview: 'bg-gradient-to-r from-pink-500 to-rose-600' },
    { name: 'Teal', value: 'from-teal-500 to-cyan-600', preview: 'bg-gradient-to-r from-teal-500 to-cyan-600' },
    { name: 'Red', value: 'from-red-500 to-pink-600', preview: 'bg-gradient-to-r from-red-500 to-pink-600' },
    { name: 'Indigo', value: 'from-indigo-500 to-purple-600', preview: 'bg-gradient-to-r from-indigo-500 to-purple-600' },
  ];

  const iconOptions = [
    { name: 'Science', value: '🔬', icon: faFlask },
    { name: 'Engineering', value: '⚙️', icon: faCog },
    { name: 'Technology', value: '💻', icon: faGraduationCap },
    { name: 'Book', value: '📚' },
    { name: 'Atom', value: '⚛️' },
    { name: 'Gear', value: '🔧' },
    { name: 'Circuit', value: '🔌' },
    { name: 'Microscope', value: '🔬' },
    { name: 'Calculator', value: '🧮' },
    { name: 'Lightbulb', value: '💡' },
    { name: 'Rocket', value: '🚀' },
    { name: 'Globe', value: '🌍' },
  ];

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject({ ...subject });
  };

  const handleSaveSubject = () => {
    if (!editingSubject) return;

    if (!editingSubject.name.trim() || !editingSubject.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setEditedSubjects(prev =>
      prev.map(subject =>
        subject.id === editingSubject.id ? editingSubject : subject
      )
    );

    setEditingSubject(null);
    toast.success('Subject updated successfully!');
  };

  const handleAddSubject = () => {
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: 'New Subject',
      description: 'Enter subject description',
      icon: '📚',
      color: 'from-gray-500 to-slate-600',
      imageUrl: 'https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg',
      lessonCount: 0,
    };

    setEditedSubjects(prev => [...prev, newSubject]);
    setEditingSubject(newSubject);
  };

  const handleDeleteSubject = (subjectId: string) => {
    const subject = editedSubjects.find(s => s.id === subjectId);
    if (subject && subject.lessonCount > 0) {
      toast.error('Cannot delete subject with existing lessons');
      return;
    }

    if (window.confirm('Are you sure you want to delete this subject?')) {
      setEditedSubjects(prev => prev.filter(s => s.id !== subjectId));
      toast.success('Subject deleted successfully!');
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // Validate all subjects
      for (const subject of editedSubjects) {
        if (!subject.name.trim() || !subject.description.trim()) {
          toast.error(`Please complete all fields for ${subject.name || 'unnamed subject'}`);
          setLoading(false);
          return;
        }
      }

      onSave(editedSubjects);
      onClose();
    } catch (error) {
      console.error('Error saving subjects:', error);
      toast.error('Failed to save subjects');
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Edit className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage Subjects</h2>
                <p className="text-sm text-gray-600">Customize learning subjects and categories</p>
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
          {/* Add New Subject Button */}
          <div className="mb-6">
            <Button
              onClick={handleAddSubject}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Subject
            </Button>
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editedSubjects.map((subject) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${subject.color.replace('500', '100').replace('600', '200')} rounded-full flex items-center justify-center text-lg`}>
                      {subject.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-600">{subject.lessonCount} lessons</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSubject(subject)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={subject.lessonCount > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{subject.description}</p>

                {subject.imageUrl && (
                  <img
                    src={subject.imageUrl}
                    alt={subject.name}
                    className="w-full h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Subject+Image';
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Edit Subject Modal */}
        {editingSubject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Edit Subject</h3>
                  <button
                    onClick={() => setEditingSubject(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      value={editingSubject.name}
                      onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter subject name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Icon
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {iconOptions.map((iconOption) => (
                        <button
                          key={iconOption.value}
                          onClick={() => setEditingSubject({ ...editingSubject, icon: iconOption.value })}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            editingSubject.icon === iconOption.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg">{iconOption.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={editingSubject.description}
                    onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter subject description"
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-1" />
                    Color Theme
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        onClick={() => setEditingSubject({ ...editingSubject, color: colorOption.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          editingSubject.color === colorOption.value
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-full h-8 rounded-md ${colorOption.preview} mb-2`}></div>
                        <span className="text-xs font-medium text-gray-700">{colorOption.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Image className="w-4 h-4 inline mr-1" />
                    Subject Image URL
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={editingSubject.imageUrl || ''}
                        onChange={(e) => setEditingSubject({ ...editingSubject, imageUrl: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  {editingSubject.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={editingSubject.imageUrl}
                        alt="Subject preview"
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
                  <div className={`bg-gradient-to-r ${editingSubject.color.replace('500', '100').replace('600', '200')} rounded-2xl p-4`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-lg shadow-lg">
                        {editingSubject.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{editingSubject.name}</h4>
                        <p className="text-sm text-gray-600">{editingSubject.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditingSubject(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSubject}
                    disabled={!editingSubject.name.trim() || !editingSubject.description.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Subject
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