import EventCard from '@/components/EventCard'; // Adjusted path
import FilterBar from '@/components/FilterBar'; // Adjusted path
import { useAuth } from '@/contexts/AuthContext';
import { Event, eventService } from '@/services/eventService';
import { imagePreloader } from '@/utils/imagePreloader';
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

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('now');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  
  const fetchEvents = async () => {
    try {
      console.log('🔄 Fetching events...');
      const data = await eventService.getEvents();
      setEvents(data);
      
      // Batch check attendance for all events if user is logged in
      if (user && data.length > 0) {
        console.log('👤 Checking attendance for', data.length, 'events');
        const eventIds = data.map(e => e.id);
        const attendanceData = await eventService.batchCheckAttendance(eventIds, user.id);
        setAttendanceMap(attendanceData);
      }
      
      // Preload images with priority
      if (data.length > 0) {
        console.log('🖼️ Starting image preloading...');
        
        // High priority: First 3 events (immediately visible)
        const visibleEvents = data.slice(0, 3);
        const visibleImages = visibleEvents.flatMap(e => [
          e.coverImage,
          ...e.attendingFriends.filter(avatar => avatar && typeof avatar === 'string')
        ]);
        
        // Low priority: Remaining events (background loading)
        const backgroundEvents = data.slice(3);
        const backgroundImages = backgroundEvents.flatMap(e => [
          e.coverImage,
          ...e.attendingFriends.filter(avatar => avatar && typeof avatar === 'string')
        ]);
        
        // Start preloading
        imagePreloader.preloadImages(visibleImages, 'high');
        imagePreloader.preloadImages(backgroundImages, 'low');
        
        // Log cache stats
        const stats = imagePreloader.getCacheStats();
        console.log('📊 Image cache stats:', stats);
      }
      
    } catch (error) {
      console.error('❌ Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [user]); // Re-fetch when user changes

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [user]);

  // Filter events based on selectedFilter
  const filteredEvents = React.useMemo(() => {
    if (['music', 'party', 'art', 'food'].includes(selectedFilter)) {
      return events.filter(event => event.category === selectedFilter);
    }
    return events;
  }, [events, selectedFilter]);

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
            <Text style={styles.headerTitle}>Right Now</Text>
            <Text style={styles.headerSubtitle}>What's happening in Hong Kong</Text>
          </Animated.View>

          <FilterBar
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
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
                <Ionicons name="calendar-outline" size={60} color="#666" />
                <Text style={styles.emptyText}>No events found</Text>
                <Text style={styles.emptySubtext}>Check back later for upcoming events</Text>
              </View>
            ) : (
              <View style={styles.eventsContainer}>
                {filteredEvents.map((event, index) => (
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
