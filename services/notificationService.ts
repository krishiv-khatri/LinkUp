import { supabase } from '../lib/supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_going?: boolean;
}

export const notificationService = {
  // Create a notification for event invitation
  async createEventInvitationNotification(inviteeId: string, inviterName: string, eventTitle: string, eventId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: inviteeId,
          title: 'Event Invitation',
          body: `${inviterName} invited you to ${eventTitle}`,
          data: {
            type: 'event_invitation',
            event_id: eventId,
            inviter_name: inviterName
          },
          read: false
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating event invitation notification:', error);
      return false;
    }
  },

  // Create notification for event changes (date, time, location)
  async createEventChangeNotification(
    eventId: string, 
    eventTitle: string, 
    changeType: 'date' | 'time' | 'location', 
    oldValue: string, 
    newValue: string
  ): Promise<boolean> {
    try {
      // Get event creator ID first
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event creator:', eventError);
        return false;
      }

      // Get all attendees for this event, excluding the creator
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('user_id')
        .eq('event_id', eventId)
        .neq('user_id', eventData.creator_id); // Exclude creator

      if (attendeesError) {
        console.error('Error fetching attendees for event change notification:', attendeesError);
        return false;
      }

      if (!attendees || attendees.length === 0) {
        return true; // No attendees to notify (excluding creator)
      }

      // Create notifications for all attendees (excluding creator)
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        title: 'Event Updated: Do you still want to go?',
        body: `The ${changeType} for "${eventTitle}" has been changed from ${oldValue} to ${newValue}`,
        data: {
          type: 'event_update_attendance',
          event_id: eventId,
          change_type: changeType,
          old_value: oldValue,
          new_value: newValue,
          user_id: attendee.user_id
        },
        read: false
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating event change notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating event change notification:', error);
      return false;
    }
  },

  // Create notification for event cancellation
  async createEventCancellationNotification(eventId: string, eventTitle: string): Promise<boolean> {
    try {
      // Get all attendees for this event
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('user_id')
        .eq('event_id', eventId);

      if (attendeesError) {
        console.error('Error fetching attendees for cancellation notification:', attendeesError);
        return false;
      }

      if (!attendees || attendees.length === 0) {
        return true; // No attendees to notify
      }

      // Create notifications for all attendees
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        title: 'Event Cancelled',
        body: `"${eventTitle}" has been cancelled`,
        data: {
          type: 'event_cancellation',
          event_id: eventId
        },
        read: false
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating event cancellation notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating event cancellation notification:', error);
      return false;
    }
  },

  // Get notifications for a user
  async getUserNotifications(userId: string): Promise<InAppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  },

  // Update event update notification response
  async updateEventUpdateResponse(notificationId: string, isStillGoing: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        updated_going: isStillGoing,
        read: true 
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating event update response:', error);
      return false;
    }

    return true;
  },

  // Send push notification (placeholder for now)
  async sendPushNotificationForInvitation(inviteeId: string, inviterName: string, eventTitle: string): Promise<boolean> {
    try {
      // Get user's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', inviteeId)
        .single();

      if (!profile?.expo_push_token) {
        console.log('No push token found for user:', inviteeId);
        return false;
      }

      // Send push notification using Expo's push notification service
      const message = {
        to: profile.expo_push_token,
        sound: 'default',
        title: 'Event Invitation',
        body: `${inviterName} invited you to ${eventTitle}`,
        data: {
          type: 'event_invitation',
          screen: 'notifications'
        }
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Push notification result:', result);

      return response.ok;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }
}; 