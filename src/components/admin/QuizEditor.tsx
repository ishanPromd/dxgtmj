import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Save, ArrowLeft, Camera, Link, Loader2, Image } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Quiz, Question } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface QuizEditorProps {
  quiz: Quiz;
  onClose: () => void;
  onSave: (updatedQuiz: Quiz) => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, onClose, onSave }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editedQuiz, setEditedQuiz] = useState<Quiz>({
    ...quiz,
    questions: [...quiz.questions]
  });
  
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    question: '',
    options: ['', '', '', '', ''], // 5 options
    correctAnswer: 0,
    explanation: '',
    points: 1,
    difficulty: 'medium',
    imageUrl: '',
  });

  // Check storage availability on component mount
  React.useEffect(() => {
    checkStorageAvailability();
  }, []);

  const checkStorageAvailability = async () => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error || !buckets?.find(b => b.name === 'question-images')) {
        setStorageAvailable(false);
        console.warn('Storage bucket not available, image upload disabled');
      }
    } catch (error) {
      setStorageAvailable(false);
      console.warn('Storage not available, image upload disabled');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setImageUploading(true);
      
      if (!storageAvailable) {
        toast.error('Image storage not configured. Please use URL input instead.');
        return null;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        if (uploadError.message.includes('Bucket not found')) {
          setStorageAvailable(false);
          toast.error('Image storage not configured. Please use URL input instead.');
        } else {
          toast.error('Failed to upload image. Please use URL input instead.');
        }
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName);

      toast.success('Image uploaded successfully!');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please use URL input instead.');
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setCurrentQuestion({ ...currentQuestion, imageUrl });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options.some(opt => !opt.trim())) {
      toast.error('Please fill in all question fields');
      return;
    }

    const newQuestion: Question = {
      ...currentQuestion,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setEditedQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setCurrentQuestion({
      id: '',
      question: '',
      options: ['', '', '', '', ''], // Reset to 5 empty options
      correctAnswer: 0,
      explanation: '',
      points: 1,
      difficulty: 'medium',
      imageUrl: '',
    });
    
    toast.success('Question added successfully!');
  };

  const removeQuestion = (questionId: string) => {
    setEditedQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    toast.success('Question removed');
  };

  const handleSaveQuiz = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (editedQuiz.questions.length === 0) {
      toast.error('Quiz must have at least one question');
      return;
    }

    setLoading(true);
    try {
      // Properly format questions for JSONB storage
      const formattedQuestions = editedQuiz.questions.map((q, index) => ({
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
        .eq('id', editedQuiz.id);

      if (error) {
        console.error('Error updating quiz:', error);
        toast.error(`Failed to update quiz: ${error.message}`);
        return;
      }

      const updatedQuiz = {
        ...editedQuiz,
        questions: formattedQuestions.map(q => ({
          ...q,
          id: q.id,
        })),
        updatedAt: new Date(),
      };

      onSave(updatedQuiz);
      toast.success('Quiz updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Quiz</h2>
                <p className="text-xs text-gray-600">{editedQuiz.title}</p>
              </div>
            </div>
            <Button
              onClick={handleSaveQuiz}
              loading={loading}
              disabled={editedQuiz.questions.length === 0}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="p-4">
          {/* Quiz Info */}
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{editedQuiz.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{editedQuiz.description}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge variant="primary" size="sm">{editedQuiz.category}</Badge>
                  <Badge variant="secondary" size="sm">{editedQuiz.difficulty}</Badge>
                  <span className="text-xs text-gray-500">{editedQuiz.timeLimit} min</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{editedQuiz.questions.length}</div>
                <div className="text-xs text-gray-600">Questions</div>
              </div>
            </div>
          </Card>

          {/* Add New Question Form */}
          <Card className="p-4 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Add New Question</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question *
                </label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Enter your question"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Image (Optional)
                </label>
                {!storageAvailable && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      Image storage not configured. Please use URL input below.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {/* Direct Upload */}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading || !storageAvailable}
                      className="flex-1"
                      size="sm"
                    >
                      {imageUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          {storageAvailable ? 'Upload Image' : 'Upload Disabled'}
                        </>
                      )}
                    </Button>
                    
                    {/* URL Input */}
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={currentQuestion.imageUrl || ''}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, imageUrl: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Or paste image URL"
                      />
                    </div>
                    
                    {currentQuestion.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion({ ...currentQuestion, imageUrl: '' })}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {currentQuestion.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Question preview"
                        className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer Options * (5 options)
                </label>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...currentQuestion.options];
                          newOptions[index] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select the correct answer by clicking the radio button</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={currentQuestion.explanation}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                    placeholder="Explain why this is the correct answer"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={currentQuestion.difficulty}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={addQuestion}
                className="w-full"
                disabled={!currentQuestion.question || currentQuestion.options.some(opt => !opt.trim())}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </Card>

          {/* Existing Questions List */}
          {editedQuiz.questions.length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Questions ({editedQuiz.questions.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {editedQuiz.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            Q{index + 1}
                          </span>
                          <Badge
                            variant={
                              question.difficulty === 'hard'
                                ? 'error'
                                : question.difficulty === 'medium'
                                ? 'warning'
                                : 'success'
                            }
                            size="sm"
                          >
                            {question.difficulty}
                          </Badge>
                          <Badge variant="gray" size="sm">
                            {question.points} pts
                          </Badge>
                          {question.imageUrl && (
                            <Badge variant="primary" size="sm">
                              <Image className="w-3 h-3 mr-1" />
                              Image
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{question.question}</p>
                        {question.imageUrl && (
                          <img
                            src={question.imageUrl}
                            alt="Question"
                            className="w-20 h-12 object-cover rounded border border-gray-200 mb-2"
                          />
                        )}
                        <div className="text-xs text-gray-500">
                          Correct: {question.options[question.correctAnswer]}
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
};