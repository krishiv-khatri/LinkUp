import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
         {/* Top row: avatar, name, socials */}
         <View style={{ flexDirection: 'row', width: '100%', alignItems: 'flex-start', marginBottom: 0 }}>
            {/* Avatar and username ONLY */}
            <View style={{ alignItems: 'center', width: 90 }}>
              <Image source={{ uri: friend.avatar_url }} style={[styles.avatar, { marginBottom: 4, width: 64, height: 64 }]} />
              <Text style={[styles.username, { marginBottom: 8, marginTop: 0, fontSize: 14 }]}>@{friend.username}</Text>
            </View>

            {/* Name, stats, and socials */}
            <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'flex-start' , marginLeft: 20, marginRight: 40}}>
              <Text 
                style={[styles.name, { marginBottom: 12, marginTop: 0 }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {friend.display_name || friend.username}
              </Text>

              {/* Container for stats and socials */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {/* Stats */}
                <View>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
                    {friendCount === 1
                      ? '1 friend'
                      : `${friendCount ?? '-'} friends`}
                  </Text>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    {attendedCount === 1
                      ? '1 event attended'
                      : `${attendedCount ?? '-'} events attended`}
                  </Text>
                </View>

                {/* Social Icons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, marginLeft: 20 }}>
                  {friendSocialHandles.map((social, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSocialPress(social.platform, social.handle)}
                    >
                      <Ionicons name={social.icon as any} size={22} color={social.color} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{firstName}'s Plans:</Text>
          <View style={{ maxHeight: 240, width: '100%' }}>
            <NativeViewGestureHandler>
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ paddingBottom: 12 }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                onTouchStart={() => setModalSwipeEnabled(false)}
                onTouchEnd={() => setModalSwipeEnabled(true)}
                onScrollEndDrag={() => setModalSwipeEnabled(true)}
              >
                <View>
                  {loadingEvents ? (
                    <Text style={styles.loadingText}>Loading plans...</Text>
                  ) : (() => {
                    // Only show future events
                    const now = new Date();
                    const futureEvents = friendEvents.filter(event => {
                      const date = new Date(event.event_date || event.time);
                      return date >= now;
                    });
                    if (futureEvents.length === 0) {
                      return (
                        <View style={{ minHeight: 48, justifyContent: 'center' }}>
                          <Text style={styles.emptyText}>No upcoming events.</Text>
                        </View>
                      );
                    }
                    return futureEvents.map(event => (
                      <View
                        key={event.id}
                        style={[styles.eventCard, {
                          backgroundColor: getPastelColor(event.id),
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.18)',
                        }]}
                      >
                        <Image
                          source={{ uri: event.cover_image || `https://api.a0.dev/assets/image?text=${encodeURIComponent(event.title)}&aspect=16:9&seed=${event.id}` }}
                          style={styles.eventImage}
                        />
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                          <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                            {formatEventTime(event.event_date || event.time)} • {event.location}
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
            <LinearGradient
              colors={['rgba(26, 26, 26, 0)', '#1A1A1A']}
              style={styles.fadeGradient}
              pointerEvents="none"
            />
          </View>
          {/* Attended (past) events section */}
          <Text style={styles.sectionTitle}>{firstName} Attended:</Text>
          <View style={{ maxHeight: 240, width: '100%' }}>
            <NativeViewGestureHandler>
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ paddingBottom: 12 }}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                onTouchStart={() => setModalSwipeEnabled(false)}
                onTouchEnd={() => setModalSwipeEnabled(true)}
                onScrollEndDrag={() => setModalSwipeEnabled(true)}
              >
                <View>
                  {loadingEvents ? (
                    <Text style={styles.loadingText}>Loading attended events...</Text>
                  ) : (() => {
                    // Only show past events
                    const now = new Date();
                    const pastEvents = friendEvents.filter(event => {
                      const date = new Date(event.event_date || event.time);
                      return date < now;
                    });
                    if (pastEvents.length === 0) {
                      return (
                        <View style={{ minHeight: 48, justifyContent: 'center' }}>
                          <Text style={styles.emptyText}>No attended events.</Text>
                        </View>
                      );
                    }
                    return pastEvents.map(event => (
                      <View
                        key={event.id}
                        style={[styles.eventCard, {
                          backgroundColor: getPastelColor(event.id),
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.18)',
                        }]}
                      >
                        <Image
                          source={{ uri: event.cover_image || `https://api.a0.dev/assets/image?text=${encodeURIComponent(event.title)}&aspect=16:9&seed=${event.id}` }}
                          style={styles.eventImage}
                        />
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                          <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                            {formatEventTime(event.event_date || event.time)} • {event.location}
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
            <LinearGradient
              colors={['rgba(26, 26, 26, 0)', '#1A1A1A']}
              style={styles.fadeGradient}
              pointerEvents="none"
            />
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
    height: '90%',
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  username: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  planCard: {
    borderRadius: 12,
    backgroundColor: '#222',
    padding: 12,
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  planDetails: {
    fontSize: 14,
    color: '#888',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  closeIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  socialsContainer: {
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  socialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialTextContainer: {
    flex: 1,
  },
  socialPlatformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  socialPlatformHandle: {
    fontSize: 14,
    color: '#888',
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    padding: 12,
    marginBottom: 10,
  },
  eventImage: {
    width: 80,
    height: 76,
    borderRadius: 12,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  eventDetails: {
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  moreCount: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  attendingText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  swipeModal: {
    justifyContent: 'flex-end',
    margin: 0,
    zIndex: 999999, // Very high z-index to appear above other modals
  },
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
}); 