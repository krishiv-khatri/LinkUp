import EventCard from '@/components/EventCard';
import FilterBar from '@/components/FilterBar';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const mockEvents = [
  {
    id: '1',
    title: 'Clockenflap 2025',
    time: '8 PM',
    location: 'Central Harbourfront',
    category: 'music',
    attendingFriends: [
      'https://api.a0.dev/assets/image?text=cool%20asian%20girl%20smiling&aspect=1:1&seed=1',
      'https://api.a0.dev/assets/image?text=stylish%20guy%20with%20glasses&aspect=1:1&seed=2',
      'https://api.a0.dev/assets/image?text=girl%20with%20pink%20hair&aspect=1:1&seed=3',
    ],
    attendingCount: 847,
    coverImage: 'https://api.a0.dev/assets/image?text=music%20festival%20stage%20with%20neon%20lights%20and%20crowd&aspect=16:9&seed=10',
    description: 'Hong Kong\'s biggest music festival is back! Three days of international acts, local bands, and unforgettable vibes.',
  },
  {
    id: '2',
    title: 'Rooftop Rave',
    time: '11 PM',
    location: 'Tsim Sha Tsui',
    category: 'party',
    attendingFriends: [
      'https://api.a0.dev/assets/image?text=party%20girl%20with%20glitter&aspect=1:1&seed=4',
      'https://api.a0.dev/assets/image?text=guy%20in%20neon%20shirt&aspect=1:1&seed=5',
    ],
    attendingCount: 156,
    coverImage: 'https://api.a0.dev/assets/image?text=rooftop%20party%20hong%20kong%20skyline%20at%20night%20neon%20lights&aspect=16:9&seed=11',
    description: 'Secret rooftop party with the best views of HK skyline. DJ sets, craft cocktails, and good vibes only.',
  },
  {
    id: '3',
    title: 'Art Gallery Opening',
    time: '7 PM',
    location: 'Sheung Wan',
    category: 'art',
    attendingFriends: [
      'https://api.a0.dev/assets/image?text=artistic%20girl%20with%20beret&aspect=1:1&seed=6',
    ],
    attendingCount: 89,
    coverImage: 'https://api.a0.dev/assets/image?text=modern%20art%20gallery%20with%20colorful%20paintings%20and%20people&aspect=16:9&seed=12',
    description: 'Contemporary art showcase featuring emerging HK artists. Wine, art, and creative energy.',
  },
  {
    id: '4',
    title: 'Night Market Crawl',
    time: '9 PM',
    location: 'Mong Kok',
    category: 'food',
    attendingFriends: [
      'https://api.a0.dev/assets/image?text=foodie%20guy%20eating%20street%20food&aspect=1:1&seed=7',
      'https://api.a0.dev/assets/image?text=girl%20holding%20bubble%20tea&aspect=1:1&seed=8',
      'https://api.a0.dev/assets/image?text=guy%20with%20chopsticks&aspect=1:1&seed=9',
    ],
    attendingCount: 234,
    coverImage: 'https://api.a0.dev/assets/image?text=bustling%20hong%20kong%20night%20market%20with%20street%20food%20stalls&aspect=16:9&seed=13',
    description: 'Explore the best street food in HK with fellow foodies. From dim sum to fish balls!',
  },
];

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState('now');
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
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
        >
          <View style={styles.eventsContainer}>
            {mockEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
              />
            ))}
          </View>
          <View style={styles.bottomSpacing} />
        </Animated.ScrollView>
      </SafeAreaView>
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
    paddingTop: 8,
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
  eventsContainer: {
    paddingHorizontal: 24,
  },
  bottomSpacing: {
    height: 100,
  },
});
