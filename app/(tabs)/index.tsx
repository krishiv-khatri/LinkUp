import EventCard from '@/components/EventCard';
import FilterBar from '@/components/FilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define the Event type to avoid conflict with DOM Event
interface AppEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  location: string;
  category: string;
  attendingFriends: string[];
  attendingCount: number;
  coverImage: string;
  description: string;
  creator_id?: string;
}

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const { user } = useAuth();
  const { events, attendanceMap, loading, refreshing, refreshEvents, fetchEvents } = useEvents();
  const [selectedFilter, setSelectedFilter] = useState('now'); // Changed default to 'now'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // Fetch events when screen loads
  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const onRefresh = useCallback(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Enhanced filtering logic
  const filteredEvents = React.useMemo(() => {
    let filtered = events || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedFilter !== 'now' && !['today', 'week', 'month'].includes(selectedFilter)) {
      filtered = filtered.filter(event => event.category === selectedFilter);
    }

    // Apply date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        
        switch (selectedDateRange) {
          case 'today':
            return eventDate >= today && eventDate < tomorrow;
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
          case 'week':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return eventDate >= today && eventDate < weekEnd;
          case 'next-week':
            const nextWeekEnd = new Date(nextWeek);
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
            return eventDate >= nextWeek && eventDate < nextWeekEnd;
          case 'month':
            const monthEnd = new Date(today);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            return eventDate >= today && eventDate < monthEnd;
          case 'next-month':
            const nextMonthEnd = new Date(nextMonth);
            nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
            return eventDate >= nextMonth && eventDate < nextMonthEnd;
          case 'custom':
            if (customStartDate && customEndDate) {
              const startDate = new Date(customStartDate);
              const endDate = new Date(customEndDate);
              endDate.setHours(23, 59, 59, 999); // Include the entire end date
              return eventDate >= startDate && eventDate <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Apply time-based filters (today, this week, this month)
    if (['today', 'week', 'month'].includes(selectedFilter)) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        
        switch (selectedFilter) {
          case 'today':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate >= today && eventDate < tomorrow;
          case 'week':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return eventDate >= today && eventDate < weekEnd;
          case 'month':
            const monthEnd = new Date(today);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            return eventDate >= today && eventDate < monthEnd;
          default:
            return true;
        }
      });
    }

    // Sort events by date (closest first)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filtered;
  }, [events, selectedFilter, searchQuery, selectedDateRange, customStartDate, customEndDate]);

  const handleCustomDateChange = (startDate: Date, endDate: Date) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, { opacity: headerOpacity, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
            <View>
              <Text style={styles.headerTitle}>Explore</Text>
              <Text style={styles.headerSubtitle}>Discover events around you</Text>
            </View>
            <TouchableOpacity style={{ padding: 8, marginLeft: 8 }} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications" size={28} color="white" />
            </TouchableOpacity>
          </Animated.View>

          <FilterBar
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDateRange={selectedDateRange}
            onDateRangeChange={setSelectedDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={handleCustomDateChange}
          />

          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
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
            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF006E" />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : filteredEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={60} color="#666" />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() ? 'No events found' : 'No events found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery.trim() 
                    ? `No events match "${searchQuery}"` 
                    : 'Try adjusting your filters or search terms'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.eventsContainer}>
                {filteredEvents.map((event: AppEvent, index: number) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    isRSVPed={attendanceMap[event.id]}
                  />
                ))}
              </View>
            )}
            <View style={styles.bottomSpacing} />
          </Animated.ScrollView>
          
          <TouchableOpacity
            style={styles.fab}
            onPress={handleCreateEvent}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF006E', '#8338EC']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.plusIconContainer}>
                <Ionicons name="add" size={32} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: 'white',
    fontFamily: 'Georgia',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: '#888',
    marginTop: 8,
    fontSize: 16,
  },
  eventsContainer: {
    paddingHorizontal: 24,
  },
  bottomSpacing: {
    height: 50,
  },
  fab: {
    position: 'absolute',
    bottom: 115,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
