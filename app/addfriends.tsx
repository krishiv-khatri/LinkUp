import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    acceptFriendRequest,
    declineFriendRequest,
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

// Update FriendRequest to optionally include receiver for outgoing requests
interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  sender?: Profile;
  receiver?: Profile; // <-- add this
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Combine incoming and outgoing pending requests for dropdown
  const pendingRequests = [
    ...friendRequests.map(r => ({ ...r, type: 'incoming' as const })),
    ...outgoingRequests.map(r => ({ ...r, type: 'outgoing' as const })),
  ];

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
    const minLoading = new Promise(resolve => setTimeout(resolve, 1000));
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
    setLoadingAddSearch(true);
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
      setLoadingAddSearch(false);
    }
  };

  // Accept friend request handler (with mutual request cleanup)
  const handleAccept = async (requestId: string, senderId?: string) => {
    await acceptFriendRequest(requestId);
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    // Clean up mutual pending request (if exists)
    if (user && senderId) {
      await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', senderId)
        .eq('status', 'pending');
    }
    // Optionally, refetch requests
    if (user) {
      setLoadingRequests(true);
      getIncomingFriendRequests(user.id)
        .then(({ data }) => setFriendRequests(data || []))
        .finally(() => setLoadingRequests(false));
    }
  };
  const handleDecline = async (requestId: string) => {
    await declineFriendRequest(requestId);
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
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
        <SafeAreaView style={styles.safeArea}>
          {/* Custom Header with Back Button */}
          <View style={styles.customHeaderRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="white" style={{ marginTop: 14 }} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Friends</Text>
          </View>
          {/* Pending Requests Dropdown */}
          {pendingRequests.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                onPress={() => setDropdownOpen(open => !open)}
                activeOpacity={0.7}
              >
                <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
              {dropdownOpen && (
                <View style={{ backgroundColor: '#181818', borderRadius: 12, marginTop: 4, padding: 8 }}>
                  {pendingRequests.map((req) => (
                    <View key={req.id + req.type} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      {req.type === 'incoming' ? (
                        <>
                          {req.sender?.avatar_url ? (
                            <Image source={{ uri: req.sender.avatar_url }} style={styles.dropdownAvatar} />
                          ) : (
                            <View style={[styles.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
                              <Ionicons name="person" size={20} color="#888" />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{req.sender?.display_name || req.sender?.username || 'Unknown'}</Text>
                            <Text style={{ color: '#888', fontSize: 13 }}>@{req.sender?.username || ''}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleAccept(req.id, req.sender?.id)} style={{ marginRight: 4 }}>
                            <Ionicons name="checkmark-circle" size={22} color="#00C853" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDecline(req.id)}>
                            <Ionicons name="close-circle" size={22} color="#FF1744" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          {req.receiver?.avatar_url ? (
                            <Image source={{ uri: req.receiver.avatar_url }} style={styles.dropdownAvatar} />
                          ) : (
                            <View style={[styles.dropdownAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
                              <Ionicons name="person" size={20} color="#888" />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{req.receiver?.display_name || req.receiver?.username || 'Unknown'}</Text>
                            <Text style={{ color: '#888', fontSize: 13 }}>@{req.receiver?.username || ''}</Text>
                          </View>
                          <TouchableOpacity onPress={async () => {
                            // Cancel outgoing request
                            await supabase.from('friends').delete().eq('id', req.id);
                            // Instantly update state and rerun search
                            const updatedOutgoing = outgoingRequests.filter(r => r.id !== req.id);
                            setOutgoingRequests(updatedOutgoing);
                            runAddFriendSearch(searchQueryAdd, friends, friendRequests, updatedOutgoing);
                          }}>
                            <Ionicons name="close-circle" size={22} color="#FF1744" right={20} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Add Friends Section */}
          <View style={[styles.searchContainer, (friendRequests.length > 0 || loadingRequests) ? { marginTop: 0 } : { marginTop: 0 }]}> 
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#666"
                value={searchQueryAdd}
                onChangeText={setSearchQueryAdd}
              />
            </View>
          </View>
          {showSpinner ? (
            <View style={styles.spinnerContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
              <ActivityIndicator size="large" color="#FF006E" style={{ marginTop: 16 }} />
            </View>
          ) : searchQueryAdd.trim() ? (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              {addFriendResults.length === 0 ? (
                <Text style={{ color: '#666', fontStyle: 'italic' }}>No results found</Text>
              ) : (
                addFriendResults.map(profile => (
                  <View key={profile.id} style={[styles.friendCard, { marginBottom: 8 }]}> 
                    <View style={styles.friendInfo}>
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                      <View style={styles.friendDetails}>
                        <Text style={styles.friendName}>{profile.display_name || profile.username}</Text>
                        <Text style={styles.friendUsername}>@{profile.username}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleAddFriend(profile.id)} style={styles.addButton}>
                      <LinearGradient colors={['#FF006E', '#8338EC']} style={styles.addButtonGradient}>
                        <Ionicons name="person-add" size={16} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    marginBottom: 0,
    marginTop: 14,
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
    marginLeft: 16,
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
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    bottom: 100,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
}); 