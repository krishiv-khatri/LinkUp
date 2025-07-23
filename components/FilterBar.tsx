import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface FilterBarProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange?: (startDate: Date, endDate: Date) => void;
}

const filters = [
  { id: 'now', label: 'Happening Now', icon: 'flash' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'week', label: 'This Week', icon: 'calendar' },
  { id: 'month', label: 'This Month', icon: 'calendar-outline' },
  { id: 'music', label: 'Music', icon: 'musical-notes' },
  { id: 'party', label: 'Party', icon: 'wine' },
  { id: 'art', label: 'Art', icon: 'color-palette' },
  { id: 'food', label: 'Food', icon: 'restaurant' },
  { id: 'sports', label: 'Sports', icon: 'football' },
  { id: 'tech', label: 'Tech', icon: 'laptop' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
];

const dateRanges = [
  { id: 'all', label: 'All Time', icon: 'infinite' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'tomorrow', label: 'Tomorrow', icon: 'calendar' },
  { id: 'week', label: 'This Week', icon: 'calendar-outline' },
  { id: 'next-week', label: 'Next Week', icon: 'calendar-clear' },
  { id: 'month', label: 'This Month', icon: 'calendar-number' },
  { id: 'next-month', label: 'Next Month', icon: 'calendar-number-outline' },
  { id: 'custom', label: 'Custom Range', icon: 'calendar' },
];

// Simple date picker component
const DatePicker = ({ 
  value, 
  onDateChange, 
  placeholder, 
  minDate, 
  maxDate 
}: {
  value: Date;
  onDateChange: (date: Date) => void;
  placeholder: string;
  minDate?: Date;
  maxDate?: Date;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const handleConfirm = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const generateCalendarDays = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === tempDate.getMonth() && date.getFullYear() === tempDate.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === tempDate.toDateString();
  };

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDisabled(date)) {
      setTempDate(date);
    }
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setTempDate(newDate);
  };

  if (showPicker) {
    const calendarDays = generateCalendarDays();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.datePickerConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={24} color="#FF006E" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {monthNames[tempDate.getMonth()]} {tempDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={24} color="#FF006E" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
              ))}
              
              {calendarDays.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonth(date) && styles.calendarDayOtherMonth,
                    isSelected(date) && styles.calendarDaySelected,
                    isDisabled(date) && styles.calendarDayDisabled
                  ]}
                  onPress={() => handleDateSelect(date)}
                  disabled={isDisabled(date)}
                >
                  <Text style={[
                    styles.calendarDayText,
                    !isCurrentMonth(date) && styles.calendarDayTextOtherMonth,
                    isSelected(date) && styles.calendarDayTextSelected,
                    isDisabled(date) && styles.calendarDayTextDisabled
                  ]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <TouchableOpacity
      style={styles.datePickerButton}
      onPress={() => setShowPicker(true)}
    >
      <Text style={styles.datePickerButtonText}>
        {formatDate(value)}
      </Text>
      <Ionicons name="calendar-outline" size={16} color="#666" />
    </TouchableOpacity>
  );
};

export default function FilterBar({ 
  selectedFilter, 
  onFilterChange, 
  searchQuery, 
  onSearchChange,
  selectedDateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange
}: FilterBarProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCustomDateInput, setShowCustomDateInput] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customStartDate || new Date());
  const [tempEndDate, setTempEndDate] = useState(customEndDate || new Date());

  const getDateRangeLabel = (rangeId: string) => {
    if (rangeId === 'custom' && customStartDate && customEndDate) {
      const startStr = customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    const range = dateRanges.find(r => r.id === rangeId);
    return range ? range.label : 'Date Filter';
  };

  const getDateRangeIcon = (rangeId: string) => {
    if (rangeId === 'custom' && customStartDate && customEndDate) {
      return 'calendar';
    }
    const range = dateRanges.find(r => r.id === rangeId);
    return range ? range.icon : 'calendar-outline';
  };

  const handleCustomDateConfirm = () => {
    if (onCustomDateChange) {
      onCustomDateChange(tempStartDate, tempEndDate);
    }
    onDateRangeChange('custom');
    setShowDateModal(false);
    setShowCustomDateInput(false);
  };

  const handleCustomRangePress = () => {
    setShowCustomDateInput(true);
  };

  const isDateFilterActive = selectedDateRange !== 'all';

  return (
    <View style={styles.container}>
      {/* Compact Search and Date Range Row */}
      <View style={styles.topRow}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={onSearchChange}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.dateRangeButton,
            isDateFilterActive && styles.dateRangeButtonActive
          ]}
          onPress={() => setShowDateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={getDateRangeIcon(selectedDateRange) as any} 
            size={16} 
            color={isDateFilterActive ? "#FF006E" : "#666"} 
          />
          <Text style={[
            styles.dateRangeText, 
            isDateFilterActive && styles.dateRangeTextActive
          ]} numberOfLines={1}>
            {getDateRangeLabel(selectedDateRange)}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={12} 
            color={isDateFilterActive ? "#FF006E" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => onFilterChange(filter.id)}
            style={styles.filterButton}
            activeOpacity={0.8}
          >
            {selectedFilter === filter.id ? (
              <LinearGradient
                colors={['#FF006E', '#8338EC']}
                style={styles.activeFilter}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={filter.icon as any} size={16} color="white" />
                <Text style={styles.activeFilterText}>{filter.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveFilter}>
                <Ionicons name={filter.icon as any} size={16} color="#666" />
                <Text style={styles.inactiveFilterText}>{filter.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDateModal(false);
          setShowCustomDateInput(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => {
                setShowDateModal(false);
                setShowCustomDateInput(false);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {!showCustomDateInput ? (
              /* Quick Date Ranges */
              <View style={styles.quickDateSection}>
                <View style={styles.quickDateGrid}>
                  {dateRanges.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.quickDateItem,
                        selectedDateRange === item.id && styles.quickDateItemSelected
                      ]}
                      onPress={() => {
                        if (item.id === 'custom') {
                          handleCustomRangePress();
                        } else {
                          onDateRangeChange(item.id);
                          setShowDateModal(false);
                        }
                      }}
                    >
                      <Ionicons 
                        name={item.icon as any} 
                        size={16} 
                        color={selectedDateRange === item.id ? '#FF006E' : '#666'} 
                      />
                      <Text style={[
                        styles.quickDateItemText,
                        selectedDateRange === item.id && styles.quickDateItemTextSelected
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              /* Custom Date Range Section */
              <View style={styles.customDateSection}>
                <Text style={styles.customDateTitle}>Custom Date Range</Text>
                
                <View style={styles.customDateRow}>
                  <View style={styles.customDateInputContainer}>
                    <Text style={styles.customDateLabel}>Start Date</Text>
                    <DatePicker
                      value={tempStartDate}
                      onDateChange={setTempStartDate}
                      placeholder="Select Start Date"
                      maxDate={tempEndDate}
                    />
                  </View>
                  
                  <View style={styles.customDateInputContainer}>
                    <Text style={styles.customDateLabel}>End Date</Text>
                    <DatePicker
                      value={tempEndDate}
                      onDateChange={setTempEndDate}
                      placeholder="Select End Date"
                      minDate={tempStartDate}
                    />
                  </View>
                </View>
                
                <View style={styles.customDateButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCustomDateInput(false);
                      setTempStartDate(customStartDate || new Date());
                      setTempEndDate(customEndDate || new Date());
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleCustomDateConfirm}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 0.8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  clearButton: {
    marginLeft: 4,
    padding: 2,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6,
    minWidth: 60,
    flex: 0.2,
  },
  dateRangeButtonActive: {
    borderColor: '#FF006E',
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
  },
  dateRangeText: {
    flex: 1,
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'left',
  },
  dateRangeTextActive: {
    color: '#FF006E',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
  },
  inactiveFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
    gap: 5,
  },
  activeFilterText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  inactiveFilterText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // Quick Date Section
  quickDateSection: {
    padding: 20,
  },
  quickDateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  quickDateItemSelected: {
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
    borderColor: '#FF006E',
  },
  quickDateItemText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  quickDateItemTextSelected: {
    color: '#FF006E',
    fontWeight: '600',
  },
  dateRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedDateRangeItem: {
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
  },
  dateRangeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateRangeItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDateRangeItemText: {
    color: '#FF006E',
    fontWeight: '600',
  },
  customDateSection: {
    padding: 20,
  },
  customDateTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  customDateInputContainer: {
    flex: 1,
  },
  customDateLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  customDateButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FF006E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  datePickerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerConfirmText: {
    color: '#FF006E',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  datePickerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  calendarMonthText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
  },
  calendarDayHeader: {
    width: '14.28%',
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#FF006E',
    borderRadius: 20,
  },
  calendarDayDisabled: {
    opacity: 0.2,
  },
  calendarDayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayTextOtherMonth: {
    color: '#666',
  },
  calendarDayTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  calendarDayTextDisabled: {
    color: '#444',
  },
});