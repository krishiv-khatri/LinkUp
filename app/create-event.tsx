import { useAuth } from '@/contexts/AuthContext';
import { eventService, sendNewEventPushNotification } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
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
];

export default function CreateEventScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      
      // Create a unique filename
      const fileExtension = imageUri.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExtension}`;
      
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to Supabase storage
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image');
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);
      
      // Store the uploaded URL
      setUploadedImageUrl(publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!title || !time || !location || !category || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use uploaded image URL or generate a default one
      let imageUrl = `https://api.a0.dev/assets/image?text=${encodeURIComponent(title)}&aspect=16:9&seed=${Date.now()}`;
      
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      } else if (selectedImage) {
        // If image was selected but not uploaded yet, upload it now
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      // Log the event data being sent for debugging
      const eventData = {
        title,
        time,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        location,
        category,
        coverImage: imageUrl,
        description,
        creator_id: user?.id || '', // Add creator_id
      };
      
      console.log('Creating event with data:', eventData);
      
      const event = await eventService.createEvent(eventData);

      if (event) {
        toast.success('Event created successfully!');
        // Send push notification to all users
        await sendNewEventPushNotification(event.title, event.id);
        // Automatically RSVP the creator to the event
        if (user) {
          await eventService.rsvpToEvent(
            event.id,
            user.id,
            user.avatarUrl || `https://api.a0.dev/assets/image?text=${user.email?.slice(0, 1)}&aspect=1:1&seed=${user.id}`
          );
        }
        router.back();
      } else {
        toast.error('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      // Show more specific error message
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{
          title: '',
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: 'white',
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time*</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g. 8:00 PM"
                placeholderTextColor="#666"
              />
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
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleCreateEvent}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['#FF006E', '#8338EC']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="white" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Create Event</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#FF006E',
  },
  categoryText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 14,
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  button: {
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  imagePickerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 200,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
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
}); 