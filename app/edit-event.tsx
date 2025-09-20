import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { imageUploadService } from '@/services/imageUploadService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
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

const CATEGORIES = [
  { id: 'music', label: 'Music', icon: 'musical-notes' },
  { id: 'party', label: 'Party', icon: 'wine' },
  { id: 'art', label: 'Art', icon: 'color-palette' },
  { id: 'food', label: 'Food', icon: 'restaurant' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
  { id: 'sport', label: 'Sport', icon: 'fitness' },
  { id: 'tech', label: 'Tech', icon: 'laptop' },
];

export default function EditEventScreen() {
  const { user } = useAuth();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(new Date());
  const [timeString, setTimeString] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends_only' | 'private'>('public');
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
      const event = await eventService.getEventById(eventId);
      if (event) {
        setTitle(event.title);
        setTimeString(event.time);
        // Parse the existing time string to create a Date object
        const [timePart, period] = event.time.split(' ');
        const [hours, minutes] = timePart.split(':');
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        
        const timeDate = new Date();
        timeDate.setHours(hour24, parseInt(minutes), 0, 0);
        setTime(timeDate);
        
        setDate(new Date(event.date));
        setLocation(event.location);
        setCategory(event.category);
        setDescription(event.description);
        setVisibility(event.visibility || 'public');
        setSelectedImage(event.coverImage);
        setUploadedImageUrl(event.coverImage);
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
      'Choose how you want to select your cover image',
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

  const handleUpdateEvent = async () => {
    if (!title || !timeString || !location || !category || !description || !visibility) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!eventId) {
      toast.error('Event ID is missing');
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
      
      const updates = {
        title,
        time: timeString,
        date: date.toISOString().split('T')[0],
        location,
        category,
        coverImage: imageUrl || '',
        description,
        visibility,
      };
      
      console.log('Updating event with ID:', eventId, 'and updates:', updates);
      const updatedEvent = await eventService.updateEvent(eventId, updates);

      if (updatedEvent) {
        toast.success('Event updated successfully!');
        router.back();
      } else {
        toast.error('Failed to update event - event may not exist');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      // On Android, hide the picker immediately
      setShowDatePicker(false);
    }
    
    // Update the date if a new date was selected
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime: Date | undefined) => {
    if (Platform.OS === 'android') {
      // On Android, hide the picker immediately
      setShowTimePicker(false);
    }
    
    // Update the time if a new time was selected
    if (selectedTime) {
      setTime(selectedTime);
      setTimeString(formatTime(selectedTime));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Event Title*</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter event title"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date*</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#888" />
                </TouchableOpacity>
              </View>

              {/* iOS Modal Date Picker */}
              {Platform.OS === 'ios' && (
                <Modal
                  transparent={true}
                  visible={showDatePicker}
                  animationType="slide"
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.datePickerTitle}>Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                        style={styles.iosDatePicker}
                      />
                    </View>
                  </View>
                </Modal>
              )}

              {/* Android Date Picker */}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={date}
                  mode="date"
                  is24Hour={true}
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* iOS Modal Time Picker */}
              {Platform.OS === 'ios' && (
                <Modal
                  transparent={true}
                  visible={showTimePicker}
                  animationType="slide"
                  onRequestClose={() => setShowTimePicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.datePickerCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.datePickerTitle}>Select Time</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        testID="timeTimePicker"
                        value={time}
                        mode="time"
                        display="spinner"
                        onChange={onTimeChange}
                        style={styles.iosDatePicker}
                      />
                    </View>
                  </View>
                </Modal>
              )}

              {/* Android Time Picker */}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  testID="timeTimePicker"
                  value={time}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time*</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {timeString || 'Select time'}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location*</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category*</Text>
                <View style={styles.categoryContainer}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryButton,
                        category === cat.id && styles.categoryButtonActive
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={20}
                        color={category === cat.id ? 'white' : '#888'}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          category === cat.id && styles.categoryTextActive
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Visibility*</Text>
                <View style={styles.visibilityContainer}>
                  <TouchableOpacity
                    style={[
                      styles.visibilityButton,
                      visibility === 'public' && styles.visibilityButtonActive
                    ]}
                    onPress={() => setVisibility('public')}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={visibility === 'public' ? 'white' : '#888'}
                    />
                    <Text
                      style={[
                        styles.visibilityText,
                        visibility === 'public' && styles.visibilityTextActive
                      ]}
                    >
                      Public
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.visibilityButton,
                      visibility === 'friends_only' && styles.visibilityButtonActive
                    ]}
                    onPress={() => setVisibility('friends_only')}
                  >
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={visibility === 'friends_only' ? 'white' : '#888'}
                    />
                    <Text
                      style={[
                        styles.visibilityText,
                        visibility === 'friends_only' && styles.visibilityTextActive
                      ]}
                    >
                      Friends Only
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.visibilityButton,
                      visibility === 'private' && styles.visibilityButtonActive
                    ]}
                    onPress={() => setVisibility('private')}
                  >
                    <Ionicons
                      name="eye-off-outline"
                      size={18}
                      color={visibility === 'private' ? 'white' : '#888'}
                    />
                    <Text
                      style={[
                        styles.visibilityText,
                        visibility === 'private' && styles.visibilityTextActive
                      ]}
                    >
                      Private
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cover Image</Text>
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
                      <Ionicons name="camera-outline" size={48} color="#666" />
                      <Text style={styles.imagePlaceholderText}>
                        {isUploadingImage ? 'Uploading...' : 'Tap to add cover image'}
                      </Text>
                      <Text style={styles.imagePlaceholderSubtext}>
                        Or leave blank for auto-generated image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description*</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter event description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  onFocus={() => {
                    // Scroll to bottom when description field is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleUpdateEvent}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#FF006E', '#8338EC']}
                  style={styles.createButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.createButtonText}>Update Event</Text>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 60, // Reduced padding
  },
  formContainer: {
    padding: 20,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#FF006E',
    borderColor: '#FF006E',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  visibilityContainer: {
    gap: 12,
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  visibilityButtonActive: {
    backgroundColor: '#FF006E',
    borderColor: '#FF006E',
  },
  visibilityText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  visibilityTextActive: {
    color: '#ffffff',
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
  createButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  createButtonDisabled: {
    backgroundColor: '#333',
  },
  createButtonTextDisabled: {
    color: '#666',
  },
  dateButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#ffffff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    padding: 20,
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  datePickerCancel: {
    color: '#FF006E',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  datePickerDone: {
    color: '#FF006E',
    fontSize: 16,
    fontWeight: '500',
  },
  iosDatePicker: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    color: 'white',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 