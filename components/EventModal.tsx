import AttendeesList from '@/components/AttendeesList';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
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
  creator_name?: string;
  creator_avatar?: string;
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

export default function EventModal({ event, visible, onClose, showAttendees = true, onEventDeleted }: EventModalProps) {
  const { user } = useAuth();
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canViewEvent, setCanViewEvent] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [modalSwipeEnabled, setModalSwipeEnabled] = useState(true);
  const [showAttendeesList, setShowAttendeesList] = useState(false);

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
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        transparent={false}
      >
      <View style={styles.modalContainer}>
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
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progressive modal image behind the title */}
          <Image 
            source={{ uri: event.coverImage }} 
            style={styles.modalImage}
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
            {showAttendees && (
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
                        onPress={() => setShowAttendeesList(true)}
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
            )}
            
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
            </View>
            
            {/* Add bottom padding for scroll */}
            <View style={{ height: 40 }} />
            </ScrollView>
          </NativeViewGestureHandler>
        </View>
      </View>
    </Modal>

    {/* Render AttendeesList modal when showAttendeesList is true */}
    {showAttendeesList && (
      <AttendeesList
        attendees={attendees}
        totalCount={event.attendingCount}
        maxVisible={10}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalInnerContainer: {
    height: '100%',
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    overflow: 'hidden',
    marginTop: 0,
    paddingTop: 0,
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
  modalHeader: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
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
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingTop: 24,
    justifyContent: 'flex-start',
    flexGrow: 1,
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
  modalDescription: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '400',
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
  loadingContainer: {
    paddingVertical: 10,
    alignItems: 'center',
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
  rsvpButtonText: {
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