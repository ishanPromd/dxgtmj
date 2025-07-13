import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Clock, UserPlus, LogIn, ArrowLeft, Shield, CheckCircle, Sparkles, Zap, Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import toast, { Toaster } from 'react-hot-toast';

export const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signUp, resetPassword, loading, isRateLimited, rateLimitedUntil } = useAuth();

  // Countdown timer for rate limiting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (rateLimitedUntil) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
        setCountdown(remaining);
        
        if (remaining <= 0) {
          setCountdown(0);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setCountdown(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rateLimitedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showForgotPassword) {
      // Handle password reset
      if (!email) {
        toast.error('Please enter your email address');
        return;
      }

      // Check rate limiting
      if (isRateLimited && countdown > 0) {
        toast.error(`Please wait ${countdown} seconds before trying again`);
        return;
      }

      const result = await resetPassword(email);
      if (!result.error) {
        setEmailSent(true);
        // Don't reset form immediately, show success state
      }
      return;
    }

    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Check rate limiting
    if (isRateLimited && countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before trying again`);
      return;
    }

    if (isSignUp) {
      if (!name) {
        toast.error('Please enter your name');
        return;
      }
      const result = await signUp(email, password, name);
      if (!result.error) {
        // Switch to sign in mode after successful signup
        setIsSignUp(false);
        setPassword(''); // Clear password for security
        toast.success('Account created successfully! You can now sign in with your credentials.');
      }
    } else {
      const result = await signIn(email, password);
      // If sign in fails with invalid credentials for demo accounts, suggest creating the account
      if (result.error && result.error.message.includes('Invalid login credentials')) {
        if (email === 'ishanstc123@gmail.com' || email === 'demo@example.com') {
          toast.error('Demo account not found. Click "Create Demo Account" to set it up first.', {
            duration: 5000,
          });
        }
      }
    }
  };

  const resetForm = () => {
    setShowForgotPassword(false);
    setEmailSent(false);
    setEmail('');
    setPassword('');
    setName('');
  };

  const isFormDisabled = loading || (isRateLimited && countdown > 0);

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl"
          />
          <motion.div
            animate={{
              x: [0, -150, 0],
              y: [0, 100, 0],
              rotate: [0, -180, -360],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1/3 right-20 w-32 h-32 bg-purple-200/30 rounded-full blur-xl"
          />
          <motion.div
            animate={{
              x: [0, 80, 0],
              y: [0, -80, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-20 left-1/4 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl"
          />
        </div>

        {/* Mobile-first design */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full relative z-10">
          
          {/* Enhanced Illustration Section */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            {/* Custom illustration */}
            <div className="relative w-64 h-48 mx-auto mb-6">
              {/* Background circle with gradient */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-full opacity-80"
              />
              
              {/* Phone mockup */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="absolute top-8 left-1/2 transform -translate-x-1/2 w-24 h-40 bg-slate-800 rounded-2xl shadow-2xl"
              >
                <div className="w-full h-full bg-white rounded-2xl m-1 p-2 flex flex-col">
                  {/* Phone screen content */}
                  <div className="flex-1 bg-gradient-to-b from-blue-50 to-white rounded-xl p-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded mb-2"
                    />
                    <div className="space-y-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ delay: 1, duration: 0.3 }}
                        className="h-1 bg-gray-200 rounded"
                      />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '50%' }}
                        transition={{ delay: 1.2, duration: 0.3 }}
                        className="h-1 bg-gray-200 rounded"
                      />
                    </div>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.5, duration: 0.4, type: "spring" }}
                      className="mt-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Decorative elements */}
              <motion.div 
                initial={{ opacity: 0, rotate: -20 }}
                animate={{ opacity: 1, rotate: 12 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute top-4 right-8 w-12 h-16 bg-white rounded-lg shadow-xl transform opacity-90"
              >
                <div className="p-2">
                  <div className="w-full h-1 bg-gray-200 rounded mb-1"></div>
                  <div className="w-2/3 h-1 bg-gray-200 rounded mb-1"></div>
                  <div className="w-full h-1 bg-gray-200 rounded"></div>
                </div>
              </motion.div>

              {/* Security shield */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, duration: 0.4, type: "spring" }}
                className="absolute bottom-4 left-8 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl"
              >
                <Shield className="w-5 h-5 text-white" />
              </motion.div>

              {/* Floating sparkles */}
              <motion.div
                animate={{ y: [-5, 5, -5], rotate: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 left-4 text-yellow-400"
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <motion.div
                animate={{ y: [5, -5, 5], rotate: [360, 180, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-2 right-2 text-purple-400"
              >
                <Star className="w-3 h-3" />
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2"
            >
              {showForgotPassword 
                ? 'Reset Password' 
                : isSignUp 
                ? 'Join Tecnology A/L' 
                : 'Welcome Back'
              }
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="text-slate-600 text-sm leading-relaxed"
            >
              {showForgotPassword 
                ? 'Enter your email address and we\'ll send you a secure password reset link to get back into your account'
                : isSignUp 
                ? "Create your premium account and unlock advanced learning features" 
                : "Sign in to access your premium learning dashboard"
              }
            </motion.p>
          </motion.div>

          {/* Rate limit warning */}
          <AnimatePresence>
            {isRateLimited && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Rate Limited
                    </p>
                    <p className="text-sm text-amber-700">
                      Please wait {countdown} seconds before trying again
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 relative overflow-hidden"
          >
            {/* Form background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-3xl"></div>
            
            <div className="relative z-10">
              {/* Back button for forgot password */}
              <AnimatePresence>
                {showForgotPassword && (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    type="button"
                    onClick={resetForm}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors mb-6 group"
                    disabled={isFormDisabled}
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Sign In</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Success state for password reset */}
              <AnimatePresence>
                {emailSent && showForgotPassword && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      We've sent a password reset link to <strong>{email}</strong>
                    </p>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Back to Sign In
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form fields */}
              <AnimatePresence>
                {!emailSent && (
                  <motion.form 
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {isSignUp && !showForgotPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400"
                            placeholder="Enter your full name"
                            required={isSignUp}
                            disabled={isFormDisabled}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400"
                          placeholder="example@gmail.com"
                          required
                          disabled={isFormDisabled}
                        />
                        {email && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {!showForgotPassword && (
                      <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-16 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400"
                            placeholder="••••••••"
                            required
                            disabled={isFormDisabled}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
                            disabled={isFormDisabled}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {!isSignUp && (
                          <div className="text-right mt-2">
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              disabled={isFormDisabled}
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      loading={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isFormDisabled || !email || (!showForgotPassword && (!password || (isSignUp && !name)))}
                    >
                      {loading 
                        ? (showForgotPassword 
                            ? 'Sending Reset Link...' 
                            : isSignUp 
                            ? 'Creating Account...' 
                            : 'Signing In...'
                          ) 
                        : countdown > 0 
                        ? `Wait ${countdown}s`
                        : (showForgotPassword 
                            ? 'Send Reset Link' 
                            : isSignUp 
                            ? 'Create Account' 
                            : 'Sign In'
                          )
                      }
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {!showForgotPassword && !emailSent && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isFormDisabled}
                    >
                      {isSignUp ? 'Sign In here' : 'Sign Up here'}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};