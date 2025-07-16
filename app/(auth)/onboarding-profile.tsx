import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingProfileScreen() {
  const { updateProfile } = useAuth();
  const params = useLocalSearchParams();
  
  const [firstName, setFirstName] = useState(params.firstName as string || '');
  const [lastName, setLastName] = useState(params.lastName as string || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  const validateUsername = (username: string) => {
    // Username must be 3-20 characters, alphanumeric with -, ., _
    const usernameRegex = /^[a-zA-Z0-9._-]{3,20}$/;
    return usernameRegex.test(username);
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) return;
    
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
    setUsernameAvailable(false);
    
    if (!text) return;
    
    if (!validateUsername(text)) {
      setUsernameError('Username must be 3-20 characters and contain only letters, numbers, periods, hyphens, and underscores');
      return;
    }
    
    // Debounce username availability check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(text);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleNext = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      Alert.alert('Almost there!', 'Please fill in your first name, last name, and username to continue setting up your profile.');
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
      // Update the user's profile with the collected information
      const result = await updateProfile({
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        username: username.toLowerCase().trim(),
      });

      if (result.success) {
        // Navigate to the next step - profile picture
        router.push({
          pathname: '/onboarding-picture',
          params: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
            bio: bio.trim(),
          },
        });
      } else {
        Alert.alert('Update Failed', result.error || 'Something went wrong while updating your profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Oops!', 'Something unexpected happened. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = firstName.trim() && lastName.trim() && username.trim() && 
                     validateUsername(username) && usernameAvailable && !isCheckingUsername;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#FF006E', '#8338EC']}
              style={[styles.progressFill, { width: '25%' }]}
            />
          </View>
          <Text style={styles.progressText}>Step 1 of 4</Text>
        </View>
        <View style={styles.placeholderSpace} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>This information helps personalize your LinkUp experience</Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color="#666" />
          </View>
          <TouchableOpacity style={styles.avatarButton}>
            <Text style={styles.avatarButtonText}>Add Photo Later</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={[styles.inputContainer, styles.nameInput]}>
              <Text style={styles.inputLabel}>First Name *</Text>
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
              <Text style={styles.inputLabel}>Last Name *</Text>
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
            <Text style={styles.inputLabel}>Username *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bio (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us a bit about yourself..."
                placeholderTextColor="#666"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isLoading || !isFormValid}
        >
          <LinearGradient
            colors={isFormValid ? ['#FF006E', '#8338EC'] : ['#333', '#333']}
            style={styles.nextButtonGradient}
          >
            <Text style={[styles.nextButtonText, !isFormValid && styles.nextButtonTextDisabled]}>
              {isLoading ? 'Saving...' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={isFormValid ? "white" : "#666"} />
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
    marginRight: 20,
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
  },
  placeholderSpace: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 30,
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
  },
  avatarButtonText: {
    color: '#666',
    fontSize: 14,
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
    minHeight: 24,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
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
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
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
  nextButtonTextDisabled: {
    color: '#666',
  },
}); 