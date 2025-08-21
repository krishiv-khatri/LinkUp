import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import EventModal from '../../components/EventModal';
import FriendProfileModal from '../../components/FriendProfileModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { eventService } from '../../services/eventService';
import { notificationService } from '../../services/notificationService';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  avatar_url?: string;
  created_at: string;
  read: boolean;
  data?: any;
  updated_going?: boolean; // Added for event update notifications
}

interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  event: any;
  inviter: any;
}

function getNotificationTimes(eventDateTime: Date) {
  // Returns notification times for 1 day, 2 hours, 1 hour before
  return [
    new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000), // 1 day before
    new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000),  // 2 hours before
    new Date(eventDateTime.getTime() - 1 * 60 * 60 * 1000),  // 1 hour before
  ];
}

function formatTimeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // in seconds
  if (isNaN(date.getTime()) || !dateString) return 'now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);

  // Handler to fetch and show profile modal
  const handleShowProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, social_handles')
      .eq('id', userId)
      .single();
    setSelectedProfile(profile);
    setProfileModalVisible(true);
  };

  const loadEventInvitations = async () => {
    if (!user) return;
    
    try {
      console.log('Loading event invitations for user:', user.id);
      const invitations = await eventService.getUserInvitations(user.id);
      setEventInvitations(invitations);
    } catch (error) {
      console.error('Error loading event invitations:', error);
    }
  };

  // Function to count total unread notifications
  const getUnreadNotificationCount = () => {
    const unreadEventInvitations = eventInvitations.length; // All pending invitations are unread
    const unreadNotifications = notifications.filter(n => !n.read).length;
    return unreadEventInvitations + unreadNotifications;
  };

  const handleRespondToInvitation = async (invitationId: string, response: 'accepted' | 'declined') => {
    setRespondingToInvite(invitationId);
    try {
      const success = await eventService.respondToInvitation(invitationId, response);
      if (success) {
        toast.success(response === 'accepted' ? 'Invitation accepted!' : 'Invitation declined');
        // Remove the invitation from the list
        setEventInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        toast.error('Failed to respond to invitation');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Something went wrong');
    } finally {
      setRespondingToInvite(null);
    }
  };

  const handleViewEvent = (invitationEvent: any) => {
    // Transform the invitation event data to match EventModal expectations
    const formattedEvent = {
      id: invitationEvent?.id,
      title: invitationEvent?.title,
      time: invitationEvent?.time,
      date: invitationEvent?.event_date || invitationEvent?.date, // Handle both field names
      location: invitationEvent?.location,
      category: invitationEvent?.category,
      attendingFriends: [],
      attendingCount: 0,
      coverImage: invitationEvent?.cover_image || invitationEvent?.coverImage, // Handle both field names
      description: invitationEvent?.description,
      creator_id: invitationEvent?.creator_id,
      visibility: invitationEvent?.visibility,
    };
    
    setSelectedEvent(formattedEvent);
    setEventModalVisible(true);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      // Load event invitations
      await loadEventInvitations();
      
      // 1. Get RSVP'ed events (attending)
      const attendingEvents = await eventService.getRSVPdEvents(user.id);
      
      // 2. Get all events, filter for hosted
      const allEvents = await eventService.getEvents();
      const hosted = allEvents.filter(e => e.creator_id === user.id);
      setHostedEvents(hosted);

      // 3. Fetch database notifications
      const dbNotifications = await notificationService.getUserNotifications(user.id);
      
      // 4. Generate notifications for attended events
      let notifList: NotificationItem[] = [];

      // Event reminders for attending events
      for (const event of attendingEvents) {
        const eventDateTime = new Date(`${event.date} ${event.time}`);
        const now = new Date();
        const reminderTimes = getNotificationTimes(eventDateTime);

        reminderTimes.forEach((reminderTime, index) => {
          if (now >= reminderTime && now <= eventDateTime) {
            const timeLabels = ['tomorrow', 'in 2 hours', 'in 1 hour'];
            notifList.push({
              id: `${event.id}-reminder-${index}`,
              title: `Event Reminder`,
              body: `"${event.title}" is starting ${timeLabels[index]}!`,
              avatar_url: event.coverImage,
              created_at: reminderTime.toISOString(),
              read: false,
            });
          }
        });
      }

      // RSVP notifications for hosted events
      for (const event of hosted) {
        const attendees = await eventService.getAttendees(event.id);
        
        if (attendees.length > 0) {
          // Filter out the creator from attendees for notifications
          const nonCreatorAttendees = attendees.filter((a: any) => a.user_id !== user.id);
          
          if (nonCreatorAttendees.length === 1) {
            // Single attendee
            const attendee = nonCreatorAttendees[0];
            notifList.push({
              id: `${event.id}-rsvp-single`,
              title: `New RSVP: ${event.title}`,
              body: `${attendee.name} has RSVP'ed to your event!`,
              avatar_url: attendee.avatar_url,
              created_at: attendee.created_at || new Date().toISOString(),
              read: false,
            });
          } else if (nonCreatorAttendees.length > 1) {
            // Multiple attendees - show latest 2 and count of others
            const latest = nonCreatorAttendees.slice(-2);
            const othersCount = nonCreatorAttendees.length - 2;
            const names = latest.map((a: any) => a.name).join(', ');
            notifList.push({
              id: `${event.id}-rsvp-ig` ,
              title: `RSVP: ${event.title}`,
              body: `${names} and ${othersCount} other${othersCount > 1 ? 's' : ''} have RSVP'ed to your event!`,
              avatar_url: event.coverImage,
              created_at: latest[1]?.created_at || latest[0]?.created_at || new Date().toISOString(),
              read: false,
            });
          }
        }
      }

      // 5. Combine database notifications with generated notifications
      const dbNotificationItems: NotificationItem[] = dbNotifications.map(dbNotif => ({
        id: dbNotif.id,
        title: dbNotif.title,
        body: dbNotif.body,
        avatar_url: undefined, // Database notifications don't have avatars
        created_at: dbNotif.created_at,
        read: dbNotif.read,
        data: dbNotif.data,
        updated_going: dbNotif.updated_going, // Make sure this field is included
      }));

      console.log('Database notifications loaded:', dbNotificationItems.map(n => ({
        id: n.id,
        title: n.title,
        updated_going: n.updated_going,
        data_type: n.data?.type
      })));

      // Combine and sort all notifications
      const allNotifications = [...notifList, ...dbNotificationItems];
      allNotifications.sort((a: NotificationItem, b: NotificationItem) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Final filter to ensure no reminders or RSVP notifications for own events
      const filteredNotifList = allNotifications.filter(n => {
        // Filter event reminders
        if (n.id.includes('-reminder-') && n.body.includes('Your event')) {
          const eventId = n.id.split('-reminder-')[0];
          const event = attendingEvents.find(e => e.id === eventId);
          if (event && event.creator_id && user.id && event.creator_id.toString().trim() === user.id.toString().trim()) {
            return false;
          }
        }
        return true;
      });

      setNotifications(filteredNotifList);
      setLoading(false);

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    })();
  }, [user]);

  // Fix the sorting to have proper typing - find and fix the sort function that's causing the error
  const filteredNotifications = notifications
    .filter((n: NotificationItem) => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: NotificationItem, b: NotificationItem) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ); // Most recent at the top

  const renderEventInvitation = (invitation: EventInvitation) => {
    const event = invitation.event;
    const inviter = invitation.inviter;
    const isResponding = respondingToInvite === invitation.id;
    
    return (
      <TouchableOpacity 
        key={invitation.id} 
        style={styles.invitationCard}
        onPress={() => handleViewEvent(event)}
        activeOpacity={0.7}
      >
        <View style={styles.invitationHeader}>
          <Image 
            source={{ uri: inviter?.avatar_url || `https://api.a0.dev/assets/image?text=${inviter?.display_name?.slice(0, 1) || 'U'}&aspect=1:1&seed=${invitation.inviter_id}` }} 
            style={styles.inviterAvatar} 
          />
          <View style={styles.invitationInfo}>
            <Text style={styles.invitationTitle}>
              <Text style={styles.inviterName}>{inviter?.display_name || inviter?.username || 'Someone'}</Text>
              <Text style={styles.invitedText}> invited you to</Text>
            </Text>
            <Text style={styles.eventTitle}>{event?.title}</Text>
            <Text style={styles.invitationTime}>
              {new Date(invitation.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        
        {event?.cover_image && (
          <View style={styles.eventImageContainer}>
            <Image source={{ uri: event.cover_image }} style={styles.eventCoverImage} />
          </View>
        )}
        
        <View style={styles.eventDetails}>
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMeta}>
              📅 {new Date(event?.event_date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMeta}>🕐 {event?.time}</Text>
          </View>
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMeta}>📍 {event?.location}</Text>
          </View>
        </View>
        
        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRespondToInvitation(invitation.id, 'declined');
            }}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.declineButtonText}>Decline</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRespondToInvitation(invitation.id, 'accepted');
            }}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.acceptButtonText}>RSVP</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventUpdateNotification = (notification: NotificationItem) => {
    const isResponding = respondingToInvite === notification.id;
    const isEventUpdate = notification.data?.type === 'event_update_attendance';
    const hasResponded = notification.updated_going !== null && notification.updated_going !== undefined;
    
    console.log('Rendering event update notification:', {
      id: notification.id,
      title: notification.title,
      updated_going: notification.updated_going,
      hasResponded,
      isEventUpdate
    });
    
    // If user has already responded, show the result instead of choices
    if (hasResponded && isEventUpdate) {
      return (
        <View key={notification.id} style={[styles.notificationCard, styles.read]}> 
          <View style={styles.notificationInfo}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="time-outline" size={24} color="#FF6B00" />
            </View>
            <View style={styles.textInfo}>
              <Text style={styles.notificationTitle}>Event Updated</Text>
              <Text style={styles.notificationBody}>{notification.body}</Text>
              <View style={styles.responseStatusRow}>
                <Ionicons 
                  name={notification.updated_going ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={notification.updated_going ? "#4CAF50" : "#F44336"} 
                />
                <Text style={[styles.responseStatusText, { 
                  color: notification.updated_going ? "#4CAF50" : "#F44336",
                  marginLeft: 8
                }]}>
                  {notification.updated_going ? "You're still going" : "You're no longer going"}
                </Text>
              </View>
              <Text style={styles.timestamp}>{formatTimeAgo(notification.created_at)}</Text>
            </View>
          </View>
        </View>
      );
    }
    
    // Show choices if user hasn't responded yet
    return (
      <TouchableOpacity 
        key={notification.id} 
        style={styles.invitationCard}
        onPress={() => {
          toast.info('Event details updated');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.invitationHeader}>
          <View style={[styles.avatarPlaceholder, { width: 40, height: 40, borderRadius: 20 }]}>
            <Ionicons name="time-outline" size={20} color="#FF6B00" />
          </View>
          <View style={styles.invitationInfo}>
            <Text style={styles.invitationTitle}>
              <Text style={styles.notificationTitle}>Event Updated</Text>
              <Text style={styles.notificationTitle}>Do you still want to go?</Text>
            </Text>
            <Text style={styles.notificationBody}>{notification.body}</Text>
            <Text style={styles.timestamp}>
              {formatTimeAgo(notification.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEventUpdateResponse(notification.id, 'decline');
            }}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.declineButtonText}>Can't make it</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEventUpdateResponse(notification.id, 'accept');
            }}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.acceptButtonText}>Can still attend</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleEventUpdateResponse = async (notificationId: string, response: 'accept' | 'decline') => {
    setRespondingToInvite(notificationId);
    try {
      if (response === 'decline') {
        // Find the notification to get the event ID
        const notification = notifications.find(n => n.id === notificationId);
        if (notification?.data?.event_id && user) {
          // Remove user's RSVP from the event
          const success = await eventService.cancelRsvp(notification.data.event_id, user.id);
          if (success) {
            toast.success('You\'ve been removed from the event');
          } else {
            toast.error('Failed to remove RSVP');
            return;
          }
        } else {
          toast.success('You\'ve been removed from the event');
        }
      } else {
        // User confirms they can still attend
        toast.success('Great! You\'re still attending');
      }
      
      // Update the notification with the user's response
      const success = await notificationService.updateEventUpdateResponse(
        notificationId, 
        response === 'accept'
      );
      
      if (success) {
        // Update the notification in the local state
        setNotifications(prev => prev.map(n => 
          n.id === notificationId 
            ? { ...n, updated_going: response === 'accept', read: true }
            : n
        ));
      } else {
        toast.error('Failed to update notification');
        return;
      }
      
    } catch (error) {
      console.error('Error handling event update response:', error);
      toast.error('Something went wrong');
    } finally {
      setRespondingToInvite(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Invitations Section */}
        {eventInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Invitations</Text>
            {eventInvitations.map(renderEventInvitation)}
          </View>
        )}

        {/* Existing notifications section */}
        {loading ? (
            <View style={styles.spinnerContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {filteredNotifications.length === 0 ? (
                <Text style={{ color: '#666', fontStyle: 'italic' }}>No notifications found</Text>
              ) : (
                filteredNotifications.map(n => {
                  // Check if this is an event update notification
                  if (n.title === 'Event Updated: Do you still want to go?') {
                    return renderEventUpdateNotification(n);
                  }
                  
                  // Regular notification rendering
                  return (
                    <View key={n.id} style={[styles.notificationCard, n.read ? styles.read : styles.unread]}> 
                      <View style={styles.notificationInfo}>
                        {n.avatar_url ? (
                          <Image source={{ uri: n.avatar_url }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            {n.title === 'Event Updated' ? (
                              <Ionicons name="time-outline" size={24} color="#FF6B00" />
                            ) : n.title === 'Event Cancelled' ? (
                              <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                            ) : n.title === 'Event Invitation' ? (
                              <Ionicons name="mail-outline" size={24} color="#007AFF" />
                            ) : (
                              <Text style={styles.avatarText}>
                                {n.title.slice(0, 1).toUpperCase()}
                              </Text>
                            )}
                          </View>
                        )}
                        <View style={styles.textInfo}>
                          <Text style={styles.notificationTitle}>{n.title}</Text>
                          <Text style={styles.notificationBody}>{n.body}</Text>
                          <Text style={styles.timestamp}>{formatTimeAgo(n.created_at)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </ScrollView>

      {/* Modals */}
      <FriendProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        friend={selectedProfile}
      />
      
      <EventModal
        visible={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        event={selectedEvent}
        showAttendees={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    letterSpacing: 0,
    marginBottom: 0,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '400'
  },
  content: {
    flex: 1,
  },
  spinnerContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  notificationCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  unread: {
    borderLeftColor: '#FF006E',
    opacity: 1,
  },
  read: {
    borderLeftColor: '#333',
    opacity: 0.7,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FF006E',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textInfo: {
    flex: 1,
  },
  notificationTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  
  // New styles for event invitations
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  invitationCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  inviterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  inviterName: {
    fontWeight: '600',
    color: '#FF006E',
  },
  invitedText: {
    color: '#ffffff',
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  invitationTime: {
    color: '#ffffff',
    fontSize: 12,
  },
  eventImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventCoverImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  eventDetails: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMeta: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  invitationActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: 'black',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  responseStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  responseStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
}); 