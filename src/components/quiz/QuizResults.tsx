import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Target, Clock, CheckCircle, XCircle, Star, RotateCcw, Home, TrendingUp, Medal, Award, Brain
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { QuizSession } from '../../types';

interface QuizResultsProps {
  session: QuizSession;
  onRetry: () => void;
  onHome: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ session, onRetry, onHome }) => {
  const { quiz, responses } = session;
  
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const totalQuestions = quiz.questions.length;
  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = responses.reduce((sum, response) => {
    const question = quiz.questions.find(q => q.id === response.questionId);
    return sum + (response.isCorrect ? (question?.points || 0) : 0);
  }, 0);
  
  const percentage = Math.round((earnedPoints / totalPoints) * 100);
  const passed = percentage >= quiz.passingScore;
  
  const timeSpent = Math.round((new Date().getTime() - session.startTime.getTime()) / 1000);
  const timeSpentMinutes = Math.floor(timeSpent / 60);
  const timeSpentSeconds = timeSpent % 60;

  const getGrade = () => {
    if (correctAnswers >= 45) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100', icon: Trophy };
    if (correctAnswers >= 40) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100', icon: Award };
    if (correctAnswers >= 35) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100', icon: Medal };
    if (correctAnswers >= 30) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Star };
    return { grade: 'S', color: 'text-red-600', bg: 'bg-red-100', icon: Target };
  };

  const grade = getGrade();
  const GradeIcon = grade.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-sm w-full"
      >
        <Card className="p-6 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl">
          {/* Header with Animation */}
    

          {/* Score Display - Mobile Optimized */}
          <div className="text-center mb-6">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.6, type: 'spring', stiffness: 150 }}
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${grade.bg} mb-3 relative`}
            >
              <div className="text-center">
                <span className={`text-2xl font-bold ${grade.color} block`}>{correctAnswers}</span>
                <span className={`text-lg font-medium ${grade.color} block`}>/ {totalQuestions}</span>
                <span className={`text-sm ${grade.color}`}>Correct</span>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-2 -right-2"
              >
                <GradeIcon className={`w-6 h-6 ${grade.color}`} />
              </motion.div>
            </motion.div>
            
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Badge variant={passed ? 'success' : 'error'} className="text-sm px-3 py-1">
                Grade: {grade.grade}
              </Badge>
              <Badge variant={passed ? 'success' : 'error'}>
                {passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
        
          </div>

          {/* Stats Grid - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 mb-6 border border-gray-100"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: CheckCircle, count: correctAnswers, label: 'Correct', color: 'green' },
                { icon: XCircle, count: totalQuestions - correctAnswers, label: 'Wrong', color: 'red' },
                { icon: Clock, count: `${timeSpentMinutes}:${timeSpentSeconds.toString().padStart(2, '0')}`, label: 'Time', color: 'blue' }
             
              ].map((stat, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                >
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600 mx-auto mb-2`} />
                  <p className={`text-lg font-bold text-${stat.color}-600`}>{stat.count}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons - Mobile Optimized */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={onHome} 
                className="text-sm py-3"
                size="sm"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button 
                onClick={onRetry}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm py-3"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
};