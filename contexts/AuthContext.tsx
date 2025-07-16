import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { authService, User } from '../services/authService';

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (profile: Partial<User>) => Promise<{ success: boolean; error: string | null }>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  signIn: async () => ({ error: 'Not implemented' }),
  signUp: async () => ({ error: 'Not implemented' }),
  signOut: async () => ({ error: 'Not implemented' }),
  updateProfile: async () => ({ success: false, error: 'Not implemented' }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already signed in
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user, error } = await authService.signIn(email, password);
      
      if (error) {
        return { error };
      }
      
      setUser(user);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user, error } = await authService.signUp(email, password);
      
      if (error) {
        return { error };
      }
      
      // Set the user state immediately after successful sign-up
      // This ensures the user context is available for the onboarding flow
      if (user) {
        setUser(user);
      }
      
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await authService.signOut();
      
      if (!error) {
        setUser(null);
      }
      
      return { error };
    } catch (error) {
      return { error: (error as Error).message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profile: Partial<User>) => {
    try {
      const result = await authService.updateProfile(profile);
      
      if (result.success && user) {
        // Update the user state with the new profile information
        setUser({
          ...user,
          ...profile,
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 