import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  searchUsers,
  sendFriendRequest
} from '../services/friendService';

// Types for friend and friend request
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

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  sender?: Profile;
  receiver?: Profile;
}

export default function AddFriendsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State for friend requests and add friends
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]); // incoming requests
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]); // outgoing requests
  const [friends, setFriends] = useState<Friend[]>([]); // accepted friends
  const [searchQueryAdd, setSearchQueryAdd] = useState(''); // search for new friends
  const [addFriendResults, setAddFriendResults] = useState<Profile[]>([]); // search results for add friends
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingAddSearch, setLoadingAddSearch] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false); // for minimum spinner duration
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch friend requests on mount (when user is loaded)
  useEffect(() => {
    if (!user || authLoading) return;
    setLoadingRequests(true);
    setError(null);
    getIncomingFriendRequests(user.id)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setFriendRequests(data || []);
      })
      .finally(() => setLoadingRequests(false));
    // Fetch outgoing requests
    getOutgoingFriendRequests(user.id)
      .then(({ data }) => setOutgoingRequests(data || []));
  }, [user, authLoading]);

  // Fetch friends on mount
  useEffect(() => {
    if (!user) return;
    getFriendsList(user.id).then(({ data }) => setFriends(data || []));
  }, [user]);

  // Add this function inside your component
  const runAddFriendSearch = (query: string, friendsList: Friend[], incoming: FriendRequest[], outgoing: FriendRequest[]) => {
    if (!user || !query.trim()) {
      setAddFriendResults([]);
      setShowSpinner(false);
      return;
    }
    setLoadingAddSearch(true);
    setShowSpinner(true);
    setError(null);
    const minLoading = new Promise(resolve => setTimeout(resolve, 800));
    const excludeIds = [user.id];
    friendsList.forEach(f => {
      excludeIds.push(f.user_id);
      excludeIds.push(f.friend_id);
    });
    incoming.forEach(r => {
      excludeIds.push(r.user_id);
      excludeIds.push(r.friend_id);
    });
    outgoing.forEach(r => {
      excludeIds.push(r.user_id);
      excludeIds.push(r.friend_id);
    });
    Promise.all([
      searchUsers(query, user.id, Array.from(new Set(excludeIds))),
      minLoading
    ]).then(([{ data, error }]) => {
      if (error) setError(error.message);
      else setAddFriendResults(data || []);
      setShowSpinner(false);
    }).finally(() => setLoadingAddSearch(false));
  };

  // Add Friends search effect
  useEffect(() => {
    runAddFriendSearch(searchQueryAdd, friends, friendRequests, outgoingRequests);
    // eslint-disable-next-line
  }, [searchQueryAdd, user, friends, friendRequests, outgoingRequests]);

  // Add friend handler (with edge case handling)
  const handleAddFriend = async (targetUserId: string) => {
    if (!user) return;
    if (user.id === targetUserId) {
      toast.error("You can't add yourself as a friend!");
      return;
    }
    setSendingRequestId(targetUserId);
    try {
      const { error } = await sendFriendRequest(user.id, targetUserId);
      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          toast.error('Friend request already sent or you are already friends.');
        } else {
          toast.error('Failed to send friend request');
        }
      } else {
        toast.success('Friend request sent!');
        // Instantly refetch outgoing requests for real-time UI update
        getOutgoingFriendRequests(user.id).then(({ data }) => {
          setOutgoingRequests(data || []);
          // Run the search again with the latest outgoing requests
          runAddFriendSearch(searchQueryAdd, friends, friendRequests, data || []);
        });
      }
    } finally {
      setSendingRequestId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    // Subscribe to changes in the friends table
    const channel: RealtimeChannel = supabase
      .channel('public:friends')
      // Outgoing requests (you are the sender)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          getOutgoingFriendRequests(user.id).then(({ data }) => setOutgoingRequests(data || []));
        }
      )
      // Incoming requests (you are the recipient)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          getIncomingFriendRequests(user.id).then(({ data }) => setFriendRequests(data || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <SafeAreaView style={styles.safeArea}>
            {/* Custom Header with Back Button */}
            <View style={styles.customHeaderRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Find Friends</Text>
                <Text style={styles.headerSubtitle}>Discover and connect with people</Text>
              </View>
            </View>

            {/* Search Section */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by username or name..."
                  placeholderTextColor="#666"
                  value={searchQueryAdd}
                  onChangeText={setSearchQueryAdd}
                />
                {searchQueryAdd.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQueryAdd('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Content */}
            {showSpinner ? (
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 16 }} />
                <Text style={styles.loadingText}>Finding people...</Text>
              </View>
            ) : searchQueryAdd.trim() ? (
              <View style={styles.resultsContainer}>
                {addFriendResults.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={80} color="#333" />
                    <Text style={styles.emptyTitle}>No users found</Text>
                    <Text style={styles.emptySubtitle}>
                      Try searching with a different username or name
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.resultsTitle}>
                      {addFriendResults.length} result{addFriendResults.length > 1 ? 's' : ''}
                    </Text>
                    {addFriendResults.map(profile => {
                      const isSending = sendingRequestId === profile.id;
                      return (
                        <View key={profile.id} style={styles.userCard}> 
                          <View style={styles.userInfo}>
                            <Image 
                              source={{ 
                                uri: profile.avatar_url || `https://api.a0.dev/assets/image?text=${profile?.display_name?.slice(0, 1) || profile?.username?.slice(0, 1) || 'U'}&aspect=1:1&seed=${profile.id}` 
                              }} 
                              style={styles.avatar} 
                            />
                            <View style={styles.userDetails}>
                              <Text style={styles.userName} numberOfLines={1}>
                                {profile.display_name || profile.username}
                              </Text>
                              <Text style={styles.userUsername} numberOfLines={1}>
                                @{profile.username}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity 
                            onPress={() => handleAddFriend(profile.id)} 
                            style={[styles.addButton, isSending && styles.addButtonDisabled]}
                            disabled={isSending}
                          >
                            {isSending ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <>
                                <Ionicons name="person-add" size={16} color="#000" />
                                <Text style={styles.addButtonText}>Add</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={80} color="#333" />
                <Text style={styles.emptyTitle}>Find new friends</Text>
                <Text style={styles.emptySubtitle}>
                  Search for people by their username or display name
                </Text>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </>
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
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
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
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userInfo: {
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
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#888',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  },
}); 