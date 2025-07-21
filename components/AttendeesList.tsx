import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Attendee {
  id: string;
  user_id: string;
  avatar_url: string;
  name?: string;
}

interface AttendeesListProps {
  attendees: Attendee[];
  totalCount: number;
  maxVisible?: number;
}

export default function AttendeesList({ attendees, totalCount, maxVisible = 4 }: AttendeesListProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleAttendees = attendees.slice(0, maxVisible);
  const remainingCount = Math.max(0, totalCount - maxVisible);

  const filteredAttendees = searchQuery
    ? attendees.filter(attendee => 
        attendee.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : attendees;

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={() => setShowModal(true)}>
        <View style={styles.avatarsContainer}>
          {visibleAttendees.map((attendee, idx) => (
            <Image
              key={attendee.id}
              source={{ uri: attendee.avatar_url }}
              style={[styles.avatar, { marginLeft: idx > 0 ? -8 : 0 }]}
            />
          ))}
        </View>
        
        {remainingCount > 0 ? (
          <Text style={styles.attendeesText}>and {remainingCount} more</Text>
        ) : (
          <Text style={styles.attendeesText}>
            {totalCount === 1 ? '1 going' : `${totalCount} going`}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Who's Going</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search attendees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
          </View>

          <ScrollView style={styles.attendeesList} showsVerticalScrollIndicator={false}>
            {filteredAttendees.map((attendee) => (
              <View key={attendee.id} style={styles.attendeeItem}>
                <Image
                  source={{ uri: attendee.avatar_url }}
                  style={styles.attendeeAvatar}
                />
                <Text style={styles.attendeeName}>{attendee.name}</Text>
              </View>
            ))}
            
            {filteredAttendees.length === 0 && searchQuery && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No attendees found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  attendeesText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  attendeesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  attendeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
}); 