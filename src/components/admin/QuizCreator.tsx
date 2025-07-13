import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, X, Trash2, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface QuizCreatorProps {
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
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onClose }) => {
  const { papers, addQuiz } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    paperId: '',
    timeLimit: 30,
    passingScore: 70,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 1,
    difficulty: 'medium',
  });

  // Updated categories to only include SFT, ET, ICT
  const categories = [
    'SFT',
    'ET',
    'ICT',
  ];

  const steps = [
    { title: 'Quiz Details', description: 'Basic information about the quiz' },
    { title: 'Add Questions', description: 'Create questions for your quiz' },
    { title: 'Review & Save', description: 'Review and save your quiz' },
  ];

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
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1,
      difficulty: 'medium',
    });
    toast.success('Question added successfully!');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.success('Question removed');
  };

  const handleSaveQuiz = async () => {
    if (!quizData.title || !quizData.description || !quizData.category) {
      toast.error('Please fill in all quiz details');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const result = await addQuiz({
        title: quizData.title,
        description: quizData.description,
        category: quizData.category,
        difficulty: quizData.difficulty,
        timeLimit: quizData.timeLimit,
        passingScore: quizData.passingScore,
        paperId: quizData.paperId || undefined,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points,
          difficulty: q.difficulty,
        })),
      }, user.id);

      if (!result.error) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0) {
      if (!quizData.title || !quizData.description || !quizData.category) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Quiz</h2>
                <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-2">
                    <p className={`text-sm font-medium ${
                      index <= currentStep ? 'text-primary-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={quizData.title}
                      onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={quizData.category}
                      onChange={(e) => setQuizData({ ...quizData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe what this quiz covers"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      value={quizData.timeLimit}
                      onChange={(e) => setQuizData({ ...quizData, timeLimit: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                      max="180"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      value={quizData.passingScore}
                      onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={quizData.difficulty}
                      onChange={(e) => setQuizData({ ...quizData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link to Paper (Optional)
                  </label>
                  <select
                    value={quizData.paperId}
                    onChange={(e) => setQuizData({ ...quizData, paperId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">No linked paper</option>
                    {papers.map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.title} ({paper.year})
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Question Form */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Question</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <textarea
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={2}
                        placeholder="Enter your question"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Options *
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder={`Option ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Select the correct answer by clicking the radio button</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={currentQuestion.explanation}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          rows={2}
                          placeholder="Explain why this is the correct answer"
                        />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points
                          </label>
                          <input
                            type="number"
                            value={currentQuestion.points}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            min="1"
                            max="10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Difficulty
                          </label>
                          <select
                            value={currentQuestion.difficulty}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Questions ({questions.length})
                    </h3>
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  Question {index + 1}
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
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{question.question}</p>
                              <div className="text-xs text-gray-500">
                                Correct Answer: {question.options[question.correctAnswer]}
                              </div>
                            </div>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
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
                className="space-y-6"
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Title:</span> {quizData.title}</p>
                        <p><span className="font-medium">Category:</span> {quizData.category}</p>
                        <p><span className="font-medium">Difficulty:</span> {quizData.difficulty}</p>
                        <p><span className="font-medium">Description:</span> {quizData.description}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Settings</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Time Limit:</span> {quizData.timeLimit} minutes</p>
                        <p><span className="font-medium">Passing Score:</span> {quizData.passingScore}%</p>
                        <p><span className="font-medium">Total Questions:</span> {questions.length}</p>
                        <p><span className="font-medium">Total Points:</span> {questions.reduce((sum, q) => sum + q.points, 0)}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions Preview</h3>
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border-l-4 border-primary-500 pl-4">
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
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{question.question}</p>
                        <div className="text-xs text-gray-500">
                          Correct Answer: {question.options[question.correctAnswer]}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSaveQuiz}
                  loading={loading}
                  disabled={questions.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};