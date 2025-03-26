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
import { ChevronLeft, Check, AlertCircle } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import theme from '../styles/theme';
import { FOLDER_COLOR_OPTIONS, FOLDER_COLORS } from '../constants/colors';
import DragHandle from './DragHandle';
import { useTranslation } from '../i18n/LanguageContext';

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
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS.pink);
  const [showValidation, setShowValidation] = useState(false);
  
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

  const handleCreate = () => {
    if (name.trim()) {
      try {
        onCreate(name.trim(), selectedColor);
        setName('');
        setSelectedColor(FOLDER_COLORS.pink);
        setShowValidation(false);
        onSuccess?.();
        onClose();
      } catch (error) {
        Alert.alert(t('alerts.error'), error instanceof Error ? error.message : t('alerts.error'));
      }
    } else {
      setShowValidation(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={overlayStyle}>
        <View style={styles.container}>
          <Animated.View style={modalStyle}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <ChevronLeft color={theme.colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.title}>{t('folders.creation.title')}</Text>
            </View>

            <View style={styles.content}>
              {/* Folder name input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>{t('folders.creation.nameLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (text.trim()) {
                      setShowValidation(false);
                    }
                  }}
                  placeholder={t('folders.creation.namePlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {showValidation && (
                  <View style={styles.validationMessage}>
                    <AlertCircle color="#FF6B6B" size={16} />
                    <Text style={styles.validationText}>{t('folders.creation.validation')}</Text>
                  </View>
                )}
              </View>

              {/* Updated color selection */}
              <View style={styles.colorSection}>
                <Text style={styles.label}>{t('folders.creation.colorLabel')}</Text>
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
                        <View style={styles.checkCircle}>
                          <Check color="#17181A" size={14} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Create button - always active */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
            >
              <Text style={styles.createButtonText}>
                {t('folders.creation.createButton')}
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A2B8FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: theme.colors.text,
    padding: theme.spacing.md,
    margin: theme.spacing.lg,
    borderRadius: 64,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
}); 