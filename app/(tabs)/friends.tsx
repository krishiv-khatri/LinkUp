import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FriendProfileModal from '../../components/FriendProfileModal';
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
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  // Remove friend handler
  const handleRemoveFriend = async (friend: Friend) => {
    if (!user) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.user_id === user.id ? friend.receiver?.display_name || friend.receiver?.username : friend.sender?.display_name || friend.sender?.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(friend.id);
            try {
              const { error } = await supabase.from('friends').delete().eq('id', friend.id);
              if (error) {
                Alert.alert('Error', 'Failed to remove friend: ' + error.message);
              } else {
                // Refetch friends
                getFriendsList(user.id).then(({ data }) => setFriends(data || []));
              }
            } finally {
              setRemovingId(null);
            }
          }
        }
      ]
    );
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
              <Text style={styles.headerSubtitle}>{friends.length} connection{friends.length !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.addFriendsButton}
              onPress={() => router.push('/addfriends')}
              activeOpacity={0.7}
            >
              <View style={styles.addFriendsButtonContent}>
                <Ionicons name="person-add" size={18} color="#000" />
                <Text style={styles.addFriendsButtonText}>Add</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
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
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {filteredFriends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={80} color="#333" />
                  <Text style={styles.emptyTitle}>
                    {searchQueryFriends ? 'No friends found' : 'No friends yet'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQueryFriends 
                      ? 'Try searching with a different name' 
                      : 'Start connecting with people around you'
                    }
                  </Text>
                  {!searchQueryFriends && (
                    <TouchableOpacity 
                      style={styles.emptyButton}
                      onPress={() => router.push('/addfriends')}
                    >
                      <Text style={styles.emptyButtonText}>Find Friends</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Animated.View style={[styles.friendsList, { opacity: fadeAnim }]}> 
                  {filteredFriends.map((friend) => {
                    const profile = friend.user_id === user?.id ? friend.receiver : friend.sender;
                    const isRemoving = removingId === friend.id;

                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.friendCard, isRemoving && styles.friendCardRemoving]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedFriend(profile ?? null);
                          setModalVisible(true);
                        }}
                        disabled={isRemoving}
                      >
                        <View style={styles.friendInfo}>
                          {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                          ) : (
                            <View style={styles.avatarPlaceholder}> 
                              <Ionicons name="person" size={28} color="#666" />
                            </View>
                          )}
                          <View style={styles.friendDetails}>
                            <Text style={styles.friendName} numberOfLines={1}>
                              {profile?.display_name || profile?.username}
                            </Text>
                            <Text style={styles.friendUsername} numberOfLines={1}>
                              @{profile?.username}
                            </Text>
                          </View>
                        </View>
                        
                        <TouchableOpacity
                          style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!isRemoving) {
                              handleRemoveFriend(friend);
                            }
                          }}
                          disabled={isRemoving}
                        >
                          <Ionicons 
                            name={isRemoving ? "ellipsis-horizontal" : "person-remove"} 
                            size={16} 
                            color={isRemoving ? "#666" : "#FF3B30"} 
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              )}
              <View style={styles.bottomSpacing} />
            </ScrollView>
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  addFriendsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addFriendsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addFriendsButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  searchContainer: {
    paddingHorizontal: 24,
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
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  friendsList: {
    gap: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  friendCardRemoving: {
    opacity: 0.5,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  friendDetails: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#888',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonDisabled: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    borderColor: 'rgba(102, 102, 102, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 100,
  },
}); 