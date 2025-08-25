import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { eventService } from '@/services/eventService';
import { getIncomingFriendRequests } from '@/services/friendService';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Check for unread notifications
  useEffect(() => {
    if (!user) return;

    const checkUnreadNotifications = async () => {
      try {
        // Get pending event invitations (all are considered unread)
        const invitations = await eventService.getUserInvitations(user.id);
        const pendingInvitations = invitations.length;
        
        // Get pending friend requests (all are considered unread)
        const { data: friendRequests } = await getIncomingFriendRequests(user.id);
        const pendingFriendRequests = friendRequests?.length || 0;
        
        // You can add other notification sources here
        const totalUnread = pendingInvitations + pendingFriendRequests;
        
        setUnreadNotificationCount(totalUnread);
      } catch (error) {
        console.error('Error checking unread notifications:', error);
      }
    };

    checkUnreadNotifications();
    
    // Check every 30 seconds for new notifications
    const interval = setInterval(checkUnreadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
            height: 90, // Make footer taller
          },
          default: {
            height: 90, // Make footer taller
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => (
            <View style={styles.notificationIconContainer}>
              <Ionicons name="notifications" size={28} color={color} />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
