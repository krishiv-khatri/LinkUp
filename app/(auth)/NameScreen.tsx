import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const neonPurple = '#A259FF';

export default function NameScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your name?</Text>
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inputGradient}
      >
        <View style={styles.inputInner}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#ccc"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
      </LinearGradient>
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inputGradient}
      >
        <View style={styles.inputInner}>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#ccc"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </LinearGradient>
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('./SignInScreen')}
          disabled={!firstName || !lastName}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </LinearGradient>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    marginBottom: 32,
    zIndex: 2,
  },
  inputGradient: {
    borderRadius: 24,
    padding: 2,
    marginBottom: 16,
  },
  inputInner: {
    backgroundColor: '#181818',
    borderRadius: 22,
    padding: 0,
  },
  input: {
    width: width * 0.76,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'System',
    borderWidth: 0,
  },
  buttonGradient: {
    borderRadius: 32,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 0,
    padding: 0,
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 14,
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
    opacity: 0.12,
    borderRadius: 999,
    zIndex: 1,
  },
  circle1: {
    width: width * 0.6,
    height: width * 0.6,
    top: -width * 0.15,
    left: -width * 0.2,
  },
  circle2: {
    width: width * 0.4,
    height: width * 0.4,
    bottom: -width * 0.1,
    right: -width * 0.1,
  },
}); 