import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
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
    acceptFriendRequest,
    declineFriendRequest,
    getIncomingFriendRequests,
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
}

export default function AddFriendsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State for friend requests and add friends
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]); // incoming requests
  const [searchQueryAdd, setSearchQueryAdd] = useState(''); // search for new friends
  const [addFriendResults, setAddFriendResults] = useState<Profile[]>([]); // search results for add friends
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingAddSearch, setLoadingAddSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch friend requests on mount (when user is loaded)
  useEffect(() => {
    if (!user || authLoading) return;
    setLoadingRequests(true);
    setError(null);
    getIncomingFriendRequests(user.id)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setFriendRequests(data || []);
        // Debug log
      })
      .finally(() => setLoadingRequests(false));
  }, [user, authLoading]);

  // Add Friends search effect
  useEffect(() => {
    if (!user || !searchQueryAdd.trim()) {
      setAddFriendResults([]);
      return;
    }
    setLoadingAddSearch(true);
    setError(null);
    // Collect IDs to exclude: current user, already friends, pending requests
    // For this screen, we only exclude the current user and pending requests
    const excludeIds = [user.id];
    friendRequests.forEach(r => {
      excludeIds.push(r.user_id);
      excludeIds.push(r.friend_id);
    });
    searchUsers(searchQueryAdd, user.id, Array.from(new Set(excludeIds)))
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setAddFriendResults(data || []);
      })
      .finally(() => setLoadingAddSearch(false));
  }, [searchQueryAdd, user, friendRequests]);

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
        setAddFriendResults(prev => prev.filter(p => p.id !== targetUserId));
        // Optionally, refetch requests
        setLoadingRequests(true);
        getIncomingFriendRequests(user.id)
          .then(({ data }) => setFriendRequests(data || []))
          .finally(() => setLoadingRequests(false));
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          getIncomingFriendRequests(user.id).then(({ data }) => setFriendRequests(data || []));
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

          {/* Friend Requests Section */}
          {loadingRequests ? (
            <Text style={{ color: 'white', paddingHorizontal: 20 }}>Loading friend requests...</Text>
          ) : friendRequests.length > 0 ? (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ color: '#666', fontWeight: '700', fontSize: 14, marginBottom: 8 }}>Friend Requests</Text>
              {friendRequests.map((req) => (
                <View key={req.id} style={[styles.friendCard, { marginBottom: 8 }]}> 
                  <View style={styles.friendInfo}>
                    {/* Patch: Only render Image if avatar_url exists, else render a placeholder */}
                    {req.sender?.avatar_url ? (
                      <Image source={{ uri: req.sender.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="person" size={28} color="#888" />
                      </View>
                    )}
                    <View style={styles.friendDetails}>
                      {/* Patch: Always render a string in Text */}
                      <Text style={styles.friendName}>{req.sender?.display_name || req.sender?.username || 'Unknown'}</Text>
                      <Text style={styles.friendUsername}>@{req.sender?.username || ''}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => handleAccept(req.id, req.sender?.id)} style={styles.addButton}>
                      <LinearGradient colors={['#00C853', '#4CAF50']} style={styles.addButtonGradient}>
                        <Ionicons name="checkmark" size={16} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDecline(req.id)} style={styles.addButton}>
                      <LinearGradient colors={['#FF1744', '#FF6B6B']} style={styles.addButtonGradient}>
                        <Ionicons name="close" size={16} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

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
          {loadingAddSearch ? (
            <Text style={{ color: 'white', paddingHorizontal: 20 }}>Searching...</Text>
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
}); 