import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingBirthdayScreen() {
  const params = useLocalSearchParams();
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleNext = () => {
    if (selectedMonth === null || selectedDay === null || selectedYear === null) {
      Alert.alert('Almost there!', 'Please select your complete date of birth to continue setting up your profile.');
      return;
    }

    const birthDate = new Date(selectedYear, selectedMonth, selectedDay);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13) {
      Alert.alert('Age Requirement', 'You must be at least 13 years old to use LinkUp. If you\'re 13 or older, please check your birth date.');
      return;
    }

    // Navigate to the next step - socials
    router.push({
      pathname: '/onboarding-socials',
      params: {
        ...params,
        birthMonth: selectedMonth,
        birthDay: selectedDay,
        birthYear: selectedYear,
      },
    });
  };

  // Remove skip functionality for required birthday
  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#FF006E', '#8338EC']}
              style={[styles.progressFill, { width: '75%' }]}
            />
          </View>
          <Text style={styles.progressText}>Step 3 of 4</Text>
        </View>
        <View style={styles.placeholderSpace} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>When's your birthday?</Text>
          <Text style={styles.subtitle}>This is required to show you age-appropriate content</Text>
        </View>

        <View style={styles.dateContainer}>
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Month</Text>
            <ScrollView style={styles.dateScrollContainer} showsVerticalScrollIndicator={false}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateOption,
                    selectedMonth === index && styles.selectedDateOption,
                  ]}
                  onPress={() => setSelectedMonth(index)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    selectedMonth === index && styles.selectedDateOptionText,
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Day</Text>
            <ScrollView style={styles.dateScrollContainer} showsVerticalScrollIndicator={false}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dateOption,
                    selectedDay === day && styles.selectedDateOption,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    selectedDay === day && styles.selectedDateOptionText,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Year</Text>
            <ScrollView style={styles.dateScrollContainer} showsVerticalScrollIndicator={false}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.dateOption,
                    selectedYear === year && styles.selectedDateOption,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    selectedYear === year && styles.selectedDateOptionText,
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={16} color="#888" />
          <Text style={styles.privacyText}>
            Your birthday will be kept private and secure
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <LinearGradient
            colors={['#FF006E', '#8338EC']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  placeholderSpace: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
    height: 200,
  },
  dateSection: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateScrollContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    flex: 1,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedDateOption: {
    backgroundColor: '#FF006E',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  selectedDateOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  privacyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 