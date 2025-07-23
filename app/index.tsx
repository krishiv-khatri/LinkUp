import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0A0A0A'
      }}>
        <ActivityIndicator size="large" color="#FF006E" />
      </View>
    );
  }

  // If user is authenticated and has completed onboarding, go to main app
  if (user && (user.username || user.displayName)) {
    return <Redirect href="/(tabs)" />;
  }

  // If user is authenticated but hasn't completed onboarding, go to onboarding
  if (user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // If no user, go to onboarding splash screen
  return <Redirect href="/(auth)/onboarding" />;
} 