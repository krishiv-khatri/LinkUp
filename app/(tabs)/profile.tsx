import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

const mockUpcomingEvents = [
  {
    id: '1',
    title: 'Chillhop Night',
    date: 'W',
    time: '9:00 PM',
    location: 'Central',
    status: 'confirmed',
  },
  {
    id: '2',
    title: 'Art Gallery Opening',
    date: 'Sat',
    time: '7:00 PM',
    location: 'Sheung Wan',
    status: 'maybe',
  },
  {
    id: '3',
    title: 'Rooftop Rave',
    date: 'Sun',
    time: '11:00 PM',
    location: 'TST',
    status: 'confirmed',
  },
];

const socialPlatforms = [
  { name: 'Instagram', handle: 'alice.k.me', icon: 'logo-instagram', color: '#E4405F' },
  { name: 'TikTok', handle: 'alicekfm', icon: 'musical-notes', color: '#FF0050' },
  { name: 'Twitter', handle: '@aliceking', icon: 'logo-twitter', color: '#1DA1F2' },
];

export default function ProfileScreen() {
  const [isOutOfTown, setIsOutOfTown] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null); // Added type for selectedPlan
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const profileRingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Profile ring glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(profileRingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(profileRingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handleEditProfile = () => {
    toast.success('Profile editor coming soon! ✨');
  };

  const handleShareProfile = () => {
    toast.success('Profile link copied! 📋');
  };

  const ringOpacity = profileRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={[styles.profileHeader, { opacity: fadeAnim }]}>
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatarRing, { opacity: ringOpacity }]}>
                <LinearGradient
                  colors={['#FF006E', '#8338EC', '#3A86FF']}
                  style={styles.avatarGradient}
                />
              </Animated.View>
              <Image 
                source={{ uri: 'https://api.a0.dev/assets/image?text=stylish%20asian%20girl%20with%20trendy%20fashion&aspect=1:1&seed=30' }}
                style={styles.avatar}
              />
            </View>
            
            <Text style={styles.profileName}>Alice King</Text>
            
            <View style={styles.socialHandles}>
              <Text style={styles.socialHandle}>alice.k.me</Text>
              <Text style={styles.socialSeparator}>|</Text>
              <Text style={styles.socialHandle}>alicekfm</Text>
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <LinearGradient
                  colors={['#FF006E', '#8338EC']}
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create-outline" size={18} color="white" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.plansSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
            
            <View style={styles.plansContainer}>
              {mockUpcomingEvents.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.planCard,
                    selectedPlan === event.id && styles.selectedPlanCard
                  ]}
                  onPress={() => setSelectedPlan(selectedPlan === event.id ? null : event.id)}
                >
                  <LinearGradient
                    colors={(
                      selectedPlan === event.id 
                        ? ['#FF006E', '#8338EC'] 
                        : ['transparent', 'transparent']
                    ) as any} // Added type assertion
                    style={styles.planCardGradient}
                  >
                    <View style={styles.planCardContent}>
                      <View style={styles.planInfo}>
                        <Text style={styles.planTitle}>{event.title}</Text>
                        <Text style={styles.planDetails}>
                          {event.date} • {event.time} • {event.location}
                        </Text>
                      </View>
                      
                      <View style={styles.planStatus}>
                        <View style={[
                          styles.statusDot, 
                          { backgroundColor: event.status === 'confirmed' ? '#00C853' : '#FF9800' }
                        ]} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.socialSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Social</Text>
            
            <View style={styles.socialPlatforms}>
              {socialPlatforms.map((platform, index) => (
                <TouchableOpacity key={platform.name} style={styles.socialPlatform}>
                  <View style={[styles.socialIcon, { backgroundColor: platform.color }]}>
                    <Ionicons name={platform.icon as any} size={20} color="white" />
                  </View>
                  <View style={styles.socialInfo}>
                    <Text style={styles.socialPlatformName}>{platform.name}</Text>
                    <Text style={styles.socialPlatformHandle}>{platform.handle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Out of Town</Text>
                  <Text style={styles.settingDescription}>
                    Hide your profile from event suggestions
                  </Text>
                </View>
                <Switch
                  value={isOutOfTown}
                  onValueChange={setIsOutOfTown}
                  trackColor={{ false: '#333', true: '#FF006E' }}
                  thumbColor={isOutOfTown ? '#FFFFFF' : '#666'}
                />
              </View>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Privacy</Text>
                  <Text style={styles.settingDescription}>
                    Manage who can see your activity
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Event reminders and friend activity
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 70,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 70,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#0A0A0A',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    fontFamily: 'System',
  },
  socialHandles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  socialHandle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  socialSeparator: {
    fontSize: 16,
    color: '#333',
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plansSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
    fontFamily: 'System',
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  selectedPlanCard: {
    backgroundColor: 'transparent',
  },
  planCardGradient: {
    padding: 2,
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  planDetails: {
    fontSize: 14,
    color: '#888',
  },
  planStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  socialSection: {
    marginBottom: 40,
  },
  socialPlatforms: {
    gap: 16,
  },
  socialPlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  socialInfo: {
    flex: 1,
  },
  socialPlatformName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  socialPlatformHandle: {
    fontSize: 14,
    color: '#666',
  },
  settingsSection: {
    marginBottom: 40,
  },
  settingsContainer: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  bottomSpacing: {
    height: 100,
  },
}); 