import { supabase } from '../lib/supabase';

export interface Event {
  id: string;
  title: string;
  time: string;
  date: string; // Add date field
  location: string;
  category: string;
  attendingFriends: string[];
  attendingCount: number;
  coverImage: string;
  description: string;
  creator_id?: string; // Add creator_id field
}

export interface Attendee {
  id: string;
  eventId: string;
  userId: string;
  avatarUrl: string;
  createdAt: string;
}

export const eventService = {
  // Fetch all events with optimized single query
  async getEvents(): Promise<Event[]> {
    // Single query to get all events
    const { data: events, error } = await supabase
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
        creator_id
      `)
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching events', error);
      return [];
    }

    if (!events || events.length === 0) {
      return [];
    }

    // Get all event IDs to fetch attendees in one query
    const eventIds = events.map(event => event.id);
    
    // Single query to get all attendees for all events
    const { data: allAttendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('event_id, avatar_url')
      .in('event_id', eventIds);
    
    if (attendeesError) {
      console.error('Error fetching attendees', attendeesError);
    }
    
    // Group attendees by event ID
    const attendeesByEvent = new Map<string, string[]>();
    allAttendees?.forEach(attendee => {
      if (!attendeesByEvent.has(attendee.event_id)) {
        attendeesByEvent.set(attendee.event_id, []);
      }
      if (attendee.avatar_url) {
        attendeesByEvent.get(attendee.event_id)!.push(attendee.avatar_url);
      }
    });
    
    // Combine events with their attendee data
    return events.map(event => {
      const attendingFriends = attendeesByEvent.get(event.id) || [];
      return {
        id: event.id,
        title: event.title,
        time: event.time,
        date: event.event_date,
        location: event.location,
        category: event.category,
        attendingCount: attendingFriends.length,
        coverImage: event.cover_image,
        description: event.description,
        attendingFriends: attendingFriends.slice(0, 5), // Limit to 5 for display
        creator_id: event.creator_id
      };
    });
  },
  
  // Get a single event by ID
  async getEventById(id: string): Promise<Event | null> {
    const { data: event, error } = await supabase
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
        creator_id
      `)
      .eq('id', id)
      .single();
    
    if (error || !event) {
      console.error('Error fetching event', error);
      return null;
    }
    
    // Get attendees and count
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('avatar_url')
      .eq('event_id', id);
    
    if (attendeesError) {
      console.error('Error fetching attendees for event', id, attendeesError);
    }
    
    const attendingFriends = attendees?.map(a => a.avatar_url) || [];
    const attendingCount = attendees?.length || 0;
    
    return {
      id: event.id,
      title: event.title,
      time: event.time,
      date: event.event_date,
      location: event.location,
      category: event.category,
      attendingCount,
      coverImage: event.cover_image,
      description: event.description,
      attendingFriends: attendingFriends.slice(0, 5), // Limit to 5 for display
      creator_id: event.creator_id
    };
  },
  
  // Create a new event
  async createEvent(event: Omit<Event, 'id' | 'attendingFriends' | 'attendingCount'> & { creator_id: string }): Promise<Event | null> {
    console.log('EventService: Creating event with data:', event);
    
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: event.title,
        time: event.time,
        event_date: event.date,
        location: event.location,
        category: event.category,
        cover_image: event.coverImage,
        description: event.description,
        creator_id: event.creator_id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating event', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create event: ${error.message}`);
    }
    
    return {
      id: data.id,
      title: data.title,
      time: data.time,
      date: data.event_date,
      location: data.location,
      category: data.category,
      attendingFriends: [],
      attendingCount: 0,
      coverImage: data.cover_image,
      description: data.description,
      creator_id: data.creator_id // Include creator_id in the returned event
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
    // Fetch RSVP user's display name or username
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', userId)
      .single();
    const rsvpUserName = userProfile?.display_name || userProfile?.username || 'Someone';
    // Send RSVP push notification to event creator
    await sendRSVPPushNotification(eventId, rsvpUserName);
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
  },
  
  // Get the current attendee count for an event
  async getAttendeeCount(eventId: string): Promise<number> {
    const { data, error } = await supabase
      .from('attendees')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId);
    
    if (error) {
      console.error('Error getting attendee count', error);
      return 0;
    }
    
    return data?.length || 0;
  },

  // Batch check user attendance for multiple events
  async batchCheckAttendance(eventIds: string[], userId: string): Promise<Record<string, boolean>> {
    if (!eventIds.length || !userId) {
      return {};
    }

    const { data, error } = await supabase
      .from('attendees')
      .select('event_id')
      .eq('user_id', userId)
      .in('event_id', eventIds);

    if (error) {
      console.error('Error checking attendance:', error);
      return {};
    }

    // Initialize all events as not attended
    const attendanceMap: Record<string, boolean> = {};
    eventIds.forEach(id => attendanceMap[id] = false);
    
    // Mark attended events as true
    data?.forEach(({ event_id }) => {
      attendanceMap[event_id] = true;
    });
    
    return attendanceMap;
  },

  // Get attendees for an event with their details
  async getAttendees(eventId: string): Promise<{ id: string; user_id: string; avatar_url: string; name?: string; created_at?: string }[]> {
    try {
      // First get attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, user_id, avatar_url, created_at')
        .eq('event_id', eventId);
      
      if (attendeesError) {
        console.error('Error getting attendees', attendeesError);
        return [];
      }

      if (!attendees || attendees.length === 0) {
        return [];
      }

      // Get user profiles for the attendees
      const userIds = attendees.map(a => a.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error getting user profiles', profilesError);
        // Return attendees without names if profile fetch fails
        return attendees.map(attendee => ({
          id: attendee.id,
          user_id: attendee.user_id,
          avatar_url: attendee.avatar_url,
          name: 'User',
          created_at: attendee.created_at,
        }));
      }

      // Combine attendees with their profile names (first name only)
      return attendees.map(attendee => {
        const profile = profiles?.find(p => p.id === attendee.user_id);
        const fullName = profile?.display_name || profile?.username || 'User';
        const firstName = fullName.split(' ')[0]; // Extract first name
        return {
          id: attendee.id,
          user_id: attendee.user_id,
          avatar_url: attendee.avatar_url,
          name: firstName,
          created_at: attendee.created_at,
        };
      });
    } catch (error) {
      console.error('Error in getAttendees:', error);
      return [];
    }
  },

  // Get events user has RSVP'd to
  async getRSVPdEvents(userId: string): Promise<Event[]> {
    try {
      // Get event IDs user has RSVP'd to
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendees')
        .select('event_id')
        .eq('user_id', userId);

      if (attendeeError) {
        console.error('Error fetching user attendees:', attendeeError);
        return [];
      }

      if (!attendeeData || attendeeData.length === 0) {
        return [];
      }

      const eventIds = attendeeData.map(a => a.event_id);
      
      // Get event details
      const { data: events, error: eventsError } = await supabase
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
          creator_id
        `)
        .in('id', eventIds)
        .order('event_date', { ascending: true });

      if (eventsError) {
        console.error('Error fetching RSVP events:', eventsError);
        return [];
      }

      // Get attendee information for each event
      const eventsWithAttendees = await Promise.all(
        events.map(async (event) => {
          const { data: attendees, error: attendeesError } = await supabase
            .from('attendees')
            .select('avatar_url')
            .eq('event_id', event.id);
          
          if (attendeesError) {
            console.error('Error fetching attendees for event', event.id, attendeesError);
          }
          
          const attendingFriends = attendees?.map(a => a.avatar_url) || [];
          const attendingCount = attendees?.length || 0;
          
          return {
            id: event.id,
            title: event.title,
            time: event.time,
            date: event.event_date,
            location: event.location,
            category: event.category,
            attendingCount,
            coverImage: event.cover_image,
            description: event.description,
            attendingFriends: attendingFriends.slice(0, 5),
            creator_id: event.creator_id
          };
        })
      );
      
      return eventsWithAttendees;
    } catch (error) {
      console.error('Error fetching RSVP events:', error);
      return [];
    }
  },

  // Delete an event
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // First check if the event exists
      const { data: existingEvent, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (checkError || !existingEvent) {
        console.error('Event not found for deletion:', eventId, checkError);
        return false;
      }

      // First, delete all attendees for this event
      const { error: attendeesError } = await supabase
        .from('attendees')
        .delete()
        .eq('event_id', eventId);
      
      if (attendeesError) {
        console.error('Error deleting attendees:', attendeesError);
        return false;
      }
      
      // Then delete the event itself
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (eventError) {
        console.error('Error deleting event:', eventError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  },

  // Update an event
  async updateEvent(eventId: string, updates: Partial<Omit<Event, 'id' | 'attendingFriends' | 'attendingCount'>>): Promise<Event | null> {
    try {
      // First check if the event exists
      const { data: existingEvent, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (checkError || !existingEvent) {
        console.error('Event not found:', eventId, checkError);
        return null;
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          title: updates.title,
          time: updates.time,
          event_date: updates.date,
          location: updates.location,
          category: updates.category,
          cover_image: updates.coverImage,
          description: updates.description
        })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating event:', error);
        return null;
      }
      
      return {
        id: data.id,
        title: data.title,
        time: data.time,
        date: data.event_date,
        location: data.location,
        category: data.category,
        attendingFriends: [],
        attendingCount: 0,
        coverImage: data.cover_image,
        description: data.description,
        creator_id: data.creator_id
      };
    } catch (error) {
      console.error('Error updating event:', error);
      return null;
    }
  }
};

/**
 * Send a push notification to all users when a new event is created.
 * @param {string} eventTitle - The title of the new event.
 * @param {string} eventId - The ID of the new event (optional, for deep linking).
 */
export async function sendNewEventPushNotification(eventTitle: string, eventId?: string) {
  // Fetch all user push tokens
  const { data: users, error } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .not('expo_push_token', 'is', null);
  if (error) {
    console.error('Error fetching user push tokens:', error);
    return;
  }
  // Send notification to each user
  for (const user of users) {
    if (!user.expo_push_token) continue;
    await fetch('https://shrxvavaoijxtivhixfk.functions.supabase.co/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${userJWT}`, // If calling from client, use user JWT
        // For server-to-server, use service role key (never in client)
      },
      body: JSON.stringify({
        to: user.expo_push_token,
        title: 'New Event!',
        body: `A new event "${eventTitle}" has just been created. Check it out!`,
        data: { type: 'new_event', eventId },
      }),
    });
  }
}

/**
 * Send a push notification to the event creator when someone RSVPs to their event.
 * @param {string} eventId - The ID of the event.
 * @param {string} rsvpUserName - The name of the user who RSVPed.
 */
export async function sendRSVPPushNotification(eventId: string, rsvpUserName: string) {
  // Fetch the event to get the creator_id
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, creator_id')
    .eq('id', eventId)
    .single();
  if (eventError || !event) {
    console.error('Error fetching event for RSVP push:', eventError);
    return;
  }
  // Fetch the creator's push token
  const { data: creator, error: creatorError } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', event.creator_id)
    .single();
  if (creatorError || !creator?.expo_push_token) {
    console.error('Error fetching creator push token:', creatorError);
    return;
  }
  // Send the push notification
  await fetch('https://shrxvavaoijxtivhixfk.functions.supabase.co/send-push-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${userJWT}`,
    },
    body: JSON.stringify({
      to: creator.expo_push_token,
      title: 'New RSVP!',
      body: `${rsvpUserName} has RSVP'ed to your event "${event.title}"!`,
      data: { type: 'rsvp', eventId },
    }),
  });
}
