import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
  status_type?: string;
  is_out_of_town?: boolean;
}

export const userService = {
  // Search users by display name or username
  async searchUsers(query: string, currentUserId: string, limit: number = 20): Promise<UserProfile[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status, status_type, is_out_of_town')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .neq('id', currentUserId) // Exclude current user
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    // Add null checks to prevent undefined errors
    return (data || []).filter(user => user && user.id);
  },

  // Get user's friends list
  async getUserFriends(userId: string): Promise<UserProfile[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        sender:profiles!friends_user_id_fkey(id, username, display_name, avatar_url, status, status_type, is_out_of_town),
        receiver:profiles!friends_friend_id_fkey(id, username, display_name, avatar_url, status, status_type, is_out_of_town)
      `)
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }

    // Extract the friend profile (not the current user) with null checks
    const friends: UserProfile[] = [];
    
    (data || []).forEach((friendship: any) => {
      if (!friendship) return;
      
      const friend = friendship.user_id === userId ? friendship.receiver : friendship.sender;
      if (!friend || !friend.id) return;

      friends.push({
        id: friend.id,
        username: friend.username,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
        status: friend.status,
        status_type: friend.status_type,
        is_out_of_town: friend.is_out_of_town,
      });
    });

    return friends;
  },

  // Get all users excluding current user (for fallback)
  async getAllUsers(currentUserId: string, limit: number = 50): Promise<UserProfile[]> {
    if (!currentUserId) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status, status_type, is_out_of_town')
      .neq('id', currentUserId)
      .limit(limit)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    // Add null checks
    return (data || []).filter(user => user && user.id);
  },

  // Get user profile by ID
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, status, status_type, is_out_of_town')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }
}; 