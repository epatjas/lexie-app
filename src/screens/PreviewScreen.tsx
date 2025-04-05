import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  Platform,
} from 'react-native';
import { analyzeImages, getProcessingStatus, remoteLog } from '../services/api';
import { createStudySet } from '../services/Database';
import { Analytics, EventType } from '../services/AnalyticsService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft, Search, Brain, Sparkles, Trash2, FileText, ListChecks } from 'lucide-react-native';
import theme from '../styles/theme';
import { StudyMaterials } from '../types/types';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  useSharedValue,
  withDelay
} from 'react-native-reanimated';
import ParticleBackground from '../components/ParticleBackground';
import axios from 'axios';
import { getActiveProfile } from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../i18n/LanguageContext';
import * as Device from 'expo-device';

type PreviewScreenParams = {
  photos: Array<{uri: string; base64?: string}>;
  source?: 'camera' | 'imagePicker';
};

type PreviewScreenNavigationProp = NativeStackScreenProps<RootStackParamList, 'Preview'>;

const { width } = Dimensions.get('window');

type Photo = {
  uri: string;
  base64?: string | undefined;
};

interface AnalysisResult {
  title: string;
  text_content: {
    raw_text: string;
    sections: Array<{
      type: 'heading' | 'paragraph' | 'list' | 'quote' | 'definition';
      level?: number;
      content?: string;
      style?: 'bullet' | 'numbered';
      items?: string[];
      term?: string;
      definition?: string;
    }>;
  };
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{ question: string; options: string[]; correct: string }>;
}

interface ProcessingStage {
  icon: React.ReactNode;
  message: string;
  subMessage: string;
}

const AnimatedIcon = Animated.createAnimatedComponent(View);

// Add the helper function
const calculateBase64Size = (base64String: string): number => {
  const base64 = base64String.split('base64,').pop() || base64String;
  return Math.ceil(base64.length * 0.75);
};

export default function PreviewScreen({ route, navigation }: PreviewScreenNavigationProp) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[]>(route.params.photos);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [processingStage, setProcessingStage] = React.useState(0);
  const [processingStartTime, setProcessingStartTime] = React.useState(0);
  const progressWidth = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const [currentStage, setCurrentStage] = useState(0);
  const [processingId, setProcessingId] = useState('');

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const MIN_PROCESSING_TIME = 5000;  // 5 seconds minimum
  const MAX_PROCESSING_TIME = 60000; // 60 seconds maximum
  const STAGES_COUNT = 5;
  const TIME_PER_STAGE = MAX_PROCESSING_TIME / STAGES_COUNT; // 12 seconds per stage

  const processingScreens = [
    {
      title: t('processing.justAMoment'),
      message: t('processing.readingWork'),
      icon: <Search size={20} color={theme.colors.text} />
    },
    {
      title: t('processing.creatingLesson'),
      message: t('processing.organizingContent'),
      icon: <FileText size={20} color={theme.colors.text} />
    },
    {
      title: t('processing.creatingLesson'),
      message: t('processing.formingQuestions'),
      icon: <Brain size={20} color={theme.colors.text} />
    },
    {
      title: t('processing.creatingLesson'),
      message: t('processing.convertingToAudio'),
      icon: <ListChecks size={20} color={theme.colors.text} />
    },
    {
      title: t('processing.almostReady'),
      message: t('processing.finalizingMaterials'),
      icon: <Sparkles size={20} color={theme.colors.text} />
    }
  ];

  const handleAnalyze = async () => {
    const startTime = Date.now();
    try {
      remoteLog('Starting image analysis', { 
        imageCount: photos.length,
        device: Platform.OS + '-' + (Device.modelName || 'unknown')
      });
      
      setIsProcessing(true);
      setProcessingStartTime(Date.now());
      
      // Get active profile first
      const activeProfile = await getActiveProfile();
      if (!activeProfile) {
        remoteLog('No active profile found');
        throw new Error('No active profile found');
      }

      // Add validation for image sizes
      const totalSize = photos.reduce((acc, photo) => {
        if (photo.base64) {
          return acc + calculateBase64Size(photo.base64);
        }
        return acc;
      }, 0) / (1024 * 1024); // Convert to MB

      console.log('[Client] Total image size before compression:', totalSize.toFixed(2) + 'MB');
      remoteLog('Image sizes before compression', { totalSizeMB: totalSize.toFixed(2) });

      // Log that we're about to make API request
      remoteLog('Making API request to analyze images');
      
      const result = await analyzeImages(photos);
      
      // Log successful API response
      remoteLog('API request successful', { 
        resultTitle: result.title,
        contentType: result.contentType,
        responseSize: JSON.stringify(result).length
      });
      
      // Add validation for result
      if (!result || !result.text_content) {
        remoteLog('Invalid response format from server', result);
        throw new Error('Invalid response format from server');
      }

      // Database timing
      remoteLog('Starting database operations');
      console.log('[Timing] Creating study set in database...');
      const dbStartTime = Date.now();
      console.log('[Debug] API result content type:', result.contentType);
      
      // Create content data based on type - using type-safety
      let studySetData: any = {
        title: result.title,
        text_content: result.text_content,
        contentType: result.contentType,
        profile_id: activeProfile.id
      };
      
      // TypeScript discriminated union based on contentType
      if (result.contentType === 'study-set') {
        // It's a study set - TypeScript knows it's a StudySet
        studySetData.flashcards = result.flashcards || [];
        studySetData.quiz = result.quiz || [];
        studySetData.introduction = result.introduction || '';
        studySetData.summary = result.summary || '';
      } else if (result.contentType === 'homework-help') {
        // It's homework help - TypeScript knows it's a HomeworkHelp
        studySetData.homeworkHelp = result.homeworkHelp;
      }
      
      try {
        const studySet = await createStudySet(studySetData);
        const dbEndTime = Date.now();
        
        // Track study set creation in analytics
        Analytics.logEvent(EventType.STUDY_SET_CREATED, { study_set_id: studySet.id });

        // Add post-creation log to verify content type was saved
        console.log('[Debug] Created study set with content type:', studySet.contentType);
        remoteLog('Database operation completed successfully', {
          studySetId: studySet.id,
          dbOperationTime: dbEndTime - dbStartTime
        });
        
        // Final timing summary
        console.log('[Timing] Process completed. Full breakdown:', {
          totalTime: dbEndTime - startTime,
          databaseOperation: dbEndTime - dbStartTime,
        });

        setIsProcessing(false);

        // Fix: Check if ID exists before navigating
        if (studySet.id) {
          remoteLog('Navigating to StudySet screen', { id: studySet.id });
          navigation.navigate('StudySet', { id: studySet.id });
        } else {
          // Handle the case where id is undefined
          console.error('Created study set has no ID');
          remoteLog('Error: Created study set has no ID', studySetData);
          Alert.alert(
            'Error',
            'Failed to create study materials properly. Please try again.'
          );
        }
      } catch (dbError) {
        // Log database errors specifically
        remoteLog('Database error during createStudySet', { 
          error: dbError instanceof Error ? dbError.message : 'Unknown DB error',
          stack: dbError instanceof Error ? dbError.stack : null
        });
        throw dbError; // Rethrow to be caught by outer catch
      }
    } catch (error) {
      setIsProcessing(false);
      
      // Enhanced error logging
      console.error('[Error] Analysis failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      // Remote log the error with as much detail as possible
      remoteLog('Error in handleAnalyze', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof Error ? (error as any).code : undefined,
        name: error instanceof Error ? error.name : typeof error,
        isAxiosError: axios.isAxiosError(error),
        responseStatus: axios.isAxiosError(error) ? error.response?.status : undefined,
        processingTime: Date.now() - startTime
      });

      let errorMessage = t('alerts.processingError');
      let errorTitle = t('alerts.error');

      if (error instanceof Error) {
        if (error.message.includes('too large')) {
          errorMessage = t('alerts.imagesTooLarge');
          errorTitle = t('alerts.sizeError');
        } else if (error.message.includes('No active profile')) {
          errorMessage = t('alerts.noProfile');
          errorTitle = t('alerts.profileError');
        }
      }

      Alert.alert(
        errorTitle,
        errorMessage,
        [{ 
          text: t('alerts.ok'),
          onPress: () => navigation.goBack()
        }]
      );
    }
  };

  const handleDeleteImage = (index: number) => {
    // Create a copy of photos array without the deleted image
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    
    // If no photos left, go back to previous screen
    if (updatedPhotos.length === 0) {
      navigation.goBack();
      return;
    }
    
    // Update the state with new photos array
    setPhotos(updatedPhotos);
    
    // Adjust currentIndex if necessary
    if (currentIndex >= updatedPhotos.length) {
      setCurrentIndex(updatedPhotos.length - 1);
    }
  };

  const renderItem = ({ item, index }: { item: Photo; index: number }) => (
    <View style={[
      styles.previewContainer,
      photos.length === 1 && styles.singlePreviewContainer
    ]}>
      <Image
        source={{ uri: item.uri }}
        style={styles.preview}
        resizeMode="contain"
      />
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteImage(index)}
      >
        <Trash2 color={theme.colors.text} size={16} />
      </TouchableOpacity>
    </View>
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const combineResults = (results: AnalysisResult[]): AnalysisResult | null => {
    if (!results.length) return null;

    return {
      title: results[0].title,
      text_content: {
        raw_text: results.map(r => r.text_content.raw_text).join('\n\n'),
        sections: results.flatMap(r => 
          r.text_content.sections.map(section => ({
            ...section,
            // Ensure type is one of the allowed values
            type: validateSectionType(section.type),
            // Ensure style is one of the allowed values if present
            style: section.style ? validateListStyle(section.style) : undefined
          }))
        )
      },
      flashcards: results.flatMap(r => r.flashcards),
      quiz: results.flatMap(r => r.quiz)
    };
  };

  const validateSectionType = (type: string): 'heading' | 'paragraph' | 'list' | 'quote' | 'definition' => {
    const validTypes = ['heading', 'paragraph', 'list', 'quote', 'definition'] as const;
    if (validTypes.includes(type as any)) {
      return type as 'heading' | 'paragraph' | 'list' | 'quote' | 'definition';
    }
    // Default to paragraph if invalid type is received
    return 'paragraph';
  };

  const validateListStyle = (style: string): 'bullet' | 'numbered' => {
    return style === 'numbered' ? 'numbered' : 'bullet';
  };

  // Add animation effects
  React.useEffect(() => {
    if (isProcessing) {
      // Pulse animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
      
      // Stage transitions every 12 seconds
      const stageInterval = setInterval(() => {
        setProcessingStage(current => 
          current < processingScreens.length - 1 ? current + 1 : current
        );
      }, TIME_PER_STAGE);

      // Progress bar animation set to target time
      progressWidth.value = withTiming(100, { 
        duration: MAX_PROCESSING_TIME,
      });

      return () => {
        clearInterval(stageInterval);
        scale.value = 1;
        progressWidth.value = 0;
        setProcessingStage(0);
      };
    }
  }, [isProcessing]);

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: withTiming(1, { duration: 500 }) // Smooth fade in
    };
  });

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`
    };
  });

  // Add processing status tracking
  useEffect(() => {
    const checkProgress = async () => {
      try {
        if (!processingId) return;
        
        const status = await getProcessingStatus(processingId);
        
        switch (status.stage) {
          case 'transcribing':
            setCurrentStage(0);
            break;
          case 'combining':
            setCurrentStage(1);
            break;
          case 'generating':
            setCurrentStage(2);
            break;
          case 'validating':
            setCurrentStage(3);
            break;
          case 'saving':
            setCurrentStage(4);
            break;
          case 'complete':
            // Handle completion
            break;
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    };

    const interval = setInterval(checkProgress, 2000);
    return () => clearInterval(interval);
  }, [processingId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('preview.title')}
        </Text>
        <Text style={styles.imageCounter}>
          {t('preview.imageCounter').replace('{current}', String(currentIndex + 1)).replace('{total}', String(photos.length))}
        </Text>
      </View>

      <View style={styles.imageContainer}>
        <FlatList
          data={photos}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={width - 40}
          decelerationRate="fast"
        />
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={isProcessing}
        >
          <Text style={styles.analyzeButtonText}>
            {t('preview.readyButton')}
          </Text>
        </TouchableOpacity>

        <View style={styles.addMoreButtonsContainer}>
          <TouchableOpacity
            style={[styles.addButton, styles.scanButton]}
            onPress={() => navigation.navigate('ScanPage', { existingPhotos: photos })}
            disabled={isProcessing}
          >
            <Text style={styles.addButtonText}>{t('preview.takeMore')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, styles.pickButton]}
            onPress={async () => {
              try {
                // Request permissions first (consistent with CreateStudySetBottomSheet)
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (!permissionResult.granted) {
                  Alert.alert(
                    t('alerts.permissionNeeded'),
                    t('alerts.photoLibraryPermission')
                  );
                  return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false,
                  aspect: [4, 3],
                  quality: 0.7,
                  allowsMultipleSelection: true,
                  selectionLimit: 10,
                  base64: true,
                });

                if (!result.canceled && result.assets) {
                  const newPhotos: Photo[] = result.assets.map(asset => ({
                    uri: asset.uri,
                    base64: asset.base64 ?? undefined
                  }));
                  setPhotos([...photos, ...newPhotos]);
                }
              } catch (error) {
                console.error('Error picking image:', error);
                Alert.alert(
                  t('alerts.error'),
                  t('alerts.imageLoadFailed')
                );
              }
            }}
            disabled={isProcessing}
          >
            <Text style={styles.addButtonText}>{t('preview.chooseMore')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.processingModal}>
          <ParticleBackground />
          <AnimatedIcon style={iconAnimatedStyle}>
            {processingScreens[processingStage].icon}
          </AnimatedIcon>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[styles.progressBar, progressAnimatedStyle]} 
            />
          </View>
          <Text style={styles.processingTitle}>
            {processingScreens[processingStage].title}
          </Text>
          <Text style={styles.processingSubtitle}>
            {processingScreens[processingStage].message}
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Update styles to handle the image carousel
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: 'center',
  },
  imageCounter: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.9,
    minWidth: 40,
    textAlign: 'right',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: theme.colors.background02,
    paddingVertical: theme.spacing.md,
  },
  previewContainer: {
    position: 'relative',
    width: width - 64,
    height: '100%',
    marginLeft: 16,
    marginRight: 8,
  },
  singlePreviewContainer: {
    width: width - 32, // Full width minus padding
    marginRight: 16, // Match left margin for symmetry
  },
  preview: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  deleteButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(18, 18, 18, 0.5)',
    padding: theme.spacing.sm,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bottomContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  analyzeButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
  },
  analyzeButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  addMoreButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  addButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background02,
  },
  scanButton: {
    borderWidth: 1,
    borderRadius: 40,
    borderColor: theme.colors.stroke,
  },
  pickButton: {
    borderWidth: 1,
    borderRadius: 40,
    borderColor: theme.colors.stroke,
  },
  addButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
  },
  processingModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: theme.colors.background02,
    borderRadius: 2,
    marginVertical: theme.spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  processingTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  processingSubtitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    opacity: 0.8,
  },
});
