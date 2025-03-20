import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { ChevronLeft, Check, Trash2, AlertCircle } from 'lucide-react-native';
import Animated, { 
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  Extrapolate,
} from 'react-native-reanimated';
import theme from '../styles/theme';
import { FOLDER_COLOR_OPTIONS } from '../constants/colors';
import DragHandle from './DragHandle';

interface FolderEditModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onSave: (name: string, color: string) => void;
  folderName: string;
  folderColor: string;
}

export default function FolderEditModal({
  visible,
  onClose,
  onDelete,
  onSave,
  folderName,
  folderColor,
}: FolderEditModalProps) {
  const [name, setName] = useState(folderName);
  const [selectedColor, setSelectedColor] = useState(folderColor);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  // Reset state when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setName(folderName);
      setSelectedColor(folderColor);
      setShowValidation(false);
    }
  }, [visible, folderName, folderColor]);

  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 300 });
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      backgroundColor: 'rgba(0,0,0,0.5)',
      ...StyleSheet.absoluteFillObject,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    const translateY = 1000 - (progress.value * 1000);

    return {
      transform: [{ translateY }],
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '92%',
      paddingTop: theme.spacing.xs,
    };
  });

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    // Save both the current name and the new color
    if (name.trim()) {
      onSave(name.trim(), color);
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim()) {
      setShowValidation(false);
    }
  };

  const handleBackPress = () => {
    // Save name changes when going back
    if (name.trim()) {
      onSave(name.trim(), selectedColor);
      onClose();
    } else {
      setShowValidation(true);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete folder',
      'Are you sure you want to delete this folder? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete folder');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackPress}
    >
      <Animated.View style={overlayStyle}>
        <View style={styles.container}>
          <Animated.View style={modalStyle}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            <View style={styles.header}>
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ChevronLeft color={theme.colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.title}>Edit folder</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Folder name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  onBlur={() => {
                    // Save when user finishes editing
                    if (name.trim()) {
                      onSave(name.trim(), selectedColor);
                    } else {
                      setShowValidation(true);
                    }
                  }}
                  placeholder="Enter folder name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {showValidation && (
                  <View style={styles.validationMessage}>
                    <AlertCircle color="#FF6B6B" size={16} />
                    <Text style={styles.validationText}>Please enter a folder name</Text>
                  </View>
                )}
              </View>

              <View style={styles.colorSection}>
                <Text style={styles.label}>Pick a color</Text>
                <View style={styles.colorGrid}>
                  {FOLDER_COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color.id}
                      style={styles.colorOption}
                      onPress={() => handleColorSelect(color.value)}
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
                        <View style={styles.checkCircle}>
                          <Check color="#17181A" size={14} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 color={theme.colors.text} size={20} />
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    position: 'relative',
  },
  title: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.md,
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
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  validationText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: '#FF6B6B',
  },
  colorSection: {
    marginBottom: theme.spacing.xl,
  },
  colorGrid: {
    gap: theme.spacing.xs,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  colorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  colorSquare: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.md,
  },
  colorName: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#98BDF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    margin: theme.spacing.lg,
    borderRadius: 64,
    backgroundColor: theme.colors.background02,
    gap: theme.spacing.sm,
  },
  deleteButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
}); 