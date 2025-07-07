import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Dimensions, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const neonPurple = '#A259FF';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const router = useRouter();

  // Password validation checks
  const isLongEnough = password.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === rePassword;

  // Helper to pick from camera
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to take a photo!');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Helper to pick from photos
  const pickFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need photo library permissions to choose a photo!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Helper to pick from files
  const pickFromFiles = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Show native action sheet for options
  const pickPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Photos', 'Choose from Files', 'Cancel'],
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) pickFromCamera();
          else if (buttonIndex === 1) pickFromPhotos();
          else if (buttonIndex === 2) pickFromFiles();
        }
      );
    } else {
      Alert.alert(
        'Upload Photo',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: pickFromCamera },
          { text: 'Choose from Photos', onPress: pickFromPhotos },
          { text: 'Choose from Files', onPress: pickFromFiles },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inputGradient}
      >
        <View style={styles.inputInner}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
            placeholder="Phone Number"
            placeholderTextColor="#ccc"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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
            placeholder="Password"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
            placeholder="Re-enter Password"
            placeholderTextColor="#ccc"
            value={rePassword}
            onChangeText={setRePassword}
            secureTextEntry
          />
        </View>
      </LinearGradient>
      {/* Password checklist */}
      <View style={styles.checklistContainer}>
        <ChecklistItem label="At least 8 characters" checked={isLongEnough} />
        <ChecklistItem label="Contains a number or special character" checked={hasNumberOrSpecial} />
        <ChecklistItem label="Contains a lowercase letter" checked={hasLower} />
        <ChecklistItem label="Contains an uppercase letter" checked={hasUpper} />
        <ChecklistItem label="Passwords match" checked={passwordsMatch} />
      </View>
      <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
        <Text style={styles.photoButtonText}>{photo ? 'Change Photo' : 'Upload Photo'}</Text>
      </TouchableOpacity>
      {photo && (
        <Image source={{ uri: photo }} style={styles.photo} />
      )}
      <LinearGradient
        colors={['#FF006E', '#8338EC', '#3A86FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('./LoadingScreen')}
          disabled={!email || !phone || !password || !passwordsMatch || !isLongEnough || !hasNumberOrSpecial || !hasLower || !hasUpper}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={checked ? '#33FF99' : '#888'} style={{ marginRight: 8 }} />
      <Text style={{ color: checked ? '#fff' : '#aaa', fontSize: 15, fontFamily: 'System', fontWeight: '500' }}>{label}</Text>
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
    marginBottom: 24,
    zIndex: 2,
  },
  inputGradient: {
    borderRadius: 24,
    padding: 2,
    marginBottom: 12,
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
  photoButton: {
    backgroundColor: 'transparent',
    borderColor: '#A259FF',
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  photoButtonText: {
    color: '#A259FF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A259FF',
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
  checklistContainer: {
    marginBottom: 12,
    marginTop: -4,
    paddingHorizontal: 8,
  },
}); 