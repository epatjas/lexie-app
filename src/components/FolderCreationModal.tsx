import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import Animated, { 
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import theme from '../styles/theme';
import { FOLDER_COLOR_OPTIONS, FOLDER_COLORS } from '../constants/colors';
import DragHandle from './DragHandle';

interface FolderCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  onSuccess?: () => void;
}

export default function FolderCreationModal({
  visible,
  onClose,
  onCreate,
  onSuccess,
}: FolderCreationModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS.pink);
  
  const overlayOpacity = useSharedValue(0);
  const translateY = useSharedValue(1000);

  React.useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(1000, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleCreate = () => {
    if (name.trim()) {
      try {
        onCreate(name.trim(), selectedColor);
        setName('');
        setSelectedColor(FOLDER_COLORS.pink);
        onSuccess?.();
        onClose();
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <SafeAreaView style={styles.container}>
          <Animated.View style={[styles.contentContainer, modalStyle]}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Uusi kansio</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Folder name input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Kansion nimi</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Anna kansiolle nimi"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              {/* Updated color selection */}
              <View style={styles.colorSection}>
                <Text style={styles.label}>Valitse väri</Text>
                <View style={styles.colorGrid}>
                  {FOLDER_COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color.id}
                      style={styles.colorOption}
                      onPress={() => setSelectedColor(color.value)}
                    >
                      <View style={styles.colorOptionContent}>
                        <View 
                          style={[
                            styles.colorSquare,
                            { backgroundColor: color.value }
                          ]}
                        />
                        <Text style={styles.colorName}>{color.name}</Text>
                      </View>
                      {selectedColor === color.value && (
                        <Check color={theme.colors.text} size={20} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Updated create button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                !name.trim() && styles.createButtonDisabled
              ]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={[
                styles.createButtonText,
                !name.trim() && styles.createButtonTextDisabled
              ]}>
                Luo
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background02,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    position: 'relative',
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputSection: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  colorSection: {
    marginBottom: theme.spacing.xl,
  },
  colorGrid: {
    gap: theme.spacing.sm,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  colorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  colorSquare: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.md,
  },
  colorName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: 64,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.background02,
  },
  createButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  createButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
}); 