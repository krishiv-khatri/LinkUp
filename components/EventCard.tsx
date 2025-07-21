import AttendeesList from '@/components/AttendeesList';
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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
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
        visible={isExpanded}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop blur effect */}
          <View style={styles.modalBackdrop} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsExpanded(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Image loading placeholder for modal */}
          {!isModalImageLoaded && !modalImageLoadError && (
            <View style={[styles.modalImage, styles.imagePlaceholder]}>
              <ActivityIndicator size="large" color="#888" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
          
          {/* Error placeholder for modal */}
          {modalImageLoadError && (
            <View style={[styles.modalImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color="#666" />
              <Text style={styles.errorText}>Image unavailable</Text>
            </View>
          )}

          {/* Main modal image - always render for better caching */}
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
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.modalOverlay}
          />

          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle}>{event.title}</Text>
              <View style={styles.categoryIndicator}>
                <Ionicons 
                  name={getCategoryIcon(event.category)} 
                  size={14} 
                  color="#888" 
                />
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>
            </View>
            
            <Text style={styles.modalDescription}>{event.description}</Text>
            
            {/* Who's Going Section */}
            <View style={styles.attendeesSection}>
              <View style={styles.attendeesTitleRow}>
                <Text style={styles.attendeesTitle}>Who's Going</Text>
                {event.attendingCount > 0 && (
                  <View style={styles.attendeesBadge}>
                    <Text style={styles.attendeesBadgeText}>{event.attendingCount}</Text>
                  </View>
                )}
              </View>
              
              {loadingAttendees ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#888" />
                </View>
              ) : (
                <AttendeesList 
                  attendees={attendees} 
                  totalCount={event.attendingCount} 
                />
              )}
            </View>
            
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailItem}>
                <Ionicons name="calendar-outline" size={16} color="#888" />
                <Text style={styles.modalDetailText}>{new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}</Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Ionicons name="time-outline" size={16} color="#888" />
                <Text style={styles.modalDetailText}>{event.time}</Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Ionicons name="location-outline" size={16} color="#888" />
                <Text style={styles.modalDetailText}>{event.location}</Text>
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
              
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={16} color="#888" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
            
            {/* Add bottom padding for scroll */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
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
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    zIndex: -1,
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
  categoryBadge: {
    position: 'absolute',
    top: -180,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
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
    flex: 1,
    backgroundColor: '#000000',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
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
  modalImage: {
    width: '100%',
    aspectRatio: 4/3,
    resizeMode: 'cover',
    maxHeight: 350,
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
    justifyContent: 'flex-end',
    flexGrow: 1,
  },
  modalTitleSection: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  categoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 15,
    color: '#cccccc',
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '400',
  },
  modalDetails: {
    marginBottom: 24,
    gap: 8,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  attendeesSection: {
    marginBottom: 24,
  },
  attendeesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attendeesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  attendeesBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attendeesBadgeText: {
    color: '#888',
    fontSize: 12,
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
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
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
});