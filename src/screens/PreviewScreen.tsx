import React from 'react';
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
} from 'react-native';
import { analyzeImage } from '../services/api';
import { createStudySet } from '../services/Database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft, Search, Brain, Sparkles } from 'lucide-react-native';
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

type PreviewScreenNavigationProp = NativeStackScreenProps<RootStackParamList, 'Preview'>;

const { width } = Dimensions.get('window');

interface PhotoItem {
  uri: string;
  base64?: string;
}

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

export default function PreviewScreen({ route, navigation }: PreviewScreenNavigationProp) {
  const { photos } = route.params;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [processingStage, setProcessingStage] = React.useState(0);
  const progressWidth = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const stages: ProcessingStage[] = [
    {
      icon: <Search size={24} color={theme.colors.text} />,
      message: "Pieni hetki",
      subMessage: "Lexie opiskelee juuri kuviasi"
    },
    {
      icon: <Brain size={24} color={theme.colors.text} />,
      message: "Kohta on valmista",
      subMessage: "Tehdään sopivia harjoitustehtäviä"
    },
    {
      icon: <Sparkles size={24} color={theme.colors.text} />,
      message: "Vielä viimeinen silaus..",
      subMessage: "Tarkistetaan että kaikki on kunnossa."
    }
  ];

  const handleAnalyze = async () => {
    try {
      setIsProcessing(true);
      console.log('Starting image analysis...');

      // Collect all base64 images
      const base64Images = photos
        .filter(photo => photo.base64)
        .map(photo => photo.base64 as string);

      if (base64Images.length === 0) {
        throw new Error('No valid images to analyze');
      }

      // Send all images for analysis at once
      const result = await analyzeImage(base64Images);
      
      // Create study set with the combined results
      const studySet = await createStudySet({
        title: result.title,
        text_content: result.text_content,
        flashcards: result.flashcards,
        quiz: result.quiz
      });

      setIsProcessing(false);
      navigation.navigate('StudySet', { id: studySet.id });
    } catch (error) {
      setIsProcessing(false);
      console.error('Full error details:', error);
      Alert.alert(
        'Error',
        error instanceof Error 
          ? `Failed to process: ${error.message}`
          : 'Failed to process images. Please try again.'
      );
    }
  };

  const renderItem = ({ item, index }: { item: PhotoItem; index: number }) => (
    <Image
      source={{ uri: item.uri }}
      style={styles.preview}
      resizeMode="cover"
    />
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
      // Pulse animation instead of rotation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
      
      // Progress through stages more slowly
      const stageInterval = setInterval(() => {
        setProcessingStage(current => 
          current < stages.length - 1 ? current + 1 : current
        );
      }, 4500); // Increased from 3000 to 4500

      // Slower progress bar animation
      progressWidth.value = withTiming(100, { 
        duration: 13500 // Increased from 9000 to 13500 (4500 * 3 stages)
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
          Esikatsele
        </Text>
        <Text style={styles.imageCounter}>
          {currentIndex + 1}/{photos.length}
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
            Valmis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanMoreButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.scanMoreText}>Skannaa lisää</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <AnimatedIcon style={[styles.iconContainer, iconAnimatedStyle]}>
              {stages[processingStage].icon}
            </AnimatedIcon>

            <View style={styles.progressBarContainer}>
              <Animated.View 
                style={[styles.progressBar, progressAnimatedStyle]} 
              />
            </View>
            
            <Text style={styles.loadingText}>
              {stages[processingStage].message}
            </Text>
            
            <Text style={styles.loadingSubText}>
              {stages[processingStage].subMessage}
            </Text>
          </View>
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
    paddingTop: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: 'center',
  },
  imageCounter: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.1,
    minWidth: 40,
    textAlign: 'right',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: theme.colors.background02,
    paddingVertical: theme.spacing.md,
  },
  preview: {
    width: width - 64,
    height: '100%',
    borderRadius: 24,
    marginLeft: 16,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  bottomContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  analyzeButton: {
    backgroundColor: theme.colors.primary,
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
  scanMoreButton: {
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.background02,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  scanMoreText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background02,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  loadingSubText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: theme.colors.background02,
    borderRadius: 2,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
});
