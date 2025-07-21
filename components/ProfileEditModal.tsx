import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { imageUploadService } from '@/services/imageUploadService';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ProfileEditModal({ visible, onClose, onSave }: ProfileEditModalProps) {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ')[1] || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(true); // Start as true since it's their current username
  const usernameTimeoutRef = useRef<number | null>(null);

  const [socialHandles, setSocialHandles] = useState({
    instagram: user?.socialHandles?.instagram || '',
    tiktok: user?.socialHandles?.tiktok || '',
    twitter: user?.socialHandles?.twitter || '',
    snapchat: user?.socialHandles?.snapchat || '',
  });

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, []);

  const validateUsername = (username: string) => {
    // Username must be 3-20 characters, alphanumeric with -, ., _
    const usernameRegex = /^[a-zA-Z0-9._-]{3,20}$/;
    return usernameRegex.test(username);
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) return;
    
    // If it's the same as current username, it's available
    if (username.toLowerCase() === user?.username?.toLowerCase()) {
      setUsernameAvailable(true);
      setUsernameError('');
      return;
    }
    
    setIsCheckingUsername(true);
    setUsernameError('');
    setUsernameAvailable(false);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned - username is available
        setUsernameAvailable(true);
        setUsernameError('');
      } else if (data) {
        // Username already exists
        setUsernameError('Username is already taken');
        setUsernameAvailable(false);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setUsernameError('');
    
    // Clear existing timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    if (!text) {
      setUsernameAvailable(false);
      return;
    }
    
    if (!validateUsername(text)) {
      setUsernameError('Username must be 3-20 characters and contain only letters, numbers, periods, hyphens, and underscores');
      setUsernameAvailable(false);
      return;
    }
    
    // Debounce username availability check
    usernameTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(text);
    }, 500);
  };

  const handlePickImage = async () => {
    try {
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        
        // Upload image to Supabase Storage
        const uploadResult = await imageUploadService.uploadProfilePicture(localUri, user?.id || '');
        
        if (uploadResult.success && uploadResult.publicUrl) {
          setAvatarUrl(uploadResult.publicUrl);
        } else {
          console.error('Image upload failed:', uploadResult.error);
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload your profile picture. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Oops!', 'Something went wrong while selecting your photo. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      Alert.alert('Almost there!', 'Please fill in your first name, last name, and username to complete your profile.');
      return;
    }

    if (!validateUsername(username)) {
      Alert.alert('Invalid Username', 'Your username must be 3-20 characters and can only contain letters, numbers, periods, hyphens, and underscores.');
      return;
    }

    if (!usernameAvailable) {
      Alert.alert('Username Taken', 'This username is already taken. Please choose a different one.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProfile({
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        username: username.toLowerCase().trim(),
        avatarUrl: avatarUrl || user?.avatarUrl,
        socialHandles: socialHandles,
      });

      if (result.success) {
        onSave();
        onClose();
      } else {
        Alert.alert('Update Failed', result.error || 'Something went wrong while updating your profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Oops!', 'Something unexpected happened. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSocialChange = (platform: string, value: string) => {
    setSocialHandles(prev => ({
      ...prev,
      [platform]: value,
    }));
  };

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (user?.email) {
      return `https://api.a0.dev/assets/image?text=${user.email.slice(0, 1).toUpperCase()}&aspect=1:1&seed=${user.id.slice(0, 8)}`;
    }
    return 'https://api.a0.dev/assets/image?text=U&aspect=1:1&seed=default';
  };

  const isFormValid = firstName.trim() && lastName.trim() && username.trim() && 
                     validateUsername(username) && usernameAvailable && !isCheckingUsername;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading || !isFormValid}>
            <Text style={[styles.saveButton, (isLoading || !isFormValid) && styles.saveButtonDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: getAvatarUrl() }} style={styles.avatar} />
              <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage}>
                <Ionicons name="camera" size={20} color="#FF006E" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, styles.nameInput]}>
                <Text style={styles.inputLabel}>First Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your first name"
                    placeholderTextColor="#666"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                  {firstName.trim() && (
                    <Ionicons name="checkmark-circle" size={20} color="#00C853" style={styles.validIcon} />
                  )}
                </View>
              </View>
              
              <View style={[styles.inputContainer, styles.nameInput]}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your last name"
                    placeholderTextColor="#666"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                  {lastName.trim() && (
                    <Ionicons name="checkmark-circle" size={20} color="#00C853" style={styles.validIcon} />
                  )}
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={[styles.inputWrapper, usernameError && styles.inputError]}>
                <Ionicons name="at-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Choose a unique username"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isCheckingUsername && (
                  <ActivityIndicator size="small" color="#FF006E" style={styles.loadingIcon} />
                )}
                {!isCheckingUsername && username && !usernameError && usernameAvailable && (
                  <Ionicons name="checkmark-circle" size={20} color="#00C853" style={styles.validIcon} />
                )}
                {usernameError && (
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" style={styles.validIcon} />
                )}
              </View>
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : username && usernameAvailable && !isCheckingUsername ? (
                <Text style={styles.successText}>Username is available!</Text>
              ) : (
                <Text style={styles.inputHint}>3-20 characters, letters, numbers, periods, hyphens, underscores</Text>
              )}
            </View>

            <View style={styles.socialsSection}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              
              <View style={styles.socialInputContainer}>
                <View style={styles.socialInputWrapper}>
                  <View style={[styles.socialIcon, { backgroundColor: '#E4405F' }]}>
                    <Ionicons name="logo-instagram" size={20} color="white" />
                  </View>
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Instagram username"
                    placeholderTextColor="#666"
                    value={socialHandles.instagram}
                    onChangeText={(value) => handleSocialChange('instagram', value)}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.socialInputContainer}>
                <View style={styles.socialInputWrapper}>
                  <View style={[styles.socialIcon, { backgroundColor: '#FF0050' }]}>
                    <Ionicons name="logo-tiktok" size={20} color="white" />
                  </View>
                  <TextInput
                    style={styles.socialInput}
                    placeholder="TikTok username"
                    placeholderTextColor="#666"
                    value={socialHandles.tiktok}
                    onChangeText={(value) => handleSocialChange('tiktok', value)}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.socialInputContainer}>
                <View style={styles.socialInputWrapper}>
                  <View style={[styles.socialIcon, { backgroundColor: '#1DA1F2' }]}>
                    <Ionicons name="logo-twitter" size={20} color="white" />
                  </View>
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Twitter username"
                    placeholderTextColor="#666"
                    value={socialHandles.twitter}
                    onChangeText={(value) => handleSocialChange('twitter', value)}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.socialInputContainer}>
                <View style={styles.socialInputWrapper}>
                  <View style={[styles.socialIcon, { backgroundColor: '#FFFC00' }]}>
                    <Ionicons name="logo-snapchat" size={20} color="black" />
                  </View>
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Snapchat username"
                    placeholderTextColor="#666"
                    value={socialHandles.snapchat}
                    onChangeText={(value) => handleSocialChange('snapchat', value)}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelButton: {
    color: '#888',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    color: '#FF006E',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  validIcon: {
    marginLeft: 8,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  successText: {
    fontSize: 12,
    color: '#00C853',
  },
  socialsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  socialInputContainer: {
    marginBottom: 12,
  },
  socialInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
}); 