import AnimatedGradientBackground from '@/components/AnimatedGradientBackground';
import AnimatedWave from '@/components/AnimatedWave';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: '',
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text && !validateEmail(text)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setValidationErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0 && text.length < 6) {
      setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
    } else {
      setValidationErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleSignIn = async () => {
    // Reset validation errors
    setValidationErrors({ email: '', password: '' });

    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter your email and password to sign in.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        Alert.alert('Sign In Failed', error);
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Oops!', 'Something unexpected happened. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = email && password && validateEmail(email) && password.length >= 6;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign In', headerShown: false, animation: animationType }} />
      <View style={styles.gradientContainer}>
        <AnimatedGradientBackground height={'45%'} style={styles.gradientBg} />
        <AnimatedWave
          style={styles.wave}
          color={styles.container.backgroundColor || '#0A0A0A'}
          width={400}
          height={100}
          amplitude={30}
        />
        <LinearGradient
          colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.5)', styles.container.backgroundColor || '#0A0A0A']}
          style={styles.gradientOverlay}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to LinkUp</Text>
        
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, validationErrors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#666"
                value={email}
                onChangeText={handleEmailChange}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {email && !validationErrors.email && validateEmail(email) && (
                <Ionicons name="checkmark-circle" size={20} color="#00C853" style={styles.validIcon} />
              )}
              {validationErrors.email && (
                <Ionicons name="alert-circle" size={20} color="#FF6B6B" style={styles.validIcon} />
              )}
            </View>
            {validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, validationErrors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                autoComplete="current-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            {validationErrors.password && (
              <Text style={styles.errorText}>{validationErrors.password}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting || !isFormValid}
          >
            <LinearGradient
              colors={isFormValid ? ['#FF006E', '#8338EC'] : ['#333', '#333']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[styles.buttonText, !isFormValid && styles.buttonTextDisabled]}>
                  Sign In
                </Text>
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
    height: '50%',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wave: {
    top: 80,
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  validIcon: {
    marginLeft: 8,
  },
  passwordToggle: {
    marginLeft: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  buttonTextDisabled: {
    color: '#666',
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
  },
  footerLink: {
    color: '#FF006E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
}); 