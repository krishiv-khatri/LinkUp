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
import EventModal from '../components/EventModal';
import FriendProfileModal from '../components/FriendProfileModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { eventService } from '../services/eventService';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  avatar_url?: string;
  created_at: string;
  read: boolean;
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

  const handleViewEvent = (event: any) => {
    setSelectedEvent(event);
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
      // For each hosted event, also fetch attendees and attach to event
      const hosted = await Promise.all(
        allEvents.filter((e: any) => e.creator_id === user.id).map(async (event: any) => {
          const attendees = await eventService.getAttendees(event.id);
          return { ...event, attendees };
        })
      );
      setHostedEvents(hosted);
      let notifList: NotificationItem[] = [];
      const now = new Date();

      // --- Event Reminders for RSVP'ed Events ---
      for (const event of attendingEvents) {
        // Skip reminders if user is the host (robust check for UUIDs)
        if (event.creator_id && user.id && event.creator_id.toString().trim() === user.id.toString().trim()) {
          // Debug log to verify UUIDs
          continue;
        }
        // Combine date and time into a Date object
        const eventDateTime = new Date(event.date + 'T' + event.time);
        const notificationTimes = getNotificationTimes(eventDateTime);
        const timeLabels = ['1 day', '2 hours', '1 hour'];
        notificationTimes.forEach((nt, idx) => {
          // Show notification if now is after notification time and before event
          if (now >= nt && now < eventDateTime) {
            notifList.push({
              id: `${event.id}-reminder-${idx}`,
              title: `Event Reminder: ${event.title}`,
              body: `Your event "${event.title}" is in ${timeLabels[idx]}.`,
              avatar_url: event.coverImage,
              created_at: nt.toISOString(),
              read: false,
            });
          }
        });
      }

      // --- RSVP Notifications for Hosted Events ---
      for (const event of hosted) {
        const attendees = event.attendees;
        if (attendees.length === 0) continue;
        // Show individual notifications for first 5 RSVPs
        if (attendees.length <= 5) {
          attendees.forEach((att: any, idx: number) => {
            notifList.push({
              id: `${event.id}-rsvp-${att.user_id}`,
              title: `RSVP: ${event.title}`,
              body: `${att.name || 'Someone'} has RSVP'ed to your event!`,
              avatar_url: event.coverImage,
              created_at: att.created_at || new Date().toISOString(),
              read: false,
            });
          });
        } else {
          // Instagram-style: show latest 2 RSVPers and count of others
          const latest = attendees.slice(-2);
          const othersCount = attendees.length - 2;
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

      // Sort by most recent
      notifList.sort((a: NotificationItem, b: NotificationItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Final filter to ensure no reminders or RSVP notifications for own events
      const filteredNotifList = notifList.filter(n => {
        // Filter event reminders
        if (n.id.includes('-reminder-') && n.body.includes('Your event')) {
          const eventId = n.id.split('-reminder-')[0];
          const event = attendingEvents.find(e => e.id === eventId);
          if (event && event.creator_id && user.id && event.creator_id.toString().trim() === user.id.toString().trim()) {
            return false;
          }
        }
        // Filter RSVP notifications for own RSVP to own event
        if (n.id.includes('-rsvp-') && n.title.startsWith('RSVP:')) {
          const eventId = n.id.split('-rsvp-')[0];
          const event = hosted.find(e => e.id === eventId);
          // If this RSVP notification is for the current user and the event is hosted by the user, skip
          if (event && event.creator_id && user.id && event.creator_id.toString().trim() === user.id.toString().trim()) {
            // For individual RSVP notifications, check if the user is the RSVP'er
            if (n.id.endsWith(user.id)) {
              return false;
            }
            // For Instagram-style, if the only RSVPers are the user, skip
            if (n.body.includes(user.id)) {
              return false;
            }
          }
        }
        return true;
      });
      setNotifications(filteredNotifList);
      setLoading(false);
    })();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
                filteredNotifications.map(n => (
                  <View key={n.id} style={[styles.notificationCard, n.read ? styles.read : styles.unread]}> 
                    <View style={styles.notificationInfo}>
                      {n.avatar_url ? (
                        <Image source={{ uri: n.avatar_url }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
                          <Ionicons name="notifications" size={28} color="#888" />
                        </View>
                      )}
                      <View style={styles.notificationDetails}>
                        <Text style={styles.notificationTitle}>{n.title}</Text>
                        {/* RSVP notification: clickable name(s) */}
                        {n.title.startsWith('RSVP:') && n.body.match(/^[^ ]+/) ? (
                          <Text style={styles.notificationBody}>
                            {(() => {
                              // Try to extract names and the rest
                              const match = n.body.match(/^([\w\s]+)(?:, ([\w\s]+))? (and \d+ others )?have RSVP'ed to your event!$/);
                              if (match) {
                                const [ , name1, name2, others ] = match;
                                // For individual RSVP, user_id is in n.id
                                const eventId = n.id.split('-rsvp-')[0];
                                // Find the attendee list for this event
                                const event = hostedEvents.find(e => e.id === eventId);
                                let attendees = event && event.attendees ? event.attendees : [];
                                // Helper to find user_id by name
                                const findUserIdByName = (name: string, attendees: any[]) => {
                                  const found = attendees.find((a: any) => a.name === name.trim());
                                  return found ? found.user_id : '';
                                };
                                return <>
                                  {name1 && <Text style={{ fontWeight: 'bold' }} onPress={() => handleShowProfile(findUserIdByName(name1, attendees))}>{name1}</Text>}
                                  {name2 && <Text> <Text style={{ fontWeight: 'bold' }} onPress={() => handleShowProfile(findUserIdByName(name2, attendees))}>{name2}</Text></Text>}
                                  {others && <Text> {others}</Text>}
                                  <Text>have RSVP'ed to your event!</Text>
                                </>;
                              } else {
                                // Fallback: just bold and clickable for the first word
                                const parts = n.body.split(' ');
                                const userId = n.id.split('-rsvp-')[1] || '';
                                return <><Text style={{ fontWeight: 'bold' }} onPress={() => handleShowProfile(userId)}>{parts[0]}</Text> {parts.slice(1).join(' ')}</>;
                              }
                            })()}
                          </Text>
                        ) : (
                          <Text style={styles.notificationBody}>{n.body}</Text>
                        )}
                        <Text style={styles.notificationTime}>{formatTimeAgo(n.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 100 }} />
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
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    bottom: 100,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  notificationDetails: {
    flex: 1,
    marginLeft: 16,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
  },
  read: {
    opacity: 0.6,
  },
  unread: {
    opacity: 1,
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
    marginHorizontal: 20,
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
    color: '#888',
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
    backgroundColor: '#FF006E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
}); 