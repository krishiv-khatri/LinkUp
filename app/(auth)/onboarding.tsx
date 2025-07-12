import AnimatedGradientBackground from '@/components/AnimatedGradientBackground';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OnboardingScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animation values for the text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(40)).current; // Start 40px below

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000); // 1 second delay

    return () => clearTimeout(timeout);
  }, []);

  const handlePress = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/sign-in');
    });
  };

  return (
    <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}> 
      <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handlePress}>
        <AnimatedGradientBackground style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
        <View style={styles.darkOverlay} pointerEvents="none" />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.welcome}>Welcome to</Text>
          <Text style={styles.linkup}>LinkUp</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  welcome: {
    fontSize: 34,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 0,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  linkup: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 1,
  },
});