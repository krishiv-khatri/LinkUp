import AttendeesList from '@/components/AttendeesList';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { imagePreloader } from '@/utils/imagePreloader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { toast } from 'sonner-native';

interface Event {
  id: string;
  title: string;
  time: string;
  date: string;
  location: string;
  category: string;
  attendingFriends: string[];
  attendingCount: number;
  coverImage: string;
  description: string;
  creator_id?: string;
}

interface Attendee {
  id: string;
  user_id: string;
  avatar_url: string;
  name?: string;
}

interface EventModalProps {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
  showAttendees?: boolean;
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

export default function EventModal({ event, visible, onClose, showAttendees = true }: EventModalProps) {
  const { user } = useAuth();
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    if (visible && event && user) {
      checkAttendance();
      if (showAttendees) {
        loadAttendees();
      }
      
      // Preload the event image when modal opens
      imagePreloader.preloadSingleImage(event.coverImage).then((success) => {
        if (success) {
          setIsImageLoaded(true);
          setImageLoadError(false);
        } else {
          setImageLoadError(true);
        }
      });
      
      // Check if image is already cached
      setIsImageLoaded(imagePreloader.isImageCached(event.coverImage));
      setImageLoadError(imagePreloader.isImageFailed(event.coverImage));
    }
  }, [visible, event, user, showAttendees]);

  const checkAttendance = async () => {
    if (!event || !user) return;
    
    const isAttending = await eventService.isAttending(event.id, user.id);
    setIsRSVPed(isAttending);
  };

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

  const handleRSVP = async () => {
    if (!user || !event) {
      toast.error('Please sign in to RSVP');
      return;
    }

    setIsLoading(true);
    try {
      if (isRSVPed) {
        const success = await eventService.cancelRsvp(event.id, user.id);
        if (success) {
          setIsRSVPed(false);
          toast.success('RSVP cancelled');
          // Refresh attendees if shown
          if (showAttendees) {
            loadAttendees();
          }
        } else {
          toast.error('Failed to cancel RSVP');
        }
      } else {
        const avatarUrl = user.avatarUrl || 
          `https://api.a0.dev/assets/image?text=${user.email?.slice(0, 1)}&aspect=1:1&seed=${user.id.slice(0, 8)}`;
        
        const success = await eventService.rsvpToEvent(event.id, user.id, avatarUrl);
        
        if (success) {
          setIsRSVPed(true);
          toast.success('You\'re going! 🎉');
          // Refresh attendees if shown
          if (showAttendees) {
            loadAttendees();
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

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Image loading placeholder */}
        {!isImageLoaded && !imageLoadError && (
          <View style={[styles.modalImage, styles.imagePlaceholder]}>
            <ActivityIndicator size="large" color="#FF006E" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}
        
        {/* Error placeholder */}
        {imageLoadError && (
          <View style={[styles.modalImage, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#666" />
            <Text style={styles.errorText}>Image unavailable</Text>
          </View>
        )}

        {/* Main modal image */}
        <Image 
          source={{ uri: event.coverImage }} 
          style={[styles.modalImage, { opacity: isImageLoaded ? 1 : 0 }]}
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
          colors={['transparent', 'rgba(10,10,10,0.95)']}
          style={styles.modalOverlay}
        />

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>{event.title}</Text>
          <Text style={styles.modalDescription}>{event.description}</Text>
          
          <View style={styles.modalDetails}>
            <View style={styles.modalDetailItem}>
              <Ionicons name="calendar" size={20} color="#FF006E" />
              <Text style={styles.modalDetailText}>
                {new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
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

          {showAttendees && (
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>
                Who's Going
              </Text>
              
              {loadingAttendees ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FF006E" />
                </View>
              ) : (
                <AttendeesList 
                  attendees={attendees} 
                  totalCount={event.attendingCount} 
                />
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.rsvpButton, isRSVPed && styles.rsvpButtonActive]}
            onPress={handleRSVP}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isRSVPed ? ['#00C853', '#4CAF50'] : getCategoryGradient(event.category)}
              style={styles.rsvpGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={isRSVPed ? "checkmark-circle" : "add-circle"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.rsvpButtonText}>
                    {isRSVPed ? "You're Going!" : "RSVP"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Add bottom padding for scroll */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginTop: -50,
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
  attendeesSection: {
    marginBottom: 32,
  },
  attendeesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
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
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  loadingText: {
    color: '#FF006E',
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
}); 