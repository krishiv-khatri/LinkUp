import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Animated, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function FriendProfileModal({ visible, onClose, friend }: FriendProfileModalProps) {
  const [friendEvents, setFriendEvents] = React.useState<UserEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          <Text style={styles.name}>{friend.display_name || friend.username}</Text>
          <Text style={styles.username}>@{friend.username}</Text>

          <Text style={styles.sectionTitle}>{firstName}'s Plans:</Text>
          <ScrollView style={{ flexGrow: 0, width: '100%' }} contentContainerStyle={{ paddingBottom: 12 }}>
            {loadingEvents ? (
              <Text style={styles.loadingText}>Loading plans...</Text>
            ) : friendEvents.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming events.</Text>
            ) : (
              friendEvents.map(event => (
                <View key={event.id} style={styles.planCard}>
                  <Text style={styles.planTitle}>{event.title}</Text>
                  <Text style={styles.planDetails}>
                    {formatEventTime(event.time)} • {event.location}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {friendSocialHandles.length > 0 && (
            <View style={styles.socialsContainer}>
              {friendSocialHandles.map((social, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialItem}
                  onPress={() => handleSocialPress(social.platform, social.handle)}
                >
                  <View style={styles.socialInfo}>
                    <View style={[styles.socialIcon, { backgroundColor: social.color }]}> 
                      <Ionicons name={social.icon as any} size={20} color="white" />
                    </View>
                    <View style={styles.socialTextContainer}>
                      <Text style={styles.socialPlatformName}>{social.name}</Text>
                      <Text style={styles.socialPlatformHandle}>@{social.handle}</Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
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
        .select('id, title, time, location, category, created_at')
        .in('id', eventIds)
        .order('created_at', { ascending: false });
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
      } else {
        return eventsData || [];
      }
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
    alignItems: 'center',
    height: '80%',
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
  },
  username: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
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
  closeButton: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 12,
  },
  closeText: {
    color: 'white',
    fontWeight: 'bold',
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
}); 