import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { notificationService } from '@/services/notificationService';
import { UserProfile, userService } from '@/services/userService';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

interface InviteUsersModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

interface SelectableUser extends UserProfile {
  selected: boolean;
  isFriend: boolean;
}

export default function InviteUsersModal({ visible, onClose, eventId, eventTitle }: InviteUsersModalProps) {
  console.log('InviteUsersModal props:', { visible, eventId, eventTitle });
  
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SelectableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const handleClose = () => {
    console.log('InviteUsersModal handleClose called - who called this?');
    console.trace('Close called from:');
    onClose();
  };

  const handleRequestClose = () => {
    console.log('InviteUsersModal onRequestClose triggered (Android back button or gesture)');
    console.trace('Request close called from:');
    onClose();
  };

  useEffect(() => {
    console.log('InviteUsersModal useEffect - visible:', visible, 'user:', !!user);
    if (visible && user) {
      // Reset all state when modal opens
      setUsers([]);
      setSelectedCount(0);
      setSearchQuery('');
      setLoading(false);
      setInviting(false);
      loadUsers();
    }
  }, [visible, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      loadUsers();
    }
  }, [searchQuery]);

  useEffect(() => {
    console.log('InviteUsersModal render effect - visible:', visible);
  }, [visible]);

  const loadUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get friends first (priority)
      const friends = await userService.getUserFriends(user.id);
      
      // Get other users
      const allUsers = await userService.getAllUsers(user.id, 30);
      
      // Combine and mark friends
      const friendIds = friends.map(f => f.id);
      const otherUsers = allUsers.filter(u => !friendIds.includes(u.id));
      
      const combinedUsers: SelectableUser[] = [
        ...friends.map(f => ({ ...f, selected: false, isFriend: true })), // Ensure selected is false
        ...otherUsers.map(u => ({ ...u, selected: false, isFriend: false })) // Ensure selected is false
      ];
      
      console.log('loadUsers - loaded users:', combinedUsers.length, 'selected users:', combinedUsers.filter(u => u.selected).length);
      setUsers(combinedUsers);
      setSelectedCount(0); // Reset selected count
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await userService.searchUsers(searchQuery, user.id);
      const friends = await userService.getUserFriends(user.id);
      const friendIds = friends.map(f => f.id);
      
      const searchableUsers: SelectableUser[] = searchResults.map(u => ({
        ...u,
        selected: false, // Ensure selected is false
        isFriend: friendIds.includes(u.id)
      }));
      
      console.log('searchUsers - loaded users:', searchableUsers.length, 'selected users:', searchableUsers.filter(u => u.selected).length);
      setUsers(searchableUsers);
      setSelectedCount(0); // Reset selected count
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    console.log('toggleUserSelection called for userId:', userId);
    setUsers(prev => {
      const updated = prev.map(u => 
        u.id === userId ? { ...u, selected: !u.selected } : u
      );
      
      const newSelectedCount = updated.filter(u => u.selected).length;
      console.log('After toggle - selected count:', newSelectedCount);
      setSelectedCount(newSelectedCount);
      
      return updated;
    });
  };

  // Add debugging to track selectedCount changes
  useEffect(() => {
    console.log('selectedCount changed to:', selectedCount);
    if (selectedCount > 0) {
      console.log('Users currently selected:', users.filter(u => u.selected).map(u => u.display_name || u.username));
    }
  }, [selectedCount, users]);

  const handleInviteUsers = async () => {
    console.log('handleInviteUsers called');
    if (!user) return;
    
    const selectedUsers = users.filter(u => u.selected);
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to invite');
      return;
    }

    setInviting(true);
    try {
      console.log('Inviting users:', selectedUsers.map(u => u.display_name || u.username));
      const inviterName = user.displayName || user.username || 'Someone';
      
      // Send push notifications and create invitations
      for (const invitedUser of selectedUsers) {
        try {
          // Create event invitation using event service
          await eventService.inviteUsersToEvent(
            eventId,
            user.id,
            [invitedUser.id]
          );
          
          // Send push notification
          await notificationService.sendPushNotificationForInvitation(
            invitedUser.id,
            inviterName,
            eventTitle
          );
        } catch (error) {
          console.error('Error sending invitation to user:', invitedUser.id, error);
          // Continue with other users even if one fails
        }
      }
      
      console.log('Invitations sent successfully, calling onClose');
      onClose();
    } catch (error) {
      console.error('Error inviting users:', error);
      toast.error('Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const renderUserItem = ({ item }: { item: SelectableUser }) => {
    const displayName = item.display_name || item.username || 'Unknown User';
    const avatarUrl = item.avatar_url || 
      `https://api.a0.dev/assets/image?text=${displayName.slice(0, 1)}&aspect=1:1&seed=${item.id}`;

    return (
      <TouchableOpacity
        style={[styles.userItem, item.selected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{displayName}</Text>
          {item.username && item.username !== item.display_name && (
            <Text style={styles.username}>@{item.username}</Text>
          )}
          {item.isFriend && (
            <Text style={styles.friendLabel}>Friend</Text>
          )}
        </View>
        
        <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
          {item.selected && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Users</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('Invite button clicked - selectedCount:', selectedCount, 'inviting:', inviting);
              handleInviteUsers();
            }}
            disabled={selectedCount === 0 || inviting}
            style={[styles.inviteButton, (selectedCount === 0 || inviting) && styles.inviteButtonDisabled]}
          >
            {inviting ? (
              <ActivityIndicator size="small" color="#FF006E" />
            ) : (
              <Text style={[styles.inviteButtonText, selectedCount > 0 && styles.inviteButtonTextActive]}>
                Invite{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF006E" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#666" />
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Try a different search term' : 'No users available to invite'}
                </Text>
              </View>
            }
            ListHeaderComponent={
              !searchQuery && users.some(u => u.isFriend) ? (
                <Text style={styles.sectionHeader}>Friends appear first</Text>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButtonTextActive: {
    color: '#FF006E',
  },
  eventTitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  sectionHeader: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  userItemSelected: {
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  username: {
    color: '#888',
    fontSize: 14,
  },
  friendLabel: {
    color: '#FF006E',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF006E',
    borderColor: '#FF006E',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 