import { supabase } from '../lib/supabase';

export const slugService = {
  // Generate a unique slug for events
  async generateEventSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data } = await supabase
        .from('events')
        .select('id')
        .eq('shareable_slug', slug)
        .single();
      
      if (!data) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  },

  // Generate a unique slug for profiles
  async generateProfileSlug(username: string, displayName?: string): Promise<string> {
    const baseSlug = (username || displayName || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('shareable_slug', slug)
        .single();
      
      if (!data) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  },

  // Get event by slug
  async getEventBySlug(slug: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        time, 
        event_date,
        location, 
        category,
        cover_image,
        description,
        created_at,
        creator_id,
        visibility,
        shareable_slug
      `)
      .eq('shareable_slug', slug)
      .single();
    
    return { data, error };
  },

  // Get profile by slug
  async getProfileBySlug(slug: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        social_handles,
        shareable_slug
      `)
      .eq('shareable_slug', slug)
      .single();
    
    return { data, error };
  },

  // Helper method to update event slug in database
  async updateEventSlug(eventId: string, slug: string) {
    const { error } = await supabase
      .from('events')
      .update({ shareable_slug: slug })
      .eq('id', eventId);
    
    if (error) throw error;
  },

  // Helper method to update profile slug in database
  async updateProfileSlug(profileId: string, slug: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ shareable_slug: slug })
      .eq('id', profileId);
    
    if (error) throw error;
  }
};
