import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from 'sonner-native';
import { supabase } from '../../lib/supabase';
import { getIncomingFriendRequests } from '../../services/friendService';
import FriendsScreen from "./friends";
import HomeScreen from "./index";
import ProfileScreen from "./profile";

type TabName = 'Now' | 'Friends' | 'Profile';

const tabs = [
  { name: 'Now' as TabName, icon: 'compass', iconOutline: 'compass-outline', component: HomeScreen },
  { name: 'Friends' as TabName, icon: 'people', iconOutline: 'people-outline', component: FriendsScreen },
  { name: 'Profile' as TabName, icon: 'person', iconOutline: 'person-outline', component: ProfileScreen },
];

function CustomFooter({ activeTab, onTabPress, hasIncomingFriendRequests }) {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.footer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <TouchableOpacity 
              key={tab.name}
              style={styles.tabItem}
              onPress={() => onTabPress(tab.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <View style={{ position: 'relative' }}>
                  {isActive ? (
                    <LinearGradient
                      colors={['#FF006E', '#8338EC', '#3A86FF']}
                      style={styles.activeIconBackground}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={tab.icon as any} size={22} color="white" />
                    </LinearGradient>
                  ) : (
                    <Ionicons name={tab.iconOutline as any} size={22} color="#666666" />
                  )}
                  {/* Red dot for Friends tab if there are incoming requests */}
                  {tab.name === 'Friends' && hasIncomingFriendRequests && (
                    <View style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#FF1744',
                      borderWidth: 1.5,
                      borderColor: '#0A0A0A',
                    }} />
                  )}
                </View>
              </View>
              <Text style={[styles.tabLabel, { color: isActive ? '#FFFFFF' : '#666666' }]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function Layout() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('Now');
  const [hasIncomingFriendRequests, setHasIncomingFriendRequests] = useState(false);

  useEffect(() => {
    if (user) {
      getIncomingFriendRequests(user.id).then(({ data }) => {
        setHasIncomingFriendRequests((data?.filter(r => r.status === 'pending').length ?? 0) > 0);
      });
      // Realtime subscription for incoming friend requests
      const channel = supabase
        .channel('public:friends:incoming-requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friends',
            filter: `friend_id=eq.${user.id}`,
          },
          () => {
            getIncomingFriendRequests(user.id).then(({ data }) => {
              setHasIncomingFriendRequests((data?.filter(r => r.status === 'pending').length ?? 0) > 0);
            });
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <Toaster />
      <View style={styles.content}>
        {/* Render all screens but control visibility to preserve state */}
        <View style={[styles.screenContainer, { display: activeTab === 'Now' ? 'flex' : 'none' }]}>
          <HomeScreen />
        </View>
        <View style={[styles.screenContainer, { display: activeTab === 'Friends' ? 'flex' : 'none' }]}>
          <FriendsScreen />
        </View>
        <View style={[styles.screenContainer, { display: activeTab === 'Profile' ? 'flex' : 'none' }]}>
          <ProfileScreen />
        </View>
      </View>
      <CustomFooter activeTab={activeTab} onTabPress={setActiveTab} hasIncomingFriendRequests={hasIncomingFriendRequests} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0A',
    paddingTop: 15,
  },
  footer: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
});
