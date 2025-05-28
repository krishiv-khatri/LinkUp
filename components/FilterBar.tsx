import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FilterBarProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: 'now', label: 'Happening Now', icon: 'flash' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'week', label: 'This Week', icon: 'calendar' },
  { id: 'music', label: 'Music', icon: 'musical-notes' },
  { id: 'party', label: 'Party', icon: 'wine' },
  { id: 'art', label: 'Art', icon: 'color-palette' },
  { id: 'food', label: 'Food', icon: 'restaurant' },
];

export default function FilterBar({ selectedFilter, onFilterChange }: FilterBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => onFilterChange(filter.id)}
            style={styles.filterButton}
            activeOpacity={0.8}
          >
            {selectedFilter === filter.id ? (
              <LinearGradient
                colors={['#FF006E', '#8338EC']}
                style={styles.activeFilter}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={filter.icon as any} size={16} color="white" />
                <Text style={styles.activeFilterText}>{filter.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveFilter}>
                <Ionicons name={filter.icon as any} size={16} color="#666" />
                <Text style={styles.inactiveFilterText}>{filter.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  inactiveFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
    gap: 6,
  },
  activeFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inactiveFilterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});