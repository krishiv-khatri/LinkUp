import { Event, eventService } from '@/services/eventService';
import { imagePreloader } from '@/utils/imagePreloader';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface EventsContextType {
  events: Event[];
  attendanceMap: Record<string, boolean>;
  loading: boolean;
  refreshing: boolean;
  lastFetched: Date | null;
  fetchEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  isStale: () => boolean;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

interface EventsProviderProps {
  children: ReactNode;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function EventsProvider({ children }: EventsProviderProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Check if cached data is stale
  const isStale = () => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched.getTime() > CACHE_DURATION;
  };

  const fetchEvents = async (forceRefresh = false) => {
    // If data is fresh and not forced, return early
    if (!forceRefresh && !isStale() && events.length > 0) {
      console.log('📚 Using cached events data');
      return;
    }

    try {
      console.log('🔄 Fetching fresh events data...');
      if (!forceRefresh) setLoading(true);
      
      const data = await eventService.getEvents();
      setEvents(data);
      setLastFetched(new Date());
      
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
        
        // High priority: First 5 events (immediately visible)
        const visibleEvents = data.slice(0, 5);
        const visibleImages = visibleEvents.flatMap(e => [
          e.coverImage,
          ...e.attendingFriends.filter(avatar => avatar && typeof avatar === 'string')
        ]);
        
        // Low priority: Remaining events (background loading)
        const backgroundEvents = data.slice(5);
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

  const refreshEvents = async () => {
    setRefreshing(true);
    await fetchEvents(true);
  };

  // Initial fetch when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const value: EventsContextType = {
    events,
    attendanceMap,
    loading,
    refreshing,
    lastFetched,
    fetchEvents,
    refreshEvents,
    isStale,
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
} 