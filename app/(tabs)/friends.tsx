import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import FriendProfileModal from '../../components/FriendProfileModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getFriendsList,
  setFriendPinned
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
  pinned: boolean;
}

export default function FriendsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]); // accepted friends
  const [searchQueryFriends, setSearchQueryFriends] = useState(''); // search in friends
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // <-- Add this state
  // Use a ref to store Animated.Values for each friend
  const buttonWidthsRef = useRef<{ [id: string]: Animated.Value }>({});
  // Use a ref to store Swipeable refs for each friend
  const swipeableRefs = useRef<{ [id: string]: Swipeable | null }>({});

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

  // Refetch friends when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      setLoadingFriends(true);
      getFriendsList(user.id)
        .then(({ data }) => setFriends(data || []))
        .finally(() => setLoadingFriends(false));
    }, [user])
  );

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
    console.log('Attempting to remove friend:', friend);
    // Friendship can be in either direction
    const { error, data } = await supabase.from('friends').delete().eq('id', friend.id).eq('status', 'accepted');
    console.log('Delete result:', { error, data });
    if (error) {
      Alert.alert('Error', 'Failed to remove friend: ' + error.message);
    }
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

  // Helper to get or create an Animated.Value for a friend
  const getButtonWidth = (id: string, initial: number) => {
    if (!buttonWidthsRef.current[id]) {
      buttonWidthsRef.current[id] = new Animated.Value(initial);
    }
    return buttonWidthsRef.current[id];
  };

  // Animate the button width when confirmingRemoveId changes
  useEffect(() => {
    filteredFriends.forEach(friend => {
      const isConfirming = removingId === friend.id;
      // Make button wider for text breathing room
      const buttonWidth = isConfirming ? 110 : 70;
      const animatedWidth = getButtonWidth(friend.id, buttonWidth);
      Animated.timing(animatedWidth, {
        toValue: buttonWidth,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [removingId, filteredFriends]);

  // Add this function inside FriendsScreen
  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await getFriendsList(user.id)
      .then(({ data }) => setFriends(data || []))
      .finally(() => setRefreshing(false));
  };

  const pinnedFriends = filteredFriends.filter(f => f.pinned);
  const unpinnedFriends = filteredFriends.filter(f => !f.pinned);

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
            <TouchableOpacity
              style={styles.addFriendsButton}
              onPress={() => router.push('/addfriends')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FFFFFF", "#8D8294"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.addFriendsButtonGradient}
              >
                <Text style={styles.addFriendsButtonText}>Add Friends</Text>
              </LinearGradient>
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
            <Text style={{ color: 'white', paddingHorizontal: 20 }}></Text>
          ) : (
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#888888"
                    colors={["#888888"]}
                    progressBackgroundColor="#1A1A1A"
                  />
                }
              >
                {pinnedFriends.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 20, marginLeft: 4, marginBottom: 16 }}>Pinned Friends</Text>
                    {pinnedFriends.map((friend) => (
                      <Swipeable
                        key={friend.id}
                        ref={(ref) => {
                          swipeableRefs.current[friend.id] = ref;
                        }}
                        renderRightActions={(progress, dragX) => (
                          <Animated.View
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              alignItems: 'flex-end',
                              backgroundColor: 'transparent',
                            }}
                          >
                            <LinearGradient
                              colors={['#8338EC', '#3A86FF']}
                              style={{
                                width: 64,
                                height: '80%',
                                borderRadius: 16,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 8,
                              }}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="pin" size={28} color="#FFF" />
                            </LinearGradient>
                          </Animated.View>
                        )}
                        rightThreshold={60}
                        onSwipeableOpen={async () => {
                          await setFriendPinned(friend.id, false);
                          if (user) {
                            getFriendsList(user.id).then(({ data }) => setFriends(data || []));
                          }
                          // Close the swipeable after the action is completed
                          swipeableRefs.current[friend.id]?.close();
                        }}
                      >
                        {/* Friend card UI here, same as before */}
                        <TouchableOpacity
                        style={styles.friendCard}
                        activeOpacity={0.8}
                        onPress={() => {
                          const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                          setSelectedFriend(profile ?? null);
                          setModalVisible(true);
                        }}
                      >
                        <View style={styles.friendInfo}>
                          {(() => {
                            const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                            return (
                              <>
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
                              </>
                            );
                          })()}
                        </View>
                      </TouchableOpacity>
                      </Swipeable>
                    ))}
                  </View>
                )}
                
                {unpinnedFriends.length > 0 && (
                  <View>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 20, marginLeft: 4, marginBottom: 16 }}>Friends</Text>
                    {unpinnedFriends.map((friend) => (
                      <Swipeable
                        key={friend.id}
                        ref={(ref) => {
                          swipeableRefs.current[friend.id] = ref;
                        }}
                        renderRightActions={(progress, dragX) => (
                          <Animated.View
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              alignItems: 'flex-end',
                              backgroundColor: 'transparent',
                            }}
                          >
                            <LinearGradient
                              colors={['#FFB800', '#FF6B00']}
                              style={{
                                width: 64,
                                height: '80%',
                                borderRadius: 16,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 8,
                              }}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="pin-outline" size={28} color="#FFF" />
                            </LinearGradient>
                          </Animated.View>
                        )}
                        rightThreshold={60}
                        onSwipeableOpen={async () => {
                          await setFriendPinned(friend.id, true);
                          getFriendsList(user?.id || '').then(({ data }) => setFriends(data || []));
                          // Close the swipeable after the action is completed
                          swipeableRefs.current[friend.id]?.close();
                        }}
                      >
                        <TouchableOpacity
                          style={styles.friendCard}
                          activeOpacity={0.8}
                          onPress={() => {
                            const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                            setSelectedFriend(profile ?? null);
                            setModalVisible(true);
                          }}
                        >
                          <View style={styles.friendInfo}>
                            {(() => {
                              const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                              return (
                                <>
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
                                </>
                              );
                            })()}
                          </View>
                        </TouchableOpacity>
                      </Swipeable>
                    ))}
                  </View>
                )}
                <View style={styles.bottomSpacing} />
              </Animated.ScrollView>
            </View>
          )}
          <FriendProfileModal
            visible={modalVisible}
            friend={selectedFriend}
            onClose={() => setModalVisible(false)}
          />
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
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
    padding: 10,
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendDetails: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  addFriendsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 8,
    marginTop: 2,
  },
  addFriendsButtonGradient: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendsButtonText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
}); 