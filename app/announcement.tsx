import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { imageUploadService } from '@/services/imageUploadService';
import { notificationService } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

interface Event {
  id: string;
  title: string;
  coverImage: string;
}

export default function AnnouncementScreen() {
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const eventData = await eventService.getEventById(eventId);
      if (eventData) {
        setEvent(eventData);
      } else {
        toast.error('Event not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Failed to load event');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission to access camera roll is required!');
      return;
    }

    // Show action sheet to choose between camera and gallery
    Alert.alert(
      'Select Image',
      'Choose how you want to select your announcement image',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Set the local image immediately for preview
      setSelectedImage(result.assets[0].uri);
      
      // Upload in the background
      uploadImageToSupabase(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Set the local image immediately for preview
      setSelectedImage(result.assets[0].uri);
      
      // Upload in the background
      uploadImageToSupabase(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      
      // Upload using our centralized image upload service
      const uploadResult = await imageUploadService.uploadEventCover(imageUri);
      
      if (uploadResult.success && uploadResult.publicUrl) {
        // Store the uploaded URL
        setUploadedImageUrl(uploadResult.publicUrl);
        return uploadResult.publicUrl;
      } else {
        console.error('Upload error:', uploadResult.error);
        toast.error(uploadResult.error || 'Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!message.trim()) {
      toast.error('Please enter an announcement message');
      return;
    }

    if (!eventId || !event) {
      toast.error('Event information is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = uploadedImageUrl || selectedImage;
      
      if (selectedImage && !uploadedImageUrl) {
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      // Send announcement to all attendees
      const success = await notificationService.sendEventAnnouncement(
        eventId,
        message.trim(),
        imageUrl || null,
        event.title
      );

      if (success) {
        toast.success('Announcement sent successfully!');
        router.back();
      } else {
        toast.error('Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF006E" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Announcement</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formContainer}>
              {/* Event Info */}
              <View style={styles.eventInfoContainer}>
                <Text style={styles.eventInfoTitle}>Event: {event.title}</Text>
                {event.coverImage && (
                  <Image source={{ uri: event.coverImage }} style={styles.eventCoverImage} />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Announcement Message*</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type your announcement message here..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={6}
                  onFocus={() => {
                    // Scroll to bottom when message field is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePickerContainer}
                  onPress={pickImage}
                  disabled={isUploadingImage}
                >
                  {selectedImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                      <View style={styles.imageOverlay}>
                        {isUploadingImage ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons name="camera" size={24} color="white" />
                        )}
                        <Text style={styles.imageOverlayText}>
                          {isUploadingImage ? 'Uploading...' : 'Tap to change'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#666" />
                      <Text style={styles.imagePlaceholderText}>
                        {isUploadingImage ? 'Uploading...' : 'Tap to add image'}
                      </Text>
                      <Text style={styles.imagePlaceholderSubtext}>
                        Optional: Add an image to your announcement
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendAnnouncement}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#FF006E', '#8338EC']}
                  style={styles.sendButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="megaphone" size={20} color="white" />
                      <Text style={styles.sendButtonText}>Send Announcement</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 32, // Same width as back button for centering
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 60,
  },
  formContainer: {
    padding: 20,
  },
  eventInfoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  eventInfoTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventCoverImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagePickerContainer: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  imagePlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  imagePlaceholderSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  sendButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
