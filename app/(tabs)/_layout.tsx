import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from 'sonner-native';
import FriendsScreen from "./friends"; // Adjusted import for Expo Router
import HomeScreen from "./index"; // Adjusted import for Expo Router
import ProfileScreen from "./profile"; // Adjusted import for Expo Router

const Tab = createBottomTabNavigator();

function TabNavigation() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          
          if (route.name === 'Now') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (focused) {
            return (
              <LinearGradient
                colors={['#FF006E', '#8338EC', '#3A86FF']}
                style={styles.activeTab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={iconName} size={size} color="white" />
              </LinearGradient>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarLabel: ({ focused, color }) => {
          return (
            <Text style={[styles.tabBarLabel, { color }]}>
              {route.name}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Now" 
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Now</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Friends</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Profile</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider style={styles.container}>
      <Toaster />
      <TabNavigation />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  activeTab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
