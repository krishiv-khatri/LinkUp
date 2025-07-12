import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from 'sonner-native';
import FriendsScreen from "./friends";
import HomeScreen from "./index";
import ProfileScreen from "./profile";

type TabName = 'Now' | 'Friends' | 'Profile';

const tabs = [
  { name: 'Now' as TabName, icon: 'compass', iconOutline: 'compass-outline', component: HomeScreen },
  { name: 'Friends' as TabName, icon: 'people', iconOutline: 'people-outline', component: FriendsScreen },
  { name: 'Profile' as TabName, icon: 'person', iconOutline: 'person-outline', component: ProfileScreen },
];

function CustomFooter({ activeTab, onTabPress }: { activeTab: TabName, onTabPress: (tab: TabName) => void }) {
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

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/sign-in');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const ActiveComponent = tabs.find(tab => tab.name === activeTab)?.component || HomeScreen;

  return (
    <SafeAreaProvider style={styles.container}>
      <Toaster />
      <View style={styles.content}>
        <ActiveComponent />
      </View>
      <CustomFooter activeTab={activeTab} onTabPress={setActiveTab} />
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
});
