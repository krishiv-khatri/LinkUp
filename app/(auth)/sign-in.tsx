import AnimatedGradientBackground from '@/components/AnimatedGradientBackground';
import AnimatedWave from '@/components/AnimatedWave';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const params = useLocalSearchParams();
  const animationType = params.fromSignUp ? 'fade' : 'fade_from_bottom';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      console.log('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.log(`Sign in error: ${error}`);
      } else {
        console.log('Signed in successfully!');
        router.replace('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign In', headerShown: false, animation: animationType }} />
      <View style={styles.gradientContainer}>
        <AnimatedGradientBackground height={'45%'} style={styles.gradientBg} />
        {/* Animated wavy SVG overlay at the bottom of the gradient */}
        <AnimatedWave
          style={styles.wave}
          color={styles.container.backgroundColor || '#0A0A0A'}
          width={400}
          height={100}
          amplitude={30}
        />
        {/* Opacity gradient overlay for soft fade-out */}
        <LinearGradient
          colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.5)', styles.container.backgroundColor || '#0A0A0A']}
          style={styles.waveFade}
          pointerEvents="none"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>LinkUp</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={['#FF006E', '#8338EC']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/sign-up')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    zIndex: 1,
  },
  gradientBg: {
    width: '100%',
    height: '100%',
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    zIndex: 2,
  },
  waveFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 300,
    zIndex: 3,
  },
  content: {
    flex: 1,
    zIndex: 2,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: 'white',
    fontSize: 16,
  },
  button: {
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
  },
  footerLink: {
    color: '#FF006E',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 