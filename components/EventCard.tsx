import FriendProfileModal from '@/components/FriendProfileModal';
import ProgressiveImage from '@/components/ProgressiveImage';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface Event {
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
  creator_name?: string; // Add creator name field
  creator_avatar?: string; // Add creator avatar field
  visibility?: 'public' | 'friends_only' | 'private'; // Add visibility field
}

interface EventCardProps {
  event: Event;
  index: number;
  isRSVPed?: boolean; // Add optional prop for pre-computed RSVP status
}

const getCategoryGradient = (category: string): readonly [string, string] => {
  switch (category) {
    case 'music':
      return ['#FF006E', '#8338EC'] as const;
    case 'party':
      return ['#FF6B35', '#F7931E'] as const;
    case 'art':
      return ['#8338EC', '#3A86FF'] as const;
    case 'food':
      return ['#FF006E', '#FF6B35'] as const;
    default:
      return ['#FF006E', '#8338EC'] as const;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'music':
      return 'musical-notes';
    case 'party':
      return 'wine';
    case 'art':
      return 'color-palette';
    case 'food':
      return 'restaurant';
    default:
      return 'star';
  }
};

// Custom Calendar Component
const EventCalendar = ({ date }: { date: string }) => {
  const eventDate = new Date(date);
  const month = eventDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const day = eventDate.getDate();
  const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
  
  return (
    <View style={styles.calendarContainer}>
      {/* Red header section */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarMonth}>{month}</Text>
      </View>
      {/* White body section */}
      <View style={styles.calendarBody}>
        <Text style={styles.calendarDay}>{day}</Text>
        <Text style={styles.calendarDayOfWeek}>{dayOfWeek}</Text>
      </View>
    </View>
  );
};

export default function EventCard({ event, index, isRSVPed: initialRSVPed }: EventCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRSVPed, setIsRSVPed] = useState(initialRSVPed || false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const [modalImageLoadError, setModalImageLoadError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [modalSwipeEnabled, setModalSwipeEnabled] = useState(true);
  

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rsvpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 150,
      useNativeDriver: true,
    }).start();

    // Subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Set modal image state
    setIsModalImageLoaded(false);
    setModalImageLoadError(false);

    // Only check attendance if not provided as prop
    if (initialRSVPed === undefined) {
      const checkAttendance = async () => {
        if (user) {
          const isAttending = await eventService.isAttending(event.id, user.id);
          setIsRSVPed(isAttending);
        }
      };
      checkAttendance();
    }
  }, [user, event.id, event.coverImage, event.attendingFriends, index, initialRSVPed]);

  // When modal opens, set image state
  useEffect(() => {
    if (isExpanded && !isModalImageLoaded && !modalImageLoadError) {
      // Set modal image as loaded for direct rendering
      setIsModalImageLoaded(true);
      setModalImageLoadError(false);
    }
  }, [isExpanded, event.coverImage, isModalImageLoaded, modalImageLoadError]);

  // Load attendees for the event
  const loadAttendees = async () => {
    if (!event) return;
    
    setLoadingAttendees(true);
    try {
      const attendeesList = await eventService.getAttendees(event.id);
      setAttendees(attendeesList);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Handle card press with immediate image preparation
  const handleCardPress = () => {
    console.log('🎯 Card pressed, preparing modal image...');
    
    setIsModalImageLoaded(true);
    
    // Initialize RSVP animation state based on current RSVP status
    if (isRSVPed) {
      rsvpAnim.setValue(1);
    } else {
      rsvpAnim.setValue(0);
    }
    
    // Load attendees when modal opens
    loadAttendees();
    setIsExpanded(true);
  };

  const handleDeleteEvent = async () => {
    if (!event || !user || event.creator_id !== user.id) {
      toast.error('You can only delete your own events');
      return;
    }

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await eventService.deleteEvent(event.id);
              if (success) {
                toast.success('Event deleted successfully');
                setIsExpanded(false);
                // Note: Parent component should handle refreshing the events list
              } else {
                toast.error('Failed to delete event');
              }
            } catch (error) {
              console.error('Delete error:', error);
              toast.error('Something went wrong while deleting the event');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleRSVP = async () => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    setIsLoading(true);
    try {
      if (isRSVPed) {
        // Cancel RSVP
        const success = await eventService.cancelRsvp(event.id, user.id);
        if (success) {
          setIsRSVPed(false);
          toast.success('RSVP cancelled');
          
          // Animate RSVP button back to normal
          Animated.timing(rsvpAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start();
          
          // Refresh attendees
          loadAttendees();
        } else {
          toast.error('Failed to cancel RSVP');
        }
      } else {
        // Add RSVP
        const avatarUrl = user.avatarUrl || 
          `https://api.a0.dev/assets/image?text=${user.email?.slice(0, 1)}&aspect=1:1&seed=${user.id.slice(0, 8)}`;
        
        const success = await eventService.rsvpToEvent(event.id, user.id, avatarUrl);
        
        if (success) {
          setIsRSVPed(true);
          
          // Animate RSVP button with smooth gradient
          Animated.timing(rsvpAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }).start();
          
          // Refresh attendees
          loadAttendees();
        } else {
          toast.error('Failed to RSVP');
        }
      }
    } catch (error) {
      console.error('RSVP error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <>
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handleCardPress}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.glowBorder, { opacity: glowOpacity }]}>
            <LinearGradient
              colors={getCategoryGradient(event.category)}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <View style={styles.cardContent}>
            {/* Progressive cover image */}
            <ProgressiveImage
              source={{ uri: event.coverImage }}
              style={styles.coverImage}
              fadeDuration={250}
              thumbnailSize={150}
              blurRadius={2}
            />
            
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageOverlay}
            />

            <View style={styles.cardInfo}>
              <View style={styles.badgeContainer}>
                <View style={styles.categoryBadge}>
                  <LinearGradient
                    colors={getCategoryGradient(event.category)}
                    style={styles.categoryGradient}
                  >
                    <Ionicons 
                      name={getCategoryIcon(event.category) as any} 
                      size={12} 
                      color="white" 
                    />
                  </LinearGradient>
                </View>
                {event.visibility && event.visibility !== 'public' && (
                  <View style={styles.visibilityBadge}>
                    <Ionicons 
                      name={event.visibility === 'friends_only' ? 'people-outline' : 'lock-closed-outline'} 
                      size={10} 
                      color="#FF006E" 
                    />
                  </View>
                )}
              </View>

              <Text style={styles.eventTitle}>{event.title}</Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={14} color="#888" />
                  <Text style={styles.detailText}>{new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.detailText}>{event.time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={styles.detailText}>{event.location}</Text>
                </View>
              </View>

              <View style={styles.attendingSection}>
                <View style={styles.friendAvatars}>
                  {event.attendingFriends.slice(0, 3).map((avatar, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: avatar }}
                      style={[styles.friendAvatar, { marginLeft: idx > 0 ? -8 : 0 }]}
                    />
                  ))}
                  {event.attendingFriends.length > 3 && (
                    <View style={[styles.friendAvatar, styles.moreCount, { marginLeft: -8 }]}>
                      <Text style={styles.moreCountText}>+{event.attendingFriends.length - 3}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.attendingText}>
                  {event.attendingCount} going
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        isVisible={isExpanded}
        onBackdropPress={() => setIsExpanded(false)}
        onBackButtonPress={() => setIsExpanded(false)}
        style={styles.modalContainer}
        backdropOpacity={0.4}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver={false}
        hideModalContentWhileAnimating={false}
        swipeDirection={modalSwipeEnabled ? ['down'] : []}
        onSwipeComplete={() => setIsExpanded(false)}
        propagateSwipe
      >
                                    <View style={styles.modalInnerContainer}>
                    {/* Swipe indicator */}
                    <View style={styles.swipeIndicator} />
                    
                    <View style={styles.modalHeader}>
            <View style={styles.modalTitleSection}>
              <View style={styles.titleRow}>
                <Text style={styles.modalTitle}>{event.title}</Text>
              </View>
            </View>
            
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.shareButtonTop}>
                <Ionicons name="share-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsExpanded(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progressive modal image behind the title */}
          <Image 
            source={{ uri: event.coverImage }} 
            style={[
              styles.modalImage, 
              { 
                opacity: isModalImageLoaded ? 1 : 0,
                position: isModalImageLoaded ? 'relative' : 'absolute'
              }
            ]}
            onLoad={() => {
              console.log('🖼️ Modal image loaded successfully');
              setIsModalImageLoaded(true);
              setModalImageLoadError(false);
            }}
            onError={(error) => {
              console.error('❌ Modal image failed to load:', error);
              setIsModalImageLoaded(false);
              setModalImageLoadError(true);
            }}
            onLoadStart={() => {
              console.log('📥 Modal image load started');
            }}
          />
          
          {/* Top gradient fade */}
          <LinearGradient
            colors={['rgba(0,0,0,1)', 'transparent']}
            style={styles.modalTopGradient}
          />
          
          {/* Bottom gradient fade */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,1)']}
            style={styles.modalBottomGradient}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,1)']}
            style={styles.modalBottomGradientx}
          />
          <LinearGradient
            colors={['rgba(0,0,0,1)', 'transparent']}
            style={styles.modalBottomGradienty}
          />

          <NativeViewGestureHandler>
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              onTouchStart={() => setModalSwipeEnabled(false)}
              onTouchEnd={() => setModalSwipeEnabled(true)}
              onScrollEndDrag={() => setModalSwipeEnabled(true)}
            >
            {/* Category and Privacy indicators below the image */}
            <View style={styles.modalCategorySection}>
              <View style={styles.modalCategoryIndicator}>
                <Ionicons 
                  name={getCategoryIcon(event.category)} 
                  size={12} 
                  color="#FF006E" 
                />
                <Text style={styles.modalCategoryText}>{event.category}</Text>
              </View>
              {event.visibility && event.visibility !== 'public' && (
                <View style={styles.modalVisibilityIndicator}>
                  <Ionicons 
                    name={event.visibility === 'friends_only' ? 'people-outline' : 'lock-closed-outline'} 
                    size={12} 
                    color="#FF006E" 
                  />
                  <Text style={styles.modalVisibilityText}>
                    {event.visibility === 'friends_only' ? 'Friends Only' : 'Private'}
                  </Text>
                </View>
              )}
              
              {/* Hosted By section - aligned to the right */}
              <View style={styles.hostedByContainer}>
                <Text style={styles.hostedByText}>Hosted by:</Text>
                <Image 
                  source={{ uri: event.creator_avatar || 'https://api.a0.dev/assets/image?text=H&aspect=1:1&seed=host' }} 
                  style={styles.hostAvatar}
                />
                <Text style={styles.hostName}>{event.creator_name || 'Unknown Host'}</Text>
              </View>
            </View>

            <Text style={styles.modalDescription}>{event.description}</Text>
            
            {/* Who's Going Section with horizontal scrolling */}
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>Who's Going</Text>
              
              {loadingAttendees ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#888" />
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attendeesScrollContainer}
                >
                  {attendees.map((attendee, index) => (
                    <TouchableOpacity
                      key={attendee.id}
                      style={styles.attendeeButton}
                      onPress={() => {
                        setSelectedFriend({
                          id: attendee.user_id,
                          username: attendee.name,
                          display_name: attendee.name,
                          avatar_url: attendee.avatar_url,
                        });
                        setShowFriendModal(true);
                      }}
                    >
                      <Image 
                        source={{ uri: attendee.avatar_url }} 
                        style={styles.attendeeAvatar}
                      />
                      <Text style={styles.attendeeName} numberOfLines={1}>
                        {attendee.name || 'Guest'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {event.attendingCount > attendees.length && (
                    <View style={styles.moreAttendeesButton}>
                      <Text style={styles.moreAttendeesText}>
                        +{event.attendingCount - attendees.length} more
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
            
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailsLeft}>
                <View style={styles.modalDetailItem}>
                  <Ionicons name="time-outline" size={20} color="#FF006E" />
                  <Text style={styles.modalDetailText}>{event.time}</Text>
                </View>
                <View style={styles.modalDetailItem}>
                  <Ionicons name="location-outline" size={20} color="#FF006E" />
                  <Text style={styles.modalDetailText}>{event.location}</Text>
                </View>
              </View>
              <View style={styles.modalDetailItem}>
                <EventCalendar date={event.date}/>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {user && event.creator_id === user.id ? (
                <View style={styles.creatorActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => {
                      setIsExpanded(false);
                      router.push(`/edit-event?eventId=${event.id}`);
                    }}
                  >
                    <View style={styles.editButtonContent}>
                      <Ionicons name="create-outline" size={16} color="#000000" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.announcementButton}
                    onPress={() => {
                      setIsExpanded(false);
                      router.push(`/announcement?eventId=${event.id}`);
                    }}
                  >
                    <View style={styles.announcementButtonContent}>
                      <Ionicons name="megaphone-outline" size={16} color="#000000" />
                      <Text style={styles.announcementButtonText}>Announce</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={handleDeleteEvent}
                    disabled={isDeleting}
                  >
                    <View style={styles.deleteButtonContent}>
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <Text style={styles.deleteButtonText}>Cancel</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.rsvpButton}
                  onPress={handleRSVP}
                  disabled={isLoading}
                >
                  <Animated.View style={[
                    styles.rsvpButtonBackground,
                    {
                      opacity: rsvpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      })
                    }
                  ]} />
                  <View style={styles.rsvpButtonContent}>
                    {isLoading ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Text style={[
                        styles.rsvpButtonText,
                        isRSVPed && styles.rsvpButtonTextGoing
                      ]}>
                        {isRSVPed ? 'Going' : 'RSVP'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Add bottom padding for scroll */}
            <View style={{ height: 40 }} />
            </ScrollView>
          </NativeViewGestureHandler>
        </View>
      </Modal>

      {/* Render FriendProfileModal outside the event modal to avoid z-index conflicts */}
      <FriendProfileModal
        visible={showFriendModal}
        friend={selectedFriend}
        onClose={() => setShowFriendModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 24,
  },
  card: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    zIndex: -1,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    borderRadius: 22,
  },
  cardContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 0,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  badgeContainer: {
    position: 'absolute',
    top: -180,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  categoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  visibilityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  attendingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  // Modal styles
  modalContainer: {
    margin: 0,
    padding: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    // Ensure rounded corners are visible
    borderRadius: 24,
    overflow: 'hidden',
  },

  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalTitleSection: {
    flex: 1,
    maxWidth: '70%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -0.5,
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  categoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityText: {
    color: '#FF006E',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTopGradient: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  modalBottomGradient: {
    position: 'absolute',
    top: 220,
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  modalBottomGradientx: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  modalBottomGradienty: {
    position: 'absolute',
    top: 320,
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 1,
  },
  categoryText: {
    fontSize: 10,
    color: '#FF006E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerButtons: {
    position: 'absolute',
    top: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  shareButtonTop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 4/3,
    resizeMode: 'cover',
    maxHeight: 350,
    marginBottom: 5,
  },
  modalImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
    marginTop: -100, // Position relative to the image
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingTop: 24,
    justifyContent: 'flex-start',
    flexGrow: 1,
  },
  modalDescription: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '400',
  },
  modalDetails: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalDetailsLeft: {
    flex: 1,
    gap: 16,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
  },
  modalDetailText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  attendeesSection: {
    marginBottom: 20,
  },
  attendeesTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  attendeesScrollContainer: {
    paddingVertical: 4,
    gap: 12,
  },
  attendeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 12,
  },
  attendeeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 20,
  },
  attendeeName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  moreAttendeesButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  moreAttendeesText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  rsvpButtonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#22c55e',
    borderRadius: 12,
  },
  rsvpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  rsvpButtonActive: {
    backgroundColor: '#22c55e',
  },
  rsvpButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  rsvpButtonTextActive: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  rsvpButtonTextGoing: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  creatorActions: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  editButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  announcementButton: {
    flex: 1,
    backgroundColor: '#b2d8d8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  announcementButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  announcementButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  shareButtonText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    gap: 8,
  },
  loadingText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  modalCategorySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    marginTop: -15,
    flexWrap: 'wrap',
  },
  modalCategoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF006E',
  },
  modalVisibilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF006E',
  },
  modalCategoryText: {
    fontSize: 10,
    color: '#FF006E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalVisibilityText: {
    color: '#FF006E',
    fontSize: 10,
    fontWeight: '600',
  },
  hostedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hostedByText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
  },
  hostAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  hostName: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalInnerContainer: {
    height: '90%',
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    overflow: 'hidden',
  },
  // New styles for calendar component
  calendarContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#FF006E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calendarHeader: {
    width: '100%',
    height: '25%',
    backgroundColor: '#FF006E',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  calendarBody: {
    width: '100%',
    height: '75%',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  calendarMonth: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarDay: {
    color: 'white',
    fontSize: 44,
    fontWeight: 'bold',
    marginTop: -10,
  },
  calendarDayOfWeek: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },
});