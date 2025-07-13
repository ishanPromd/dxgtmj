import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Plus, Trash2, ArrowLeft, ArrowRight, Save, Image, Camera, Link, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PaperUploadProps {
  onClose: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string;
}

export const PaperUpload: React.FC<PaperUploadProps> = ({ onClose }) => {
  const { addPaper } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    year: new Date().getFullYear(),
    subject: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    description: '',
    accessLevel: 'free' as 'free' | 'premium',
    timeLimit: 60,
    passingScore: 70,
    attempts: 3,
    showAnswers: true,
    shuffleQuestions: false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    question: '',
    options: ['', '', '', '', ''], // Now 5 options
    correctAnswer: 0,
    explanation: '',
    points: 1,
    difficulty: 'medium',
    imageUrl: '',
  });

  // Updated subjects to only include SFT, ET, ICT
  const subjects = ['SFT', 'ET', 'ICT'];

  const steps = [
    { title: 'Paper Details', description: 'Basic information about the paper' },
    { title: 'Add Questions', description: 'Create questions for your paper' },
    { title: 'Review & Save', description: 'Review and save your paper' },
  ];

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
      id: Date.now().toString(),
    };

    setQuestions([...questions, newQuestion]);
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

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.success('Question removed');
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.title || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setLoading(true);
    try {
      const paperData = {
        title: formData.title,
        year: formData.year,
        subject: formData.subject,
        difficulty: formData.difficulty,
        description: formData.description,
        contentUrl: `https://example.com/${formData.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        thumbnailUrl: 'https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg',
        accessLevel: formData.accessLevel,
        parameters: {
          timeLimit: formData.timeLimit,
          passingScore: formData.passingScore,
          attempts: formData.attempts,
          showAnswers: formData.showAnswers,
          shuffleQuestions: formData.shuffleQuestions,
        },
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points,
          difficulty: q.difficulty,
          imageUrl: q.imageUrl,
        })),
      };

      const result = await addPaper(paperData, user.id);
      if (!result.error) {
        onClose();
      }
    } catch (error) {
      console.error('Error uploading paper:', error);
      toast.error('Failed to upload paper');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0) {
      if (!formData.title || !formData.subject || !formData.description) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
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
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create New Paper</h2>
                <p className="text-xs text-gray-600">{steps[currentStep].description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index <= currentStep 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-2">
                    <p className={`text-xs font-medium ${
                      index <= currentStep ? 'text-primary-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-3 ${
                      index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4">
          {currentStep === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paper Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Enter paper title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    min="2000"
                    max="2030"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  rows={3}
                  placeholder="Describe the paper content and objectives"
                  required
                />
              </div>

              {/* Parameters */}
              <Card className="p-3">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Paper Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="1"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      value={formData.passingScore}
                      onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.attempts}
                      onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Level
                    </label>
                    <select
                      value={formData.accessLevel}
                      onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as 'free' | 'premium' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.showAnswers}
                        onChange={(e) => setFormData({ ...formData, showAnswers: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Show answers after completion</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.shuffleQuestions}
                        onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Shuffle questions</span>
                    </label>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Question Form */}
              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Add Question</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question *
                    </label>
                    <textarea
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...currentQuestion.options];
                              newOptions[index] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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

              {/* Questions List */}
              {questions.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Questions ({questions.length})
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {questions.map((question, index) => (
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
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Paper Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Title:</span> {formData.title}</p>
                      <p><span className="font-medium">Subject:</span> {formData.subject}</p>
                      <p><span className="font-medium">Year:</span> {formData.year}</p>
                      <p><span className="font-medium">Difficulty:</span> {formData.difficulty}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Settings</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Time Limit:</span> {formData.timeLimit} minutes</p>
                      <p><span className="font-medium">Passing Score:</span> {formData.passingScore}%</p>
                      <p><span className="font-medium">Total Questions:</span> {questions.length}</p>
                      <p><span className="font-medium">Questions with Images:</span> {questions.filter(q => q.imageUrl).length}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Questions Preview</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border-l-4 border-primary-500 pl-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium">Q{index + 1}.</span>
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
                        {question.imageUrl && (
                          <Badge variant="primary" size="sm">
                            <Image className="w-3 h-3 mr-1" />
                            Image
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{question.question}</p>
                      <div className="text-xs text-gray-500">
                        Correct Answer: {question.options[question.correctAnswer]}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                size="sm"
              >
                Cancel
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  size="sm"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={questions.length === 0}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Paper
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};