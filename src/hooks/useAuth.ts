import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, signInWithEmail, signUpWithEmail, signOut as supabaseSignOut } from '../lib/supabase';
import { clearAuthTokens } from '../lib/supabase-setup';
import { User } from '../types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ishanstc123@gmail.com';

  useEffect(() => {
    console.log('useAuth: Starting initialization');
    
    // Set a shorter timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('useAuth: Loading timeout reached (10s), setting loading to false');
      setLoading(false);
    }, 10000); // Reduced to 10 seconds

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('useAuth: Getting initial session');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
            console.log('useAuth: Clearing corrupted auth tokens');
            clearAuthTokens();
            await supabase.auth.signOut();
          }
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }

        console.log('useAuth: Session found:', !!session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        clearAuthTokens();
      } finally {
        console.log('useAuth: Setting loading to false');
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('useAuth: Auth state changed:', event, !!session);
        clearTimeout(loadingTimeout);
        
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('useAuth: Token refresh failed, clearing auth');
          clearAuthTokens();
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        clearAuthTokens();
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [ADMIN_EMAIL]);

  // Check if currently rate limited
  const isRateLimited = () => {
    if (!rateLimitedUntil) return false;
    const now = Date.now();
    if (now >= rateLimitedUntil) {
      setRateLimitedUntil(null);
      return false;
    }
    return true;
  };

  // Extract rate limit duration from error message
  const extractRateLimitDuration = (message: string): number => {
    const match = message.match(/(\d+)\s*seconds?/i);
    return match ? parseInt(match[1]) * 1000 : 60000; // Default to 60 seconds
  };

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('useAuth: Fetching user profile for:', authUser.id);
      
      // Create a simple user object first
      const simpleUser: User = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
        role: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        progress: {
          totalQuizzes: 0,
          completedQuizzes: 0,
          totalScore: 0,
          averageScore: 0,
          streak: 0,
          badgesEarned: [],
        },
        preferences: {
          notifications: true,
          difficulty: 'medium',
          subjects: [],
        },
      };

      console.log('useAuth: Setting user:', simpleUser);
      setUser(simpleUser);

      // Try to enhance with database data (non-blocking)
      setTimeout(async () => {
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.log('useAuth: Database query error (non-critical):', error);
            await createUserProfile(authUser, simpleUser);
            return;
          }

          if (profile) {
            console.log('useAuth: Enhanced user with database data');
            setUser(prev => prev ? { 
              ...prev, 
              name: profile.name || prev.name,
              email: profile.email || prev.email,
              role: profile.role || prev.role,
            } : simpleUser);
          } else {
            console.log('useAuth: No profile found, creating one');
            await createUserProfile(authUser, simpleUser);
          }
        } catch (dbError) {
          console.log('useAuth: Database enhancement failed (non-critical):', dbError);
          await createUserProfile(authUser, simpleUser);
        }
      }, 100);

    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Still set a basic user to prevent loading loop
      setUser({
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
        role: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
        progress: {
          totalQuizzes: 0,
          completedQuizzes: 0,
          totalScore: 0,
          averageScore: 0,
          streak: 0,
          badgesEarned: [],
        },
        preferences: {
          notifications: true,
          difficulty: 'medium',
          subjects: [],
        },
      });
    }
  };

  const createUserProfile = async (authUser: SupabaseUser, simpleUser: User) => {
    try {
      console.log('useAuth: Creating user profile in database');
      
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
          role: authUser.email === ADMIN_EMAIL ? 'admin' : 'user',
          avatar_url: 'https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg',
        })
        .select()
        .single();

      if (userError && !userError.message.includes('duplicate key')) {
        console.error('Error creating user profile:', userError);
        return;
      }

      console.log('useAuth: User profile created successfully');
      
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('useAuth: Attempting sign in for:', email);
      
      // Check if rate limited
      if (isRateLimited()) {
        const remainingTime = Math.ceil((rateLimitedUntil! - Date.now()) / 1000);
        toast.error(`Please wait ${remainingTime} seconds before trying again`);
        return { error: new Error('Rate limited') };
      }

      // Clear any existing corrupted tokens before signing in
      clearAuthTokens();

      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        
        // Handle rate limiting
        if (error.message.includes('too many requests') || error.message.includes('rate_limit')) {
          const duration = extractRateLimitDuration(error.message);
          setRateLimitedUntil(Date.now() + duration);
          const seconds = Math.ceil(duration / 1000);
          toast.error(`Too many attempts. Please wait ${seconds} seconds before trying again`);
          return { error };
        }
        
        // Handle email confirmation error specifically
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          toast.error('Your email address needs to be confirmed. Please check your email inbox and click the confirmation link, then try signing in again');
          return { error };
        }
        
        // More specific error handling
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          toast.error('Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
        } else {
          toast.error(`Sign in failed: ${error.message}`);
        }
        return { error };
      }
      
      console.log('useAuth: Sign in successful');
      toast.success('Successfully signed in!');
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('An unexpected error occurred during sign in');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log('useAuth: Attempting sign up for:', email);
      
      // Check if rate limited
      if (isRateLimited()) {
        const remainingTime = Math.ceil((rateLimitedUntil! - Date.now()) / 1000);
        toast.error(`Please wait ${remainingTime} seconds before trying again`);
        return { error: new Error('Rate limited') };
      }

      const { error, data } = await signUpWithEmail(email, password, { name });
      
      if (error) {
        console.error('Sign up error:', error);
        
        // Handle rate limiting specifically
        if (error.message.includes('over_email_send_rate_limit') || error.message.includes('rate_limit')) {
          const duration = extractRateLimitDuration(error.message);
          setRateLimitedUntil(Date.now() + duration);
          const seconds = Math.ceil(duration / 1000);
          toast.error(`Too many sign-up attempts. Please wait ${seconds} seconds before trying again`);
          return { error };
        }
        
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('An account with this email already exists. Please sign in instead or use "Forgot Password?" if you need to reset your password');
        } else if (error.message.includes('Password should be at least')) {
          toast.error('Password must be at least 6 characters long');
        } else if (error.message.includes('Unable to validate email address')) {
          toast.error('Please enter a valid email address');
        } else {
          toast.error(`Sign up failed: ${error.message}`);
        }
        return { error };
      }
      
      console.log('useAuth: Sign up successful', data);
      
      // Check if user was created successfully and if email confirmation is required
      if (data.user && !data.session) {
        toast.success('Account created! Please check your email for a confirmation link before signing in');
      } else if (data.user && data.session) {
        toast.success('Account created successfully! You are now signed in');
      } else {
        toast.success('Account created! You can now sign in');
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('An unexpected error occurred during sign up');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      console.log('useAuth: Attempting password reset for:', email);
      
      // Check if rate limited
      if (isRateLimited()) {
        const remainingTime = Math.ceil((rateLimitedUntil! - Date.now()) / 1000);
        toast.error(`Please wait ${remainingTime} seconds before trying again`);
        return { error: new Error('Rate limited') };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        
        // Handle rate limiting
        if (error.message.includes('too many requests') || error.message.includes('rate_limit')) {
          const duration = extractRateLimitDuration(error.message);
          setRateLimitedUntil(Date.now() + duration);
          const seconds = Math.ceil(duration / 1000);
          toast.error(`Too many reset attempts. Please wait ${seconds} seconds before trying again`);
          return { error };
        }
        
        if (error.message.includes('Unable to validate email address')) {
          toast.error('Please enter a valid email address');
        } else if (error.message.includes('For security purposes')) {
          // Supabase returns this message even for non-existent emails for security
          toast.success('If an account with this email exists, you will receive a password reset link shortly');
          return { error: null };
        } else {
          toast.error(`Password reset failed: ${error.message}`);
        }
        return { error };
      }
      
      console.log('useAuth: Password reset email sent');
      toast.success('Password reset link sent! Please check your email inbox and follow the instructions to reset your password');
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred while sending the password reset email');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('useAuth: Signing out');
      clearAuthTokens(); // Clear tokens before signing out
      const { error } = await supabaseSignOut();
      if (error) {
        toast.error(error.message);
      } else {
        setUser(null);
        toast.success('Successfully signed out!');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const isAdmin = user?.role === 'admin';

  console.log('useAuth: Current state - user:', !!user, 'loading:', loading, 'isAdmin:', isAdmin);

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
    isRateLimited: isRateLimited(),
    rateLimitedUntil,
  };
};