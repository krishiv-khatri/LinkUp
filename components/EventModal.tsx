import AttendeesList from '@/components/AttendeesList';
import ProgressiveImage from '@/components/ProgressiveImage';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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
  visibility?: 'public' | 'friends_only' | 'private';
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
  onEventDeleted?: () => void;
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

export default function EventModal({ event, visible, onClose, showAttendees = true, onEventDeleted }: EventModalProps) {
  const { user } = useAuth();
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canViewEvent, setCanViewEvent] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(false);


  useEffect(() => {
    if (visible && event) {
      checkEventAccess();
      if (user) {
        checkAttendance();
        if (showAttendees) {
          loadAttendees();
        }
      }
    }
  }, [visible, event, user, showAttendees]);

  const checkEventAccess = async () => {
    if (!event) return;
    
    setCheckingAccess(true);
    try {
      const hasAccess = await eventService.canUserViewEvent(event.id, user?.id);
      setCanViewEvent(hasAccess);
      if (!hasAccess) {
        setTimeout(() => {
          toast.error('You do not have permission to view this event');
          onClose();
        }, 100);
      }
    } catch (error) {
      console.error('Error checking event access:', error);
      setCanViewEvent(false);
    } finally {
      setCheckingAccess(false);
    }
  };

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
                onClose();
                onEventDeleted?.();
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

  if (!event) return null;

  // Show loading state while checking access
  if (checkingAccess) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, styles.centerContent]}>
          <ActivityIndicator size="large" color="#FF006E" />
          <Text style={styles.loadingText}>Verifying access...</Text>
        </View>
      </Modal>
    );
  }

  // Show access denied message
  if (!canViewEvent) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, styles.centerContent]}>
          <Ionicons name="lock-closed-outline" size={64} color="#FF006E" />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            This event is {event.visibility === 'friends_only' ? 'visible to friends only' : 'private'}.
          </Text>
          <TouchableOpacity style={styles.accessDeniedButton} onPress={onClose}>
            <Text style={styles.accessDeniedButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop blur effect */}
        <View style={styles.modalBackdrop} />
        
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Progressive modal image with EventCard aspect ratio */}
        <ProgressiveImage
          source={{ uri: event.coverImage }}
          style={styles.modalImage}
          fadeDuration={250}
          thumbnailSize={200}
          blurRadius={1.5}
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
            <View style={styles.badgesRow}>
              <View style={styles.categoryIndicator}>
                <Ionicons 
                  name="star" 
                  size={14} 
                  color="#888" 
                />
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>
              {event.visibility && event.visibility !== 'public' && (
                <View style={styles.visibilityIndicator}>
                  <Ionicons 
                    name={event.visibility === 'friends_only' ? 'people-outline' : 'lock-closed-outline'} 
                    size={14} 
                    color="#FF006E" 
                  />
                  <Text style={styles.visibilityText}>
                    {event.visibility === 'friends_only' ? 'Friends Only' : 'Private'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.modalDescription}>{event.description}</Text>
          
          {showAttendees && (
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>
                Who's Going
              </Text>
              
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
          )}
          
          <View style={styles.modalDetails}>
            <View style={styles.modalDetailItem}>
              <Ionicons name="calendar-outline" size={16} color="#888" />
              <Text style={styles.modalDetailText}>
                {new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
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
                    onClose();
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
                <View style={[
                  styles.rsvpButtonBackground,
                  isRSVPed && { opacity: 1 }
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
  );
}

const styles = StyleSheet.create({
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
    maxHeight: 400,
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityText: {
    color: '#FF006E',
    fontSize: 12,
    fontWeight: '500',
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
  attendeesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
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
    opacity: 0,
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
  errorText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  accessDeniedTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  accessDeniedButton: {
    backgroundColor: '#FF006E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  accessDeniedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 