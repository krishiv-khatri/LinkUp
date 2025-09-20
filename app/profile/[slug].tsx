import { useAuth } from '@/contexts/AuthContext';
import { slugService } from '@/services/slugService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function ProfileSharePage() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isLoading) {
      loadProfile();
    }
  }, [user, isLoading, slug]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: profile, error } = await slugService.getProfileBySlug(slug as string);
      
      if (error || !profile) {
        setError('Profile not found');
        return;
      }

      // Redirect to main app with profile data
      router.replace({
        pathname: '/(tabs)',
        params: { 
          openProfile: profile.id,
          profileData: JSON.stringify(profile)
        }
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF006E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.subText}>Please check the link and try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF006E" />
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#888',
    fontSize: 16,
  },
  errorText: {
    color: '#FF006E',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
