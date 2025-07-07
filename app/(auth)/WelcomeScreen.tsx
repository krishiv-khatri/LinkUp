import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to LinkUp</Text>
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <TouchableOpacity style={styles.button} onPress={() => router.push('./NameScreen')}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const neonPurple = '#A259FF';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System', // Use a bold sans-serif font
    marginBottom: 40,
    zIndex: 2,
  },
  buttonGradient: {
    borderRadius: 32,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 0,
    padding: 0,
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
    letterSpacing: 1,
  },
  circle: {
    position: 'absolute',
    backgroundColor: neonPurple,
    opacity: 0.15,
    borderRadius: 999,
    zIndex: 1,
  },
  circle1: {
    width: width * 0.7,
    height: width * 0.7,
    top: -width * 0.2,
    left: -width * 0.2,
  },
  circle2: {
    width: width * 0.5,
    height: width * 0.5,
    bottom: -width * 0.1,
    right: -width * 0.15,
  },
  circle3: {
    width: width * 0.3,
    height: width * 0.3,
    bottom: height * 0.15,
    left: width * 0.1,
  },
}); 