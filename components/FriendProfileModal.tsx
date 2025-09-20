import { shareService } from '@/services/shareService';
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Animated, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface FriendProfileModalProps {
  visible: boolean;
  onClose: () => void;
  friend: Profile | null;
}

interface UserEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  category: string;
  created_at: string;
  cover_image?: string;
  event_date?: string;
  attendingCount?: number;
  attendingFriends?: string[];
}

interface MutualFriend {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

const socialPlatforms = {
  instagram: {
    name: 'Instagram',
    icon: 'logo-instagram',
    color: '#E4405F',
    baseUrl: 'https://instagram.com/',
  },
  tiktok: {
    name: 'TikTok',
    icon: 'logo-tiktok',
    color: '#FF0050',
    baseUrl: 'https://tiktok.com/@',
  },
  twitter: {
    name: 'Twitter',
    icon: 'logo-twitter',
    color: '#1DA1F2',
    baseUrl: 'https://twitter.com/',
  },
  snapchat: {
    name: 'Snapchat',
    icon: 'logo-snapchat',
    color: '#FFFC00',
    baseUrl: 'https://snapchat.com/add/',
  },
};

function getFriendSocialHandles(friend: any) {
  if (!friend?.social_handles) return [];
  const handles: any[] = [];
  Object.entries(friend.social_handles).forEach(([platform, handle]) => {
    const platformKey = platform as keyof typeof socialPlatforms;
    if (handle && typeof handle === 'string' && handle.trim() && socialPlatforms[platformKey]) {
      handles.push({
        platform,
        handle: handle.trim(),
        ...socialPlatforms[platformKey],
      });
    }
  });
  return handles;
}

function handleSocialPress(platform: string, handle: string) {
  const platformKey = platform as keyof typeof socialPlatforms;
  const socialPlatform = socialPlatforms[platformKey];
  if (socialPlatform && handle) {
    const url = `${socialPlatform.baseUrl}${handle}`;
    Linking.openURL(url).catch(() => {
      // Optionally show a toast or alert
    });
  }
}

// Helper to generate a vibrant pastel color (not grey) with alpha based on a string (event id)
function getPastelColor(id: string) {
  // Simple hash function for hue
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Use HSL: vibrant hue, high saturation, high lightness
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash) % 20); // 70-89% saturation
  const light = 50; // 80% lightness for pastel
  return `hsla(${hue},${sat}%,${light}%,0.32)`;
}

export default function FriendProfileModal({ visible, onClose, friend }: FriendProfileModalProps) {
  // All hooks must be at the top, before any return
  const [friendEvents, setFriendEvents] = React.useState<UserEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [friendCount, setFriendCount] = React.useState<number | null>(null);
  const [attendedCount, setAttendedCount] = React.useState<number | null>(null);
  const [modalSwipeEnabled, setModalSwipeEnabled] = React.useState(true);
  const [mutualFriends, setMutualFriends] = React.useState<MutualFriend[]>([]);
  const [loadingMutuals, setLoadingMutuals] = React.useState(false);

  // Fetch mutual friends
  const fetchMutualFriends = async (friendId: string, currentUserId: string) => {
    setLoadingMutuals(true);
    try {
      // Get the current user's friends
      const { data: myFriends } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      // Get the friend's friends
      const { data: theirFriends } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
        .eq('status', 'accepted');

      if (!myFriends || !theirFriends) {
        setMutualFriends([]);
        return;
      }

      // Extract friend IDs for current user
      const myFriendIds = new Set(
        myFriends.map(f => f.user_id === currentUserId ? f.friend_id : f.user_id)
      );

      // Extract friend IDs for the other user
      const theirFriendIds = new Set(
        theirFriends.map(f => f.user_id === friendId ? f.friend_id : f.user_id)
      );

      // Find mutual friends (excluding current user and the friend)
      const mutualIds = [...myFriendIds].filter(id => 
        theirFriendIds.has(id) && id !== currentUserId && id !== friendId
      );

      if (mutualIds.length === 0) {
        setMutualFriends([]);
        return;
      }

      // Fetch profile details for mutual friends
      const { data: mutualProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', mutualIds)
        .limit(6); // Limit to 6 mutual friends for display

      setMutualFriends(mutualProfiles || []);
    } catch (error) {
      console.error('Error fetching mutual friends:', error);
      setMutualFriends([]);
    } finally {
      setLoadingMutuals(false);
    }
  };

  // Fetch number of friends and attended events
  React.useEffect(() => {
    if (friend?.id) {
      // Fetch number of friends
      supabase.from('friends')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${friend.id},friend_id.eq.${friend.id}`)
        .eq('status', 'accepted')
        .then(({ count }) => setFriendCount(count ?? 0));
      // Fetch number of attended events (RSVPs in the past)
      const today = new Date();
      supabase.from('attendees')
        .select('event_id')
        .eq('user_id', friend.id)
        .then(async ({ data }) => {
          if (!data) return setAttendedCount(0);
          const eventIds = data.map((a: any) => a.event_id);
          if (eventIds.length === 0) return setAttendedCount(0);
          const { data: events } = await supabase
            .from('events')
            .select('id, event_date')
            .in('id', eventIds);
          const attended = (events || []).filter(e => {
            const date = new Date(e.event_date);
            return date < today;
          });
          setAttendedCount(attended.length);
        });
    }
  }, [friend?.id]);

  React.useEffect(() => {
    if (visible && friend?.id) {
      setLoadingEvents(true);
      fadeAnim.setValue(0); // Reset fade
      fetchFriendEvents(friend.id).then(events => {
        setFriendEvents(events);
        setLoadingEvents(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setFriendEvents([]);
      fadeAnim.setValue(0);
    }
  }, [visible, friend?.id]);

  // Fetch mutual friends when modal opens
  React.useEffect(() => {
    if (visible && friend?.id) {
      // Get current user ID from somewhere (you might need to pass this as a prop)
      // For now, I'll assume you can get it from context or supabase auth
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && friend.id) {
          fetchMutualFriends(friend.id, user.id);
        }
      });
    }
  }, [visible, friend?.id]);

  if (!friend) return null;
  const firstName = friend.display_name?.split(' ')[0] || friend.username?.split(' ')[0] || 'Friend';
  const friendSocialHandles = getFriendSocialHandles(friend);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={modalSwipeEnabled ? ['down'] : []}
      style={styles.swipeModal}
      backdropOpacity={0.4}
      propagateSwipe
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close button in top right */}
          <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {/* Share button in top left */}
          <TouchableOpacity 
            onPress={() => shareService.shareProfile(friend)} 
            style={styles.shareIconButton}
          >
            <Ionicons name="share-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ 
                  uri: friend.avatar_url || `https://api.a0.dev/assets/image?text=${friend?.display_name?.slice(0, 1) || friend?.username?.slice(0, 1) || 'U'}&aspect=1:1&seed=${friend.id}` 
                }} 
                style={styles.profileAvatar} 
              />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {friend.display_name || friend.username}
              </Text>
              <Text style={styles.profileUsername}>@{friend.username}</Text>
              
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {friendCount === null ? '-' : friendCount}
                  </Text>
                  <Text style={styles.statLabel}>
                    {friendCount === 1 ? 'friend' : 'friends'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {attendedCount === null ? '-' : attendedCount}
                  </Text>
                  <Text style={styles.statLabel}>
                    {attendedCount === 1 ? 'event' : 'events'}
                  </Text>
                </View>
              </View>
              
              {/* Social Icons */}
              {friendSocialHandles.length > 0 && (
                <View style={styles.socialIconsRow}>
                  {friendSocialHandles.map((social, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSocialPress(social.platform, social.handle)}
                      style={styles.socialIcon}
                    >
                      <Ionicons name={social.icon as any} size={20} color={social.color} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Mutual Friends Section */}
          {mutualFriends.length > 0 && (
            <View style={styles.mutualSection}>
              <Text style={styles.mutualTitle}>
                {mutualFriends.length} mutual friend{mutualFriends.length > 1 ? 's' : ''}
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.mutualScrollView}
                contentContainerStyle={styles.mutualScrollContent}
              >
                {mutualFriends.map((mutual, index) => (
                  <View key={mutual.id} style={styles.mutualFriendItem}>
                    <Image
                      source={{ 
                        uri: mutual.avatar_url || `https://api.a0.dev/assets/image?text=${mutual?.display_name?.slice(0, 1) || mutual?.username?.slice(0, 1) || 'U'}&aspect=1:1&seed=${mutual.id}` 
                      }}
                      style={styles.mutualAvatar}
                    />
                    <Text style={styles.mutualName} numberOfLines={1}>
                      {mutual.display_name?.split(' ')[0] || mutual.username}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.divider} />

          {/* Events Sections */}
          <Text style={styles.sectionTitle}>{firstName}'s Upcoming Events</Text>
          <View style={styles.eventsContainer}>
            <NativeViewGestureHandler>
              <ScrollView
                style={styles.eventsScrollView}
                contentContainerStyle={styles.eventsScrollContent}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                onTouchStart={() => setModalSwipeEnabled(false)}
                onTouchEnd={() => setModalSwipeEnabled(true)}
                onScrollEndDrag={() => setModalSwipeEnabled(true)}
                showsVerticalScrollIndicator={false}
              >
                <View>
                  {loadingEvents ? (
                    <Text style={styles.loadingText}>Loading events...</Text>
                  ) : (() => {
                    // Only show future events
                    const now = new Date();
                    const futureEvents = friendEvents.filter(event => {
                      const date = new Date(event.event_date || event.time);
                      return date >= now;
                    });
                    if (futureEvents.length === 0) {
                      return (
                        <View style={styles.emptyStateContainer}>
                          <Ionicons name="calendar-outline" size={48} color="#555" />
                          <Text style={styles.emptyText}>No upcoming events</Text>
                        </View>
                      );
                    }
                    return futureEvents.map(event => (
                      <View
                        key={event.id}
                        style={styles.eventCard}
                      >
                        <Image
                          source={{ uri: event.cover_image || `https://api.a0.dev/assets/image?text=${encodeURIComponent(event.title)}&aspect=16:9&seed=${event.id}` }}
                          style={styles.eventImage}
                        />
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                          <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                            {formatEventTime(event.event_date || event.time)}
                          </Text>
                          <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
                            📍 {event.location}
                          </Text>
                          <View style={styles.eventMeta}>
                            {/* Attendee avatars */}
                            <View style={styles.friendAvatars}>
                              {event.attendingFriends && event.attendingFriends.slice(0, 3).map((avatar, idx) => (
                                <Image
                                  key={idx}
                                  source={{ uri: avatar }}
                                  style={[styles.friendAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}
                                />
                              ))}
                              {event.attendingFriends && event.attendingFriends.length > 3 && (
                                <View style={[styles.friendAvatar, styles.moreCount, { marginLeft: -8 }]}> 
                                  <Text style={styles.moreCountText}>+{event.attendingFriends.length - 3}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.attendingText}>{event.attendingCount || 0} going</Text>
                          </View>
                        </View>
                      </View>
                    ));
                  })()}
                </View>
              </ScrollView>
            </NativeViewGestureHandler>
          </View>
        </View>
      </View>
    </Modal>
  );
}

async function fetchFriendEvents(friendId: string): Promise<UserEvent[]> {
  try {
    const { data: attendeeData, error: attendeeError } = await supabase
      .from('attendees')
      .select('event_id')
      .eq('user_id', friendId);
    if (attendeeError) {
      console.error('Error fetching friend attendees:', attendeeError);
      return [];
    }
    if (attendeeData && attendeeData.length > 0) {
      const eventIds = attendeeData.map((a: any) => a.event_id);
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, time, location, category, created_at, cover_image, event_date')
        .in('id', eventIds)
        .order('created_at', { ascending: false });
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
      }
      // Fetch attendee avatars for each event
      const eventsWithAttendees = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          const { data: attendees } = await supabase
            .from('attendees')
            .select('avatar_url')
            .eq('event_id', event.id)
            .limit(5);
          return {
            ...event,
            attendingFriends: attendees?.map((a: any) => a.avatar_url) || [],
            attendingCount: attendees?.length || 0,
          };
        })
      );
      return eventsWithAttendees;
    }
    return [];
  } catch (error) {
    console.error('Error fetching friend events:', error);
    return [];
  }
}

function formatEventTime(timeString: string) {
  try {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return timeString;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'stretch',
    height: '85%',
    justifyContent: 'flex-start',
  },
  closeIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  shareIconButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    borderWidth: 3,
    borderColor: '#2A2A2A',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  socialIconsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    padding: 8,
  },
  mutualSection: {
    marginBottom: 20,
  },
  mutualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  mutualScrollView: {
    flexGrow: 0,
  },
  mutualScrollContent: {
    paddingRight: 16,
  },
  mutualFriendItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  mutualAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    marginBottom: 6,
  },
  mutualName: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  eventsContainer: {
    flex: 1,
  },
  eventsScrollView: {
    flex: 1,
  },
  eventsScrollContent: {
    paddingBottom: 20,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    flexDirection: 'row',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333',
  },
  eventInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  eventDetails: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  moreCount: {
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCountText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  attendingText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  swipeModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
}); 