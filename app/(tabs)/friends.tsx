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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

const mockFriends = [
  {
    id: '1',
    name: 'Charlotte',
    username: '@charlotte_hk',
    avatar: 'https://api.a0.dev/assets/image?text=stylish%20asian%20girl%20with%20wavy%20hair&aspect=1:1&seed=21',
    status: 'Going to Clockenflap',
    statusType: 'event',
    isOnline: true,
    mutualFriends: 12,
  },
  {
    id: '2',
    name: 'Alex',
    username: '@alexwong',
    avatar: 'https://api.a0.dev/assets/image?text=cool%20guy%20with%20streetwear%20fashion&aspect=1:1&seed=22',
    status: 'Flying to Tokyo',
    statusType: 'travel',
    isOnline: false,
    mutualFriends: 8,
  },
  {
    id: '3',
    name: 'Rachel',
    username: '@rachellim',
    avatar: 'https://api.a0.dev/assets/image?text=girl%20with%20artistic%20style%20and%20glasses&aspect=1:1&seed=23',
    status: 'Online',
    statusType: 'online',
    isOnline: true,
    mutualFriends: 15,
  },
  {
    id: '4',
    name: 'Eric',
    username: '@ericc',
    avatar: 'https://api.a0.dev/assets/image?text=casual%20guy%20with%20hoodie&aspect=1:1&seed=24',
    status: 'At Home',
    statusType: 'location',
    isOnline: true,
    mutualFriends: 6,
  },
  {
    id: '5',
    name: 'Maya',
    username: '@mayaaa',
    avatar: 'https://api.a0.dev/assets/image?text=trendy%20girl%20with%20colorful%20hair&aspect=1:1&seed=25',
    status: 'Neon Party',
    statusType: 'event',
    isOnline: true,
    mutualFriends: 20,
  },
  {
    id: '6',
    name: 'Kevin',
    username: '@kevincho',
    avatar: 'https://api.a0.dev/assets/image?text=guy%20with%20designer%20jacket&aspect=1:1&seed=26',
    status: 'At Home',
    statusType: 'location',
    isOnline: false,
    mutualFriends: 9,
  },
];

const getStatusGradient = (statusType: string) => {
  switch (statusType) {
    case 'event':
      return ['#FF006E', '#8338EC'];
    case 'travel':
      return ['#FF6B35', '#F7931E'];
    case 'online':
      return ['#00C853', '#4CAF50'];
    case 'location':
      return ['#8338EC', '#3A86FF'];
    default:
      return ['#666', '#888'];
  }
};

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState(mockFriends);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = (friendId: string) => {
    toast.success('Friend added! 🎉');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={[styles.friendsList, { opacity: fadeAnim }]}>
            {filteredFriends.map((friend, index) => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendCard}
                activeOpacity={0.8}
              >
                <View style={styles.friendInfo}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                    {friend.isOnline && (
                      <LinearGradient
                        colors={getStatusGradient(friend.statusType) as any}
                        style={styles.onlineIndicator}
                      />
                    )}
                  </View>
                  
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendUsername}>{friend.username}</Text>
                    <View style={styles.statusContainer}>
                      <LinearGradient
                        colors={getStatusGradient(friend.statusType) as any}
                        style={styles.statusDot}
                      />
                      <Text style={styles.friendStatus}>{friend.status}</Text>
                    </View>
                    <Text style={styles.mutualFriends}>
                      {friend.mutualFriends} mutual friends
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddFriend(friend.id)}
                >
                  <LinearGradient
                    colors={['#FF006E', '#8338EC']}
                    style={styles.addButtonGradient}
                  >
                    <Ionicons name="person-add" size={16} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </Animated.View>

          <View style={styles.planningSection}>
            <View style={styles.planningSectionHeader}>
              <Text style={styles.planningSectionTitle}>PLANNING</Text>
            </View>
            
            <View style={styles.planningCard}>
              <LinearGradient
                colors={['#8338EC', '#FF006E']}
                style={styles.planningGradient}
              >
                <View style={styles.planningContent}>
                  <Text style={styles.planningTitle}>Chillhop Night</Text>
                  <Text style={styles.planningDetails}>Tonight • 9:00 PM</Text>
                  <Text style={styles.planningLocation}>Central</Text>
                </View>
              </LinearGradient>
            </View>
          </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  friendsList: {
    gap: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  friendStatus: {
    fontSize: 14,
    color: '#CCC',
    fontWeight: '500',
  },
  mutualFriends: {
    fontSize: 12,
    color: '#666',
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planningSection: {
    marginTop: 32,
  },
  planningSectionHeader: {
    marginBottom: 16,
  },
  planningSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  planningCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  planningGradient: {
    padding: 20,
  },
  planningContent: {
    alignItems: 'flex-start',
  },
  planningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  planningDetails: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  planningLocation: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bottomSpacing: {
    height: 100,
  },
}); 