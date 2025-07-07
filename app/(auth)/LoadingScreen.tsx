import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const neonPurple = '#A259FF';

export default function LoadingScreen() {
  const router = useRouter();
  const spinValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.loader, { transform: [{ rotate: spin }] }]} />
      <Text style={styles.text}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    width: width * 0.18,
    height: width * 0.18,
    borderRadius: width * 0.09,
    borderWidth: 6,
    borderColor: neonPurple,
    borderTopColor: 'transparent',
    marginBottom: 32,
    shadowColor: neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  text: {
    color: neonPurple,
    fontSize: 22,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: neonPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
}); 