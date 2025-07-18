import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getFriendsList
} from '../../services/friendService';

const { width } = Dimensions.get('window');

// Types for friend
interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  sender?: Profile;
  receiver?: Profile;
}

export default function FriendsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]); // accepted friends
  const [searchQueryFriends, setSearchQueryFriends] = useState(''); // search in friends
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch friends on mount (when user is loaded)
  useEffect(() => {
    if (!user || authLoading) return;
    setLoadingFriends(true);
    setError(null);
    getFriendsList(user.id)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setFriends(data || []);
      })
      .finally(() => setLoadingFriends(false));
  }, [user, authLoading]);

  // Filter friends by search
  const filteredFriends = friends.filter(friend => {
    const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
    const name = profile?.display_name || '';
    const username = profile?.username || '';
    return (
      name.toLowerCase().includes(searchQueryFriends.toLowerCase()) ||
      username.toLowerCase().includes(searchQueryFriends.toLowerCase())
    );
  });

  // Remove friend handler (optional, if you want to keep this feature)
  const handleRemoveFriend = async (friend: Friend) => {
    if (!user) return;
    setLoadingFriends(true);
    // Friendship can be in either direction
    await supabase.from('friends').delete().eq('id', friend.id).eq('status', 'accepted');
    // Refetch friends
    getFriendsList(user.id)
      .then(({ data }) => setFriends(data || []))
      .finally(() => setLoadingFriends(false));
  };

  useEffect(() => {
    if (!user) return;
    // Subscribe to changes in the friends table
    const channel = supabase
      .channel('public:friends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          getFriendsList(user.id).then(({ data }) => setFriends(data || []));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${user.id}`,
        },
        (payload) => {
          getFriendsList(user.id).then(({ data }) => setFriends(data || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Friends</Text>
              {/* Optionally add a subtitle here, e.g.: */}
              {/* <Text style={styles.headerSubtitle}>Your connections on LinkUp</Text> */}
            </View>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/addfriends')}>
              <Ionicons name="person-add" size={28} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                placeholderTextColor="#666"
                value={searchQueryFriends}
                onChangeText={setSearchQueryFriends}
              />
            </View>
          </View>
          {loadingFriends ? (
            <Text style={{ color: 'white', paddingHorizontal: 20 }}>Loading friends...</Text>
          ) : (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Animated.View style={[styles.friendsList, { opacity: fadeAnim }]}> 
                {filteredFriends.map((friend) => {
                  const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                  return (
                    <View key={friend.id} style={styles.friendCard}>
                      <View style={styles.friendInfo}>
                        {profile?.avatar_url ? (
                          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
                            <Ionicons name="person" size={28} color="#888" />
                          </View>
                        )}
                        <View style={styles.friendDetails}>
                          <Text style={styles.friendName}>{profile?.display_name || profile?.username}</Text>
                          <Text style={styles.friendUsername}>@{profile?.username}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveFriend(friend)} style={styles.addButton}>
                        <LinearGradient colors={['#FF1744', '#FF6B6B']} style={styles.addButtonGradient}>
                          <Ionicons name="person-remove" size={16} color="white" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  );
                })}
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
          )}
        </SafeAreaView>
      </Animated.View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20, // match index tab
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 24, // match index tab
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
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