import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/Button';
import { Quiz, QuizSession, QuizResponse } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface QuizInterfaceProps {
  quiz: Quiz;
  onComplete: (session: QuizSession) => void;
  onExit: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onComplete, onExit }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  // Initialize quiz session
  const startQuiz = useCallback(() => {
    const newSession: QuizSession = {
      quiz,
      currentQuestionIndex: 0,
      responses: [],
      startTime: new Date(),
      timeRemaining: quiz.timeLimit * 60,
      isCompleted: false,
    };
    setSession(newSession);
    setTimeRemaining(newSession.timeRemaining);
    setShowStartScreen(false);
    setSelectedAnswer(null);
  }, [quiz]);

  // Timer effect
  useEffect(() => {
    if (!session || session.isCompleted || showStartScreen) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, showStartScreen]);

  const handleTimeUp = useCallback(() => {
    if (!session) return;
    
    if (selectedAnswer !== null) {
      handleNextQuestion();
    }
    
    const completedSession: QuizSession = {
      ...session,
      isCompleted: true,
      timeRemaining: 0,
    };
    setSession(completedSession);
    onComplete(completedSession);
    toast.error('Time\'s up! Paper submitted automatically.');
  }, [session, selectedAnswer, onComplete]);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (!session || selectedAnswer === null) return;

    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const response: QuizResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent: 30,
    };

    const updatedResponses = [...session.responses, response];
    
    if (session.currentQuestionIndex < session.quiz.questions.length - 1) {
      setSession({
        ...session,
        currentQuestionIndex: session.currentQuestionIndex + 1,
        responses: updatedResponses,
      });
      setSelectedAnswer(null);
    } else {
      const completedSession: QuizSession = {
        ...session,
        responses: updatedResponses,
        isCompleted: true,
        timeRemaining,
      };
      setSession(completedSession);
      onComplete(completedSession);
    }
  };

  const handleSubmitQuiz = () => {
    if (!session || selectedAnswer === null) return;

    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const response: QuizResponse = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent: 30,
    };

    const updatedResponses = [...session.responses, response];
    
    const completedSession: QuizSession = {
      ...session,
      responses: updatedResponses,
      isCompleted: true,
      timeRemaining,
    };
    setSession(completedSession);
    onComplete(completedSession);
  };

  const handlePreviousQuestion = () => {
    if (!session || session.currentQuestionIndex === 0) return;
    
    // Get the previous response if it exists
    const previousResponseIndex = session.currentQuestionIndex - 1;
    const previousResponse = session.responses[previousResponseIndex];
    
    // Remove the current question's response if we're going back
    const updatedResponses = session.responses.slice(0, session.currentQuestionIndex);
    
    setSession({
      ...session,
      currentQuestionIndex: session.currentQuestionIndex - 1,
      responses: updatedResponses,
    });
    
    // Set the previous answer if it exists
    setSelectedAnswer(previousResponse?.selectedAnswer ?? null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExit = () => {
    if (session && !session.isCompleted) {
      setShowConfirmExit(true);
    } else {
      onExit();
    }
  };

  const confirmExit = () => {
    setShowConfirmExit(false);
    onExit();
  };

  const handleImageClick = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setShowImageModal(true);
  };

  if (showStartScreen) {
    const introduction = quiz.introduction || {
      title: 'උපදේශ පත්‍රකාව',
      subtitle: 'Paper Introduction',
      instructions: [
        'නිවැරදි පිළිතුර ලබා දෙන්න.',
        'මුලු ප්‍රශ්න ගණන 50 කි.',
        'ප්‍රශ්නයට (1) (2) (3) (4) (5) යන පිළිතුරු වලින් පිළිතුර තෝරාගෙන, එය අසලින් ලබාදී ඇති Dot (⦿) සලකුණ Click කරන්න.'
      ],
      buttonText: 'Start'
    };

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full"
        >
          <div className="p-6 text-left bg-white border border-gray-200 rounded-3xl shadow-lg relative overflow-hidden">
            <button
              onClick={onExit}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <h1 className="text-xl font-bold text-gray-900 mb-4 font-sinhala pr-8">
              {introduction.title}
            </h1>

            <div className="w-full h-px bg-gray-200 mb-4"></div>

            <h2 className="text-lg font-semibold text-gray-700 mb-4 font-sinhala">
              {introduction.subtitle}
            </h2>

            <div className="space-y-3 mb-6">
              {introduction.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0">⦿</div>
                  <p className="text-sm text-gray-700 font-sinhala leading-relaxed">
                    {instruction}
                  </p>
                </div>
              ))}
            </div>

            <Button 
              onClick={startQuiz} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 text-base font-semibold font-sinhala shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {introduction.buttonText}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session) return null;

  const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
  const isLastQuestion = session.currentQuestionIndex === session.quiz.questions.length - 1;

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Close Button */}
      <div className="px-4 py-4">
        <button
          onClick={handleExit}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={session.currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Question Number */}
            <div className="text-center">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                Question {session.currentQuestionIndex + 1} of {session.quiz.questions.length}
              </span>
            </div>

            {/* Question Image - Only show if exists */}
            {currentQuestion.imageUrl && (
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="Question illustration" 
                  className="w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(currentQuestion.imageUrl!)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Question Text */}
            <div className="px-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-6">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.slice(0, 5).map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-2xl transition-all duration-200 ${
                    selectedAnswer === index
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 text-gray-600'
                    }`}>
                      {String.fromCharCode(49 + index)}
                    </div>
                    <span className="text-base font-medium text-gray-900 flex-1">
                      {option}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedAnswer === index && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-white rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePreviousQuestion}
            disabled={session.currentQuestionIndex === 0}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </motion.button>

          {isLastQuestion ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitQuiz}
              disabled={selectedAnswer === null}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Paper</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Timer Display - Floating */}
      <div className="fixed top-20 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className={`font-mono font-bold text-sm ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-full max-h-full"
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={modalImageUrl}
                alt="Full size question image"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={() => setShowImageModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Exit Modal */}
      <AnimatePresence>
        {showConfirmExit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 text-amber-500 mx-auto mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Exit Paper?</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your progress will be lost if you exit now. Are you sure?
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmExit(false)}
                    className="flex-1"
                    size="sm"
                  >
                    Continue Paper
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmExit}
                    className="flex-1"
                    size="sm"
                  >
                    Exit Paper
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};