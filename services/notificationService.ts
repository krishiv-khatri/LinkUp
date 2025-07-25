import { supabase } from '../lib/supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
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