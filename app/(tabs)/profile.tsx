import AttendeesList from '@/components/AttendeesList';
import EventModal from '@/components/EventModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import ThreeDotMenu from '@/components/ThreeDotMenu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { eventService, Event as ServiceEvent } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  time: string;
  event_date: string;
  location: string;
  category: string;
  created_at: string;
  description: string;
  cover_image: string;
  attendingCount: number;
  attendingFriends: string[];
  creator_id?: string;
}

interface SocialPlatform {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  baseUrl: string;
}

const socialPlatforms: Record<string, SocialPlatform> = {
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

export default function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const [isOutOfTown, setIsOutOfTown] = useState(false);
  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([]);
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ServiceEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const profileRingAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Profile ring glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(profileRingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(profileRingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Initialize user settings
    if (user) {
      setIsOutOfTown(user.isOutOfTown || false);
      fetchUserEvents();
    }
  }, [user]);

  const fetchUserEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch both RSVP'd events and created events in parallel
      const [rsvpEventsData, createdEventsData] = await Promise.all([
        eventService.getRSVPdEvents(user.id),
        fetchCreatedEvents(user.id)
      ]);
      
      // Convert service events to local event format
      const convertedRsvpEvents = rsvpEventsData.map(event => ({
        ...event,
        event_date: event.date,
        cover_image: event.coverImage,
        created_at: new Date().toISOString() // Add placeholder
      }));
      
      setRsvpEvents(convertedRsvpEvents);
      setCreatedEvents(createdEventsData);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatedEvents = async (userId: string): Promise<Event[]> => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, time, event_date, location, category, created_at, description, cover_image, creator_id')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.error('Error fetching created events:', eventsError);
        return [];
      }

      // Get attendee counts for created events
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const count = await eventService.getAttendeeCount(event.id);
          const { data: attendees } = await supabase
            .from('attendees')
            .select('avatar_url')
            .eq('event_id', event.id)
            .limit(5);
          
          return {
            ...event,
            attendingCount: count,
            attendingFriends: attendees?.map(a => a.avatar_url) || []
          };
        })
      );

      return eventsWithCounts;
    } catch (error) {
      console.error('Error fetching created events:', error);
      return [];
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleShareProfile = () => {
    toast.success('Profile link copied to clipboard! 📋');
  };

  const handleOutOfTownToggle = async (value: boolean) => {
    setIsOutOfTown(value);
    if (user) {
      const result = await updateProfile({ isOutOfTown: value });
      if (result.success) {
        toast.success(value ? 'You\'re now marked as out of town' : 'Welcome back! You\'re now available');
      } else {
        toast.error('Could not update your status. Please try again.');
        setIsOutOfTown(!value);
      }
    }
  };

  const handleSocialPress = (platform: string, handle: string) => {
    const socialPlatform = socialPlatforms[platform];
    if (socialPlatform && handle) {
      const url = `${socialPlatform.baseUrl}${handle}`;
      Linking.openURL(url).catch(() => {
        toast.error(`Unable to open ${socialPlatform.name}. Please check your internet connection.`);
      });
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You\'ll need to sign in again to access your profile and events.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              toast.success('You\'ve been signed out successfully');
            } catch (error) {
              console.error('Sign out error:', error);
              toast.error('Something went wrong while signing out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditEvent = (event: Event) => {
    router.push(`/edit-event?eventId=${event.id}`);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await eventService.deleteEvent(eventId);
              
              if (success) {
                toast.success('Event cancelled successfully');
                setCreatedEvents(prev => prev.filter(e => e.id !== eventId));
              } else {
                toast.error('Failed to cancel event');
              }
            } catch (error) {
              console.error('Delete event error:', error);
              toast.error('Something went wrong while cancelling the event');
            }
          },
        },
      ]
    );
  };

  const handleEventPress = (event: Event) => {
    // Convert event format for modal - make it match EventModal's Event interface exactly
    const modalEvent: ServiceEvent = {
      id: event.id,
      title: event.title,
      time: event.time,
      date: event.event_date, // Convert event_date to date
      location: event.location,
      category: event.category,
      attendingFriends: event.attendingFriends,
      attendingCount: event.attendingCount,
      coverImage: event.cover_image, // Convert cover_image to coverImage
      description: event.description,
      creator_id: event.creator_id
    };
    
    setSelectedEvent(modalEvent);
    setShowEventModal(true);
  };

  const formatEventTime = (event: Event) => {
    try {
      const date = new Date(event.event_date);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return event.time;
    }
  };

  const getEventStatusColor = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    return eventDate > now ? '#00C853' : '#FF9800';
  };

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.email) {
      return `https://api.a0.dev/assets/image?text=${user.email.slice(0, 1).toUpperCase()}&aspect=1:1&seed=${user.id.slice(0, 8)}`;
    }
    return 'https://api.a0.dev/assets/image?text=U&aspect=1:1&seed=default';
  };

  const getUserHandle = () => {
    if (user?.username) return `@${user.username}`;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getSocialHandles = (): (SocialPlatform & { platform: string; handle: string })[] => {
    if (!user?.socialHandles) return [];
    const handles: (SocialPlatform & { platform: string; handle: string })[] = [];
    
    Object.entries(user.socialHandles).forEach(([platform, handle]) => {
      if (handle && typeof handle === 'string' && handle.trim() && socialPlatforms[platform]) {
        handles.push({
          platform,
          handle: handle.trim(),
          ...socialPlatforms[platform],
        });
      }
    });
    
    return handles;
  };

  const ringOpacity = profileRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Please sign in to view your profile</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const socialHandles = getSocialHandles();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <Animated.View style={[styles.profileHeader, { opacity: fadeAnim }]}>
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatarRing, { opacity: ringOpacity }]}>
                <LinearGradient
                  colors={['#FF006E', '#8338EC', '#3A86FF']}
                  style={styles.avatarGradient}
                />
              </Animated.View>
              <Image 
                source={{ uri: getAvatarUrl() }}
                style={styles.avatar}
              />
            </View>
            
            <Text style={styles.profileName}>{getDisplayName()}</Text>
            
            <View style={styles.socialHandles}>
              <Text style={styles.socialHandle}>{getUserHandle()}</Text>
              {user.email && (
                <>
                  <Text style={styles.socialSeparator}>|</Text>
                  <Text style={styles.socialHandle}>{user.email}</Text>
                </>
              )}
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <LinearGradient
                  colors={['#FF006E', '#8338EC']}
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create-outline" size={18} color="white" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Social Handles Section */}
          {socialHandles.length > 0 && (
            <Animated.View style={[styles.socialsSection, { opacity: fadeAnim }]}>
              <Text style={styles.sectionTitle}>Socials</Text>
              
              <View style={styles.socialsContainer}>
                {socialHandles.map((social, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.socialItem}
                    onPress={() => handleSocialPress(social.platform, social.handle)}
                  >
                    <View style={styles.socialInfo}>
                      <View style={[styles.socialIcon, { backgroundColor: social.color }]}>
                        <Ionicons name={social.icon} size={20} color="white" />
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
            </Animated.View>
          )}

          {/* Your Plans Section */}
          <Animated.View style={[styles.eventsSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
            
            <View style={styles.eventsContainer}>
              {loading ? (
                <Text style={styles.loadingText}>Loading your plans...</Text>
              ) : rsvpEvents.length === 0 ? (
                <Text style={styles.emptyText}>No upcoming plans. Start exploring events!</Text>
              ) : (
                rsvpEvents.map((event, index) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    onPress={() => handleEventPress(event)}
                  >
                    <Image 
                      source={{ 
                        uri: event.cover_image || `https://api.a0.dev/assets/image?text=${encodeURIComponent(event.title)}&aspect=16:9&seed=${event.id}`
                      }} 
                      style={styles.eventImage}
                    />
                    
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                        {formatEventTime(event)} • {event.location}
                      </Text>
                      <View style={styles.eventMeta}>
                        <AttendeesList 
                          attendees={event.attendingFriends.map((avatar, idx) => ({
                            id: `${event.id}-${idx}`,
                            user_id: `user-${idx}`,
                            avatar_url: avatar,
                            name: 'Guest'
                          }))}
                          totalCount={event.attendingCount}
                          maxVisible={3}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Animated.View>

          {/* Your Events Section */}
          <Animated.View style={[styles.eventsSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Your Events</Text>
            
            <View style={styles.eventsContainer}>
              {loading ? (
                <Text style={styles.loadingText}>Loading your events...</Text>
              ) : createdEvents.length === 0 ? (
                <Text style={styles.emptyText}>No events created yet. Create your first event!</Text>
              ) : (
                createdEvents.map((event, index) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    onPress={() => handleEventPress(event)}
                  >
                    <Image 
                      source={{ 
                        uri: event.cover_image || `https://api.a0.dev/assets/image?text=${encodeURIComponent(event.title)}&aspect=16:9&seed=${event.id}`
                      }} 
                      style={styles.eventImage}
                    />
                    
                    <View style={styles.eventInfo}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <View style={styles.eventMenuContainer}>
                          <ThreeDotMenu
                            onEdit={() => handleEditEvent(event)}
                            onDelete={() => handleDeleteEvent(event.id)}
                          />
                        </View>
                      </View>
                      
                      <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                        {formatEventTime(event)} • {event.location}
                      </Text>
                      
                      <View style={styles.eventMeta}>
                        <AttendeesList 
                          attendees={event.attendingFriends.map((avatar, idx) => ({
                            id: `${event.id}-${idx}`,
                            user_id: `user-${idx}`,
                            avatar_url: avatar,
                            name: 'Guest'
                          }))}
                          totalCount={event.attendingCount}
                          maxVisible={3}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Out of Town</Text>
                  <Text style={styles.settingDescription}>
                    Hide your profile from event suggestions
                  </Text>
                </View>
                <Switch
                  value={isOutOfTown}
                  onValueChange={handleOutOfTownToggle}
                  trackColor={{ false: '#333', true: '#FF006E' }}
                  thumbColor={isOutOfTown ? '#FFFFFF' : '#666'}
                />
              </View>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Privacy</Text>
                  <Text style={styles.settingDescription}>
                    Manage who can see your activity
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Event reminders and friend activity
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, styles.signOutText]}>Sign Out</Text>
                  <Text style={styles.settingDescription}>
                    Sign out of your account
                  </Text>
                </View>
                <Ionicons name="log-out-outline" size={20} color="#FF006E" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Modals */}
      <ProfileEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={() => {
          toast.success('Profile updated successfully!');
          setShowEditModal(false);
        }}
      />

      <EventModal
        event={selectedEvent}
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        showAttendees={true}
        onEventDeleted={() => {
          setShowEventModal(false);
          fetchUserEvents(); // Refresh events list after deletion
        }}
      />
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -5,
    left: -5,
    zIndex: 1,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0A0A0A',
    zIndex: 2,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  socialHandles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  socialHandle: {
    color: '#888',
    fontSize: 14,
  },
  socialSeparator: {
    color: '#444',
    marginHorizontal: 8,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  socialsContainer: {
    gap: 12,
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
  eventsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  eventsContainer: {
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    height: 120,
    padding: 12,
  },
  eventImage: {
    width: 100,
    height: 96,
    borderRadius: 12,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventMenuContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
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
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  settingsContainer: {
    gap: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888',
  },
  signOutText: {
    color: '#FF006E',
  },
}); 