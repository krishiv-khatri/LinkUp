import { useAuth } from '@/contexts/AuthContext';
import { slugService } from '@/services/slugService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

interface DeepLinkState {
  pendingEvent: any | null;
  pendingProfile: any | null;
  isLoading: boolean;
}

export const useDeepLinking = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [deepLinkState, setDeepLinkState] = useState<DeepLinkState>({
    pendingEvent: null,
    pendingProfile: null,
    isLoading: false
  });

  useEffect(() => {
    // Handle initial URL when app is opened
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 Initial URL:', initialUrl);
        setPendingLink(initialUrl);
      }
    };

    // Handle URLs when app is already running
    const handleUrl = (event: { url: string }) => {
      console.log('🔗 URL received:', event.url);
      setPendingLink(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    handleInitialURL();

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (pendingLink && user) {
      handleDeepLink(pendingLink);
      setPendingLink(null);
    }
  }, [pendingLink, user]);

  const handleDeepLink = async (url: string) => {
    try {
      setDeepLinkState(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔗 Handling deep link:', url);
      
      // Parse the URL - handle both app:// and https:// formats
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        // Handle app:// format
        const cleanUrl = url.replace('linkup://', 'https://linkup.app/');
        parsedUrl = new URL(cleanUrl);
      }
      
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length < 2) {
        setDeepLinkState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      const [type, slug] = pathSegments;
      
      if (type === 'event') {
        const { data: event, error } = await slugService.getEventBySlug(slug);
        if (event && !error) {
          console.log('🎉 Event found:', event.title);
          // Navigate to main tab and set pending event
          router.push('/(tabs)');
          setDeepLinkState({
            pendingEvent: event,
            pendingProfile: null,
            isLoading: false
          });
        } else {
          console.error('❌ Event not found:', error);
          setDeepLinkState(prev => ({ ...prev, isLoading: false }));
        }
      } else if (type === 'profile') {
        const { data: profile, error } = await slugService.getProfileBySlug(slug);
        if (profile && !error) {
          console.log('👤 Profile found:', profile.display_name || profile.username);
          // Navigate to main tab and set pending profile
          router.push('/(tabs)');
          setDeepLinkState({
            pendingEvent: null,
            pendingProfile: profile,
            isLoading: false
          });
        } else {
          console.error('❌ Profile not found:', error);
          setDeepLinkState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setDeepLinkState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('❌ Error handling deep link:', error);
      setDeepLinkState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const clearPendingEvent = () => {
    setDeepLinkState(prev => ({ ...prev, pendingEvent: null }));
  };

  const clearPendingProfile = () => {
    setDeepLinkState(prev => ({ ...prev, pendingProfile: null }));
  };

  return {
    ...deepLinkState,
    clearPendingEvent,
    clearPendingProfile
  };
};
