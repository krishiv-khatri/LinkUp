import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { imageUploadService } from '@/services/imageUploadService';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingPictureScreen() {
  const { updateProfile, user } = useAuth();
  const params = useLocalSearchParams();
  
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload a profile picture. You can grant this permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return;
      }

      // Pick image from library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        
        try {
          // Upload image to Supabase Storage
          const uploadResult = await imageUploadService.uploadProfilePicture(localUri, user?.id || '');
          
          if (uploadResult.success && uploadResult.publicUrl) {
            setSelectedAvatar(uploadResult.publicUrl);
          } else {
            console.error('Image upload failed:', uploadResult.error);
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload your profile picture. Please try again.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Failed', 'Failed to upload your profile picture. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Oops!', 'Something went wrong while selecting your photo. Please try again.');
    }
  };

  const handleNext = async () => {
    if (selectedAvatar) {
      setIsLoading(true);
      try {
        const result = await updateProfile({
          avatarUrl: selectedAvatar,
        });

        if (!result.success) {
          Alert.alert('Update Failed', result.error || 'Something went wrong while updating your profile picture. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Profile update error:', error);
        Alert.alert('Oops!', 'Something unexpected happened. Please try again.');
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // Navigate to the next step - birthday
    router.push({
      pathname: '/onboarding-birthday',
      params: {
        ...params,
        avatarUrl: selectedAvatar,
      },
    });
  };

  const handleSkip = () => {
    // Navigate to the next step without updating profile picture
    router.push({
      pathname: '/onboarding-birthday',
      params: {
        ...params,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#FF006E', '#8338EC']}
              style={[styles.progressFill, { width: '50%' }]}
            />
          </View>
          <Text style={styles.progressText}>Step 2 of 4</Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Add a profile picture</Text>
          <Text style={styles.subtitle}>Help others recognize you on LinkUp</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              {selectedAvatar ? (
                <Image source={{ uri: selectedAvatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={60} color="#666" />
              )}
            </View>
            
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <LinearGradient
                colors={['#FF006E', '#8338EC']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.uploadButtonText}>
                  {selectedAvatar ? 'Change Photo' : 'Upload Photo'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#FF006E', '#8338EC']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {isLoading ? 'Saving...' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#FF006E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
}); 