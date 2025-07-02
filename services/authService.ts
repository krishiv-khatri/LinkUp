import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  statusType?: string;
  isOutOfTown?: boolean;
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email,
      username: profile?.username,
      displayName: profile?.display_name,
      avatarUrl: profile?.avatar_url,
      status: profile?.status,
      statusType: profile?.status_type,
      isOutOfTown: profile?.is_out_of_town
    };
  },
  
  // Sign up a new user
  async signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    if (!data.user) {
      return { user: null, error: 'Failed to create user' };
    }
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      error: null
    };
  },
  
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    if (!data.user) {
      return { user: null, error: 'Failed to sign in' };
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username,
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
        status: profile?.status,
        statusType: profile?.status_type,
        isOutOfTown: profile?.is_out_of_town
      },
      error: null
    };
  },
  
  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  },
  
  // Update user profile
  async updateProfile(profile: Partial<User>): Promise<{ success: boolean; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const updates = {
      ...(profile.username && { username: profile.username }),
      ...(profile.displayName && { display_name: profile.displayName }),
      ...(profile.avatarUrl && { avatar_url: profile.avatarUrl }),
      ...(profile.status && { status: profile.status }),
      ...(profile.statusType && { status_type: profile.statusType }),
      ...(profile.isOutOfTown !== undefined && { is_out_of_town: profile.isOutOfTown }),
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  }
}; 