import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { imagePreloader } from '@/utils/imagePreloader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const [modalImageLoadError, setModalImageLoadError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

    // Preload images for this card and attendee avatars
    const imagesToPreload = [
      event.coverImage,
      ...event.attendingFriends.filter(avatar => avatar && typeof avatar === 'string')
    ];
    imagePreloader.preloadImages(imagesToPreload, index < 3 ? 'high' : 'low');

    // Check if main image is already cached
    setIsImageLoaded(imagePreloader.isImageCached(event.coverImage));
    setImageLoadError(imagePreloader.isImageFailed(event.coverImage));
    
    // Also set modal image state based on cache
    setIsModalImageLoaded(imagePreloader.isImageCached(event.coverImage));
    setModalImageLoadError(imagePreloader.isImageFailed(event.coverImage));

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

  // When modal opens, ensure image is preloaded with high priority
  useEffect(() => {
    if (isExpanded && !isModalImageLoaded && !modalImageLoadError) {
      imagePreloader.preloadSingleImage(event.coverImage).then((success) => {
        if (success) {
          setIsModalImageLoaded(true);
          setModalImageLoadError(false);
        } else {
          setModalImageLoadError(true);
        }
      });
    }
  }, [isExpanded, event.coverImage, isModalImageLoaded, modalImageLoadError]);

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
          
          // Update the attendee count by fetching the current count
          const newCount = await eventService.getAttendeeCount(event.id);
          event.attendingCount = newCount;
          
          // Remove user's avatar from the attending friends list
          const userAvatar = user.avatarUrl || 
            `https://api.a0.dev/assets/image?text=${user.email?.slice(0, 1)}&aspect=1:1&seed=${user.id.slice(0, 8)}`;
          event.attendingFriends = event.attendingFriends.filter(avatar => avatar !== userAvatar);
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
          toast.success('You\'re going! 🎉');
          
          // Update the attendee count by fetching the current count
          const newCount = await eventService.getAttendeeCount(event.id);
          event.attendingCount = newCount;
          
          // Add user's avatar to the attending friends list if not already there
          if (!event.attendingFriends.includes(avatarUrl)) {
            event.attendingFriends = [avatarUrl, ...event.attendingFriends].slice(0, 5);
          }
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
          onPress={() => setIsExpanded(true)}
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
            {/* Image loading placeholder */}
            {!isImageLoaded && !imageLoadError && (
              <View style={[styles.coverImage, styles.imagePlaceholder]}>
                <ActivityIndicator size="small" color="#FF006E" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}
            
            {/* Error placeholder */}
            {imageLoadError && (
              <View style={[styles.coverImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={32} color="#666" />
                <Text style={styles.errorText}>Image unavailable</Text>
              </View>
            )}
            
            {/* Main cover image */}
            <Image 
              source={{ uri: event.coverImage }} 
              style={[styles.coverImage, { opacity: isImageLoaded ? 1 : 0 }]}
              onLoad={() => {
                setIsImageLoaded(true);
                setImageLoadError(false);
              }}
              onError={() => {
                setIsImageLoaded(false);
                setImageLoadError(true);
              }}
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
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsExpanded(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Image loading placeholder for modal */}
          {!isModalImageLoaded && !modalImageLoadError && (
            <View style={[styles.modalImage, styles.imagePlaceholder]}>
              <ActivityIndicator size="small" color="#FF006E" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
          
          {/* Error placeholder for modal */}
          {modalImageLoadError && (
            <View style={[styles.modalImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color="#666" />
              <Text style={styles.errorText}>Image unavailable</Text>
            </View>
          )}

          {/* Main modal image */}
          <Image 
            source={{ uri: event.coverImage }} 
            style={[styles.modalImage, { opacity: isModalImageLoaded ? 1 : 0 }]}
            onLoad={() => {
              setIsModalImageLoaded(true);
              setModalImageLoadError(false);
            }}
            onError={() => {
              setIsModalImageLoaded(false);
              setModalImageLoadError(true);
            }}
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.95)']}
            style={styles.modalOverlay}
          />

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{event.title}</Text>
            <Text style={styles.modalDescription}>{event.description}</Text>
            
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailItem}>
                <Ionicons name="calendar" size={20} color="#FF006E" />
                <Text style={styles.modalDetailText}>{new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Ionicons name="time" size={20} color="#FF006E" />
                <Text style={styles.modalDetailText}>{event.time}</Text>
              </View>
              <View style={styles.modalDetailItem}>
                <Ionicons name="location" size={20} color="#FF006E" />
                <Text style={styles.modalDetailText}>{event.location}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.rsvpButton, isRSVPed && styles.rsvpButtonActive]}
              onPress={handleRSVP}
            >
              <LinearGradient
                colors={isRSVPed ? ['#00C853', '#4CAF50'] : getCategoryGradient(event.category)}
                style={styles.rsvpGradient}
              >
                <Ionicons 
                  name={isRSVPed ? "checkmark-circle" : "add-circle"} 
                  size={20} 
                  color="white" 
                />
                <Text style={styles.rsvpButtonText}>
                  {isRSVPed ? "You're Going!" : "RSVP"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
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
    padding: 20,
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#CCC',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalDetails: {
    marginBottom: 32,
    gap: 12,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDetailText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  rsvpButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  rsvpButtonActive: {
    // Additional styles for active state if needed
  },
  rsvpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  rsvpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
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