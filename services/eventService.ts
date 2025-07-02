import { supabase } from '../lib/supabase';

export interface Event {
  id: string;
  title: string;
  time: string;
  location: string;
  category: string;
  attendingFriends: string[];
  attendingCount: number;
  coverImage: string;
  description: string;
}

export interface Attendee {
  id: string;
  eventId: string;
  userId: string;
  avatarUrl: string;
  createdAt: string;
}

export const eventService = {
  // Fetch all events
  async getEvents(): Promise<Event[]> {
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        time, 
        location, 
        category,
        attending_count,
        cover_image,
        description,
        created_at
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching events', error);
      return [];
    }
    
    // Fetch attending friends' avatars for each event
    const eventsWithAttendees = await Promise.all(
      events.map(async (event) => {
        const { data: attendees } = await supabase
          .from('attendees')
          .select('avatar_url')
          .eq('event_id', event.id)
          .limit(5);
        
        return {
          id: event.id,
          title: event.title,
          time: event.time,
          location: event.location,
          category: event.category,
          attendingCount: event.attending_count,
          coverImage: event.cover_image,
          description: event.description,
          attendingFriends: attendees?.map(a => a.avatar_url) || []
        };
      })
    );
    
    return eventsWithAttendees;
  },
  
  // Get a single event by ID
  async getEventById(id: string): Promise<Event | null> {
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        time, 
        location, 
        category,
        attending_count,
        cover_image,
        description
      `)
      .eq('id', id)
      .single();
    
    if (error || !event) {
      console.error('Error fetching event', error);
      return null;
    }
    
    // Get attendees
    const { data: attendees } = await supabase
      .from('attendees')
      .select('avatar_url')
      .eq('event_id', id)
      .limit(5);
    
    return {
      id: event.id,
      title: event.title,
      time: event.time,
      location: event.location,
      category: event.category,
      attendingCount: event.attending_count,
      coverImage: event.cover_image,
      description: event.description,
      attendingFriends: attendees?.map(a => a.avatar_url) || []
    };
  },
  
  // Create a new event
  async createEvent(event: Omit<Event, 'id' | 'attendingFriends' | 'attendingCount'>): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: event.title,
        time: event.time,
        location: event.location,
        category: event.category,
        cover_image: event.coverImage,
        description: event.description,
        attending_count: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating event', error);
      return null;
    }
    
    return {
      ...data,
      attendingFriends: [],
      attendingCount: 0,
      coverImage: data.cover_image
    };
  },
  
  // Check if user is attending an event
  async isAttending(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return false;
    }
    
    return Boolean(data);
  },
  
  // RSVP to an event
  async rsvpToEvent(eventId: string, userId: string, avatarUrl: string): Promise<boolean> {
    // Check if already attending
    const isAlreadyAttending = await this.isAttending(eventId, userId);
    
    if (isAlreadyAttending) {
      return true;
    }
    
    // Add user to event attendees
    const { error } = await supabase
      .from('attendees')
      .insert({
        event_id: eventId,
        user_id: userId,
        avatar_url: avatarUrl
      });
    
    if (error) {
      console.error('Error adding attendee', error);
      return false;
    }
    
    return true;
  },
  
  // Cancel RSVP to an event
  async cancelRsvp(eventId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error canceling RSVP', error);
      return false;
    }
    
    return true;
  }
}; 