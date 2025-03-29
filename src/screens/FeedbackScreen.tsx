import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Bug,
  FileSearch,
  Sticker,
  Lightbulb,
  Blend,
  ChevronDown,
  Check,
  X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';
import { useActiveProfile } from '../hooks/useActiveProfile';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
  FadeIn,
  FadeOut,
  withSpring,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import DragHandle from '../components/DragHandle';
import { SimpleAnalytics, EventType } from '../services/SimpleAnalytics';
import { Analytics, FeedbackType } from '../services/AnalyticsService';

type FeedbackCategory = {
  id: string;
  icon: (color: string) => React.ReactNode;
  label: string;
};

export default function FeedbackScreen({ 
  navigation, 
  onClose,
  visible = true
}: {
  navigation: any,
  onClose?: () => void,
  visible?: boolean
}) {
  const progress = useSharedValue(0);
  const { t } = useTranslation();
  const [activeProfile] = useActiveProfile();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Animation setup
  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 300 });
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      backgroundColor: 'rgba(0,0,0,0.7)',
      ...StyleSheet.absoluteFillObject,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [1000, 0]
    );
    
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
      height: '85%',
      paddingBottom: 20,
    };
  });

  const feedbackCategories: FeedbackCategory[] = [
    { 
      id: 'technical', 
      icon: (color: string) => <Bug size={16} color={color} />, 
      label: t('feedback.categories.technical') 
    },
    { 
      id: 'content', 
      icon: (color: string) => <FileSearch size={16} color={color} />, 
      label: t('feedback.categories.content') 
    },
    { 
      id: 'ux', 
      icon: (color: string) => <Sticker size={16} color={color} />, 
      label: t('feedback.categories.ux') 
    },
    { 
      id: 'feature', 
      icon: (color: string) => <Lightbulb size={16} color={color} />, 
      label: t('feedback.categories.feature') 
    },
    { 
      id: 'other', 
      icon: (color: string) => <Blend size={16} color={color} />, 
      label: t('feedback.categories.other') 
    },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('alerts.error'), t('feedback.permissions.gallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setScreenshot(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert(t('alerts.error'), t('feedback.errors.category'));
      return;
    }

    if (!feedbackText.trim()) {
      Alert.alert(t('alerts.error'), t('feedback.errors.description'));
      return;
    }

    // TODO: Implement actual feedback submission
    const feedbackData = {
      category: selectedCategory,
      description: feedbackText,
      screenshot,
      userId: activeProfile?.id,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('Feedback data:', feedbackData);
    
    // Log feedback to analytics
    await Analytics.logFeedback(
      FeedbackType.APP_FEEDBACK,
      true,
      {
        category: selectedCategory,
        has_screenshot: !!screenshot,
        feedback_length: feedbackText.length,
        feedback_text: feedbackText,
      }
    );
    
    // Show thank you message
    setShowThankYou(true);
    
    // Use onClose prop instead of navigation.goBack()
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 2000);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    // Track screen view
    Analytics.logScreenView('Feedback');
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View 
        style={overlayStyle}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
      </Animated.View>
      
      <Animated.View style={modalStyle}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <ChevronLeft color={theme.colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.title}>{t('feedback.title')}</Text>
              <View style={styles.backButton} />
            </View>

            <View style={styles.content}>
              {/* Category Label */}
              <Text style={styles.label}>{t('feedback.selectCategory')}</Text>

              {/* Category Container - this is the new wrapper */}
              <View style={styles.categoryContainer}>
                {/* Category Selector */}
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <View style={styles.categoryContent}>
                    {selectedCategory ? (
                      <>
                        {feedbackCategories.find(c => c.id === selectedCategory)?.icon(theme.colors.text)}
                        <Text style={styles.categoryText}>
                          {feedbackCategories.find(c => c.id === selectedCategory)?.label}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.placeholderText}>{t('feedback.selectCategoryPlaceholder')}</Text>
                    )}
                  </View>
                  <ChevronDown 
                    size={20} 
                    color={theme.colors.text} 
                    style={{ 
                      transform: [{ rotate: isDropdownOpen ? '180deg' : '0deg' }],
                    }} 
                  />
                </TouchableOpacity>

                {/* Dropdown - positioned absolutely relative to container */}
                {isDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {feedbackCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCategory(category.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {category.icon(selectedCategory === category.id ? theme.colors.primary : theme.colors.text)}
                        <Text style={[
                          styles.dropdownItemText,
                          selectedCategory === category.id && styles.dropdownItemTextSelected
                        ]}>
                          {category.label}
                        </Text>
                        {selectedCategory === category.id && (
                          <View style={styles.checkmark}>
                            <Check size={16} color="#000000" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Tell us more label */}
              <Text style={[styles.label, { marginTop: 24 }]}>Tell us more</Text>

              {/* Feedback Text Input */}
              <TextInput
                style={styles.textInput}
                multiline
                placeholder={t('feedback.placeholder')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={feedbackText}
                onChangeText={setFeedbackText}
                cursorColor={theme.colors.primary}
              />

              {/* Screenshot Section */}
              <View style={styles.screenshotSection}>
                <TouchableOpacity 
                  style={styles.screenshotButton} 
                  onPress={pickImage}
                >
                  <Plus size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.screenshotText}>{t('feedback.screenshot.help')}</Text>
              </View>

              {/* Screenshot Preview */}
              {screenshot && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: screenshot }} style={styles.screenshotPreview} />
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => setScreenshot(null)}
                  >
                    <Trash2 size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        {/* Thank You Message */}
        {showThankYou && (
          <View style={styles.feedbackToast}>
            <View style={styles.closeToastButtonContainer}>
              <TouchableOpacity 
                style={styles.closeToastButton}
                onPress={() => setShowThankYou(false)}
              >
                <X color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>
            <Text style={styles.feedbackToastText}>{t('feedback.thankYou')}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background01,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  label: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 12,
    opacity: 1,
  },
  categoryContainer: {
    position: 'relative', 
    zIndex: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4, 
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    zIndex: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dropdownItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  dropdownItemTextSelected: {
    color: theme.colors.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    height: 240,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  screenshotSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  screenshotButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotText: {
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  previewContainer: {
    position: 'relative',
    marginTop: 16,
    width: 80,
    height: 80,
  },
  screenshotPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background01,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    margin: 16,
    height: 56,
    backgroundColor: theme.colors.text,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 17,
    color: theme.colors.background,
    fontFamily: theme.fonts.medium,
  },
  feedbackToast: {
    position: 'absolute',
    top: 20,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2000,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 60, 0.5)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackToastText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    flex: 1,
    textAlign: 'left',
    paddingLeft: 0,
    marginRight: 0,
  },
  closeToastButtonContainer: {
    marginRight: 4,
    marginLeft: -4,
  },
  closeToastButton: {
    padding: 5,
    backgroundColor: 'rgba(80, 80, 80, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
}); 