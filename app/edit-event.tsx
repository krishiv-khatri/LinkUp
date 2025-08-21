import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { imageUploadService } from '@/services/imageUploadService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
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
        setTime(event.time);
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission to access camera roll is required!');
      return;
    }

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
      setSelectedImage(result.assets[0].uri);
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
      setSelectedImage(result.assets[0].uri);
      uploadImageToSupabase(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      
      // Upload using our centralized image upload service
      const uploadResult = await imageUploadService.uploadEventCover(imageUri);
      
      if (uploadResult.success && uploadResult.publicUrl) {
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
    if (!title || !time || !location || !category || !description || !visibility) {
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
        time,
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
      setShowDatePicker(false);
    }
    
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen 
          options={{
            title: '',
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: 'white',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF006E" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.label}>Visibility*</Text>
              <View style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    visibility === 'public' && styles.categoryButtonActive
                  ]}
                  onPress={() => setVisibility('public')}
                >
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={visibility === 'public' ? 'white' : '#888'}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      visibility === 'public' && styles.categoryTextActive
                    ]}
                  >
                    Public
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    visibility === 'friends_only' && styles.categoryButtonActive
                  ]}
                  onPress={() => setVisibility('friends_only')}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={visibility === 'friends_only' ? 'white' : '#888'}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      visibility === 'friends_only' && styles.categoryTextActive
                    ]}
                  >
                    Friends Only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    visibility === 'private' && styles.categoryButtonActive
                  ]}
                  onPress={() => setVisibility('private')}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={visibility === 'private' ? 'white' : '#888'}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      visibility === 'private' && styles.categoryTextActive
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
              onPress={handleUpdateEvent}
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
                    <Text style={styles.buttonText}>Update Event</Text>
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
}); 