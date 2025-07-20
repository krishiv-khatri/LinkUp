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
  dateOfBirth?: string;
  socialHandles?: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    snapchat?: string;
  };
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return null;
      }
      
      if (!user) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error fetching profile:', profileError);
      }
      
      return {
        id: user.id,
        email: user.email,
        username: profile?.username,
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
        status: profile?.status,
        statusType: profile?.status_type,
        isOutOfTown: profile?.is_out_of_town,
        dateOfBirth: profile?.date_of_birth,
        socialHandles: profile?.social_handles,
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
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

    // Create or update a profile record for the new user using upsert
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't return an error here as the user was created successfully
      // The profile can be created later during onboarding
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
        isOutOfTown: profile?.is_out_of_town,
        dateOfBirth: profile?.date_of_birth,
        socialHandles: profile?.social_handles,
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
      ...(profile.dateOfBirth && { date_of_birth: profile.dateOfBirth }),
      ...(profile.socialHandles && { social_handles: profile.socialHandles }),
      updated_at: new Date().toISOString(),
    };
    
    // First, ensure the profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      // Create the profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          ...updates,
        });
        
      if (insertError) {
        return { success: false, error: insertError.message };
      }
    } else {
      // Update the existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }
    
    return { success: true, error: null };
  }
}; 