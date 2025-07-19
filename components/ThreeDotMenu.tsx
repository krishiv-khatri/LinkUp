import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface ThreeDotMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export default function ThreeDotMenu({ onEdit, onDelete }: ThreeDotMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);

  const handleEdit = () => {
    setIsVisible(false);
    onEdit();
  };

  const handleDelete = () => {
    setIsVisible(false);
    onDelete();
  };

  const handlePress = () => {
    buttonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setButtonLayout({ x: pageX, y: pageY, width, height });
      setIsVisible(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={styles.menuButton}
        onPress={handlePress}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color="#888" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
          <View style={styles.overlay}>
            <View 
              style={[
                styles.menu,
                {
                  position: 'absolute',
                  top: buttonLayout.y - 120, // Position further above to not cover the button
                  left: buttonLayout.x - 50, // Center horizontally relative to button
                }
              ]}
            >
              <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                <Text style={styles.menuText}>Edit</Text>
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                <Text style={[styles.menuText, styles.deleteText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  deleteText: {
    color: '#FF3B30',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
}); 