import { useAuth } from '@/contexts/AuthContext';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SocialPlatform {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  prefix: string;
  color: string;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: 'Instagram',
    icon: 'logo-instagram',
    placeholder: 'username',
    prefix: '@',
    color: '#E4405F',
  },
  {
    name: 'TikTok',
    icon: 'logo-tiktok',
    placeholder: 'username',
    prefix: '@',
    color: '#FF0050',
  },
  {
    name: 'Twitter',
    icon: 'logo-twitter',
    placeholder: 'username',
    prefix: '@',
    color: '#1DA1F2',
  },
  {
    name: 'Snapchat',
    icon: 'logo-snapchat',
    placeholder: 'username',
    prefix: '@',
    color: '#FFFC00',
  },
];

export default function OnboardingSocialsScreen() {
  const { updateProfile } = useAuth();
  const params = useLocalSearchParams();
  
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialChange = (platform: string, value: string) => {
    setSocialHandles(prev => ({
      ...prev,
      [platform]: value,
    }));
  };

  const handleFinish = async () => {
    setIsLoading(true);
    
    try {
      // Save social handles to the user's profile
      const socialData = {
        instagram: socialHandles.Instagram || '',
        tiktok: socialHandles.TikTok || '',
        twitter: socialHandles.Twitter || '',
        snapchat: socialHandles.Snapchat || '',
      };

      // Also save birthday if it was collected
      const updates: any = {
        socialHandles: socialData,
      };

      if (params.birthMonth && params.birthDay && params.birthYear) {
        const birthDate = new Date(
          Number(params.birthYear),
          Number(params.birthMonth),
          Number(params.birthDay)
        );
        updates.dateOfBirth = birthDate.toISOString();
      }

      const result = await updateProfile(updates);

      if (result.success) {
        router.replace('/');
      } else {
        Alert.alert('Setup Failed', result.error || 'Something went wrong while finishing your profile setup. Please try again.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Oops!', 'Something unexpected happened. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              style={[styles.progressFill, { width: '100%' }]}
            />
          </View>
          <Text style={styles.progressText}>Step 4 of 4</Text>
        </View>
        <View style={styles.placeholderSpace} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Connect your socials</Text>
          <Text style={styles.subtitle}>
            Let friends find you and stay connected across platforms
          </Text>
        </View>

        <View style={styles.socialsList}>
          {socialPlatforms.map((platform) => (
            <View key={platform.name} style={styles.socialInput}>
              <View style={styles.socialHeader}>
                <View style={styles.socialIconContainer}>
                  <View style={[styles.socialIcon, { backgroundColor: platform.color }]}>
                    <Ionicons name={platform.icon} size={20} color="white" />
                  </View>
                  <Text style={styles.socialName}>{platform.name}</Text>
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>{platform.prefix}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={platform.placeholder}
                  placeholderTextColor="#666"
                  value={socialHandles[platform.name] || ''}
                  onChangeText={(value) => handleSocialChange(platform.name, value)}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.privacyNote}>
          <Ionicons name="eye-off" size={16} color="#888" />
          <Text style={styles.privacyText}>
            Your social handles are only visible to friends you approve
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishButton, isLoading && styles.finishButtonLoading]}
          onPress={handleFinish}
          disabled={isLoading}
        >
          <LinearGradient
            colors={isLoading ? ['#FF006E', '#8338EC'] : ['#FF006E', '#8338EC']}
            style={styles.finishButtonGradient}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="white" style={styles.loadingSpinner} />
                <Text style={styles.finishButtonText}>Setting up your profile...</Text>
              </>
            ) : (
              <>
                <Text style={styles.finishButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
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
  placeholderSpace: {
    width: 24,
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
    lineHeight: 24,
  },
  socialsList: {
    gap: 20,
    marginBottom: 30,
  },
  socialInput: {
    gap: 12,
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  socialIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialName: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputPrefix: {
    fontSize: 16,
    color: '#888',
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: 'white',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  privacyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
  },
  finishButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishButtonLoading: {
    opacity: 0.7,
  },
  finishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingSpinner: {
    marginRight: 8,
  },
}); 